import type { RawFirestoreField, FirestoreField, SetTerms, FirestoreFieldObject, RawFirestoreFieldObject, StructuredQuery, FieldFilter, FieldTransform, BatchWriteWrite, FirestoreRestDocument, ParsedRestDocument, FirestoreRestError } from "../types";

function getRequestHeaders(idToken?: string) {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    if (idToken) headers.append("Authorization", `Bearer ${idToken}`);
    return headers;
}

function throwResponseError(error?: { status: string }) {
    if (error)
        throw new Error(error.status);
}

export const Firestore = {
    dbServer: "https://firestore.googleapis.com/v1/",
    projectPrefix: "projects/vocab-u-study/databases/(default)/documents",
    get baseUrl() {
        return this.dbServer + this.projectPrefix;
    },
    parseField: (field: RawFirestoreField): FirestoreField => {
        if (field.integerValue) return parseInt(field.integerValue);
        else if (field.doubleValue) return parseFloat(field.doubleValue);
        else if (field.booleanValue) return field.booleanValue;
        else if (field.stringValue) return field.stringValue;
        else if (field.referenceValue) return field.referenceValue;
        else if (field.mapValue) return Firestore.parseMap(field.mapValue);
        else if (field.arrayValue?.values) return field.arrayValue.values.map(Firestore.parseField);
        else if (field.arrayValue) return [];
        else if (field.nullValue) return null;
        else if (field.timestampValue) return new Date(Date.parse(field.timestampValue));
        else return null;
    },
    createField: (value: FirestoreField): RawFirestoreField => {
        if (Number.isInteger(value)) return { integerValue: value.toString() };
        if (typeof value === "number") return { doubleValue: value.toString() };
        if (typeof value === "boolean") return { booleanValue: value };
        if (typeof value === "string") return { stringValue: value };
        if (value instanceof FSDocument) return { referenceValue: value.pathParts.join("/") };
        if (value instanceof Array) return { arrayValue: { values: value.map(Firestore.createField) } };
        if (value instanceof Date) return { timestampValue: value.toISOString() };
        if (value instanceof Object) return { mapValue: { fields: Firestore.specifyFields(value) } };
        if (value === null) return { nullValue: null };
        return null;
    },
    specifyFields: (obj: FirestoreFieldObject): RawFirestoreFieldObject => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Firestore.createField(value)])),
    parseMap: (map: { fields: RawFirestoreFieldObject }): FirestoreFieldObject => {
        const result = {};
        for (const key in map.fields) result[key] = Firestore.parseField(map.fields[key]);
        return result;
    },
    getFieldMask: (fields: string[] | null) => fields ? `?${new URLSearchParams(fields.map(field => [`mask.fieldPaths`, field])).toString()}` : "",
    getDocument: async function (collection: string, documentId: string, fieldMask?: string[], idToken?: string): Promise<ParsedRestDocument> {
        const res = await fetch(`${this.baseUrl}/${collection}/${documentId}${Firestore.getFieldMask(fieldMask)}`, {
            headers: getRequestHeaders(idToken)
        });
        const json: FirestoreRestDocument = await res.json();
        if (json.error?.code === 404) return null;
        throwResponseError(json.error);
        return {
            pathParts: json.name.split("/"),
            ...Firestore.parseMap(json),
            createTime: new Date(Date.parse(json.createTime)),
            updateTime: new Date(Date.parse(json.updateTime))
        };
    },
    getDocuments: async function(structuredQuery: StructuredQuery, idToken?: string, parentDocument = ""): Promise<ParsedRestDocument[]> {
        const res = await fetch(`${this.baseUrl}${parentDocument}:runQuery`, {
            method: "POST",
            headers: getRequestHeaders(idToken),
            body: JSON.stringify({ structuredQuery })
        });
        const json: ({document: FirestoreRestDocument, done: boolean } & FirestoreRestError)[] = await res.json();
        if ("error" in json[0] && json[0].error) throwResponseError(json[0].error);
        if (json.length === 1 && !json[0].document) return [];
        return json.map((info) => {
            const docObj: ParsedRestDocument = {
                pathParts: info.document.name.split("/"),
                ...Firestore.parseMap(info.document),
                createTime: new Date(Date.parse(info.document.createTime)),
                updateTime: new Date(Date.parse(info.document.updateTime)),
            };
            if (info.done) docObj.last = true;
            return docObj
        });
    },
    getDocumentsForIds: async function (collection: string, documentIds: string[], fieldMask?: string[], idToken?: string) {
        const req: { documents: string[], mask?: { fieldPaths: string[] } } = { documents: documentIds.map(id => `${Firestore.projectPrefix}/${collection}/${id}`) };
        if (fieldMask) req.mask = { fieldPaths: fieldMask };
        const res = await fetch(`${Firestore.baseUrl}:batchGet`, {
            method: "POST",
            headers: getRequestHeaders(idToken),
            body: JSON.stringify(req)
        });
        const json: {found: FirestoreRestDocument, missing: string}[] & FirestoreRestError = await res.json();
        if ("error" in json && json.error) throwResponseError(json.error);
        return json.filter(doc => doc.found).map(({found: doc}): ParsedRestDocument => ({
            pathParts: doc.name.split("/"),
            ...Firestore.parseMap(doc),
            createTime: new Date(Date.parse(doc.createTime)),
            updateTime: new Date(Date.parse(doc.updateTime))
        }));
    },
    createDocument: async function (collection: string, fields: FirestoreFieldObject, idToken: string): Promise<ParsedRestDocument> {
        const res = await fetch(`${Firestore.baseUrl}/${collection}`, {
            method: "POST",
            headers: getRequestHeaders(idToken),
            body: JSON.stringify({ fields: Firestore.specifyFields(fields) })
        });
        const json: FirestoreRestDocument = await res.json();
        throwResponseError(json.error);
        return {
            pathParts: json.name.split("/"),
            ...fields,
            createTime: new Date(Date.parse(json.createTime)),
            updateTime: new Date(Date.parse(json.updateTime))
        };
    },
    deleteDocument: async function (collection: string, documentId: string, idToken: string) {
        await fetch(`${Firestore.baseUrl}/${collection}/${documentId}`, {
            method: "DELETE",
            headers: getRequestHeaders(idToken)
        });
    },
    updateDocument: async function (collection: string, documentId: string, fields: FirestoreFieldObject, idToken: string, merge = false, requireExistence = null) {
        const endpointUrl = new URL(`${Firestore.baseUrl}/${collection}/${documentId}`);
        if (requireExistence !== null) endpointUrl.searchParams.append("currentDocument.exists", requireExistence.toString());
        if (merge) Object.keys(fields).forEach(field => endpointUrl.searchParams.append("updateMask.fieldPaths", field));
        await fetch(endpointUrl, {
            method: "PATCH",
            headers: getRequestHeaders(idToken),
            body: JSON.stringify({ fields: Firestore.specifyFields(fields) })
        });
    },
    commitWrites: async function (writes: BatchWriteWrite[], idToken: string) {
        await fetch(`${this.baseUrl}:commit`, {
            method: "POST",
            headers: getRequestHeaders(idToken),
            body: JSON.stringify({
                writes: writes.map(({pathParts, update, updateTransforms}) => ({
                    update: {
                        name: `${this.projectPrefix}/${pathParts.join("/")}`,
                        fields: Firestore.specifyFields(update)
                    },
                    updateMask: { fieldPaths: Object.keys(update) },
                    updateTransforms
                }))
            })
        });
    }
};

if (location.hostname === "localhost")
    Firestore.dbServer = "http://localhost:8080/v1/";

export abstract class BaseFirestoreDocument {
    get id(): string {
        return this.pathParts[this.pathParts.length - 1];
    }
    createTime: Date;
    updateTime: Date;
    last?: boolean;
    pathParts: string[];
}

export class FSDocument extends BaseFirestoreDocument {
    static collectionKey: string;
    constructor({ pathParts, createTime, updateTime, last }: { pathParts: string[], createTime: Date, updateTime: Date, last?: boolean }) {
        super();
        this.pathParts = pathParts;
        this.createTime = createTime;
        this.updateTime = updateTime;
        if (last) this.last = true;
    }
    static fromSingle<T extends typeof FSDocument>(this: T, doc: ParsedRestDocument) {
        return doc ? new this(doc) as InstanceType<T> : null;
    }
    static fromMultiple<T extends typeof FSDocument>(this: T, docs: ParsedRestDocument[]) {
        return docs.map(doc => new this(doc)) as InstanceType<T>[];
    }
}

export class VocabSet<T extends SetTerms = SetTerms> extends FSDocument {
    static collectionKey = "sets";
    name: string;
    description?: string;
    creator: string;
    uid: string;
    visibility: number | string[];
    collections: string[];
    terms: T;
    likes: number;
    numTerms: number;
    nameWords: string[];
    constructor({ name, description, creator, uid, visibility, collections, terms, numTerms, likes, pathParts, nameWords, createTime, updateTime, last }: VocabSet & { terms: T }) {
        super({ pathParts, createTime, updateTime, last });
        this.name = name;
        if (description) this.description = description;
        this.creator = creator;
        this.uid = uid;
        this.visibility = visibility;
        this.collections = collections;
        this.terms = terms;
        this.likes = likes;
        this.numTerms = numTerms;
        this.nameWords = nameWords;
    }
}

export class CustomCollection extends FSDocument {
    static collectionKey = "collections";
    name: string;
    sets: string[];
    uid: string;
    constructor({ name, sets, uid, createTime, updateTime, last, pathParts }: CustomCollection) {
        super({ pathParts, createTime, updateTime, last });
        this.name = name;
        this.sets = sets;
        this.uid = uid;
    }
}

export class Social extends FSDocument {
    static collectionKey = "social";
    name: string;
    uid: string;
    like?: boolean;
    comment?: string;
    leaderboard?: number;
    constructor({ name, uid, like, comment, leaderboard, pathParts, createTime, updateTime, last }: Social) {
        super({ pathParts, createTime, updateTime, last });
        this.name = name;
        this.uid = uid;
        this.like = like;
        this.comment = comment;
        this.leaderboard = leaderboard;
    }
}

export class QueryBuilder {
    query: StructuredQuery;
    constructor(initialQuery: StructuredQuery = {}) {
        this.query = initialQuery;
    }
    select(...fields: string[]) {
        this.query.select = { fields: fields.map(field => ({ fieldPath: field })) };
        return this;
    }
    from(collection: string, allDescendants?: boolean) {
        this.query.from = [{ collectionId: collection }];
        if (allDescendants) this.query.from[0].allDescendants = true;
        return this;
    }
    where(field: string, op: FieldFilter["fieldFilter"]["op"], value: FirestoreField) {
        const fieldFilter: FieldFilter = { fieldFilter: { field: { fieldPath: field }, op, value: Firestore.createField(value) } };
        if (!this.query.where) this.query.where = fieldFilter;
        else if ("fieldFilter" in this.query.where) this.query.where = { compositeFilter: { op: "AND", filters: [this.query.where, fieldFilter] } };
        else this.query.where.compositeFilter.filters.push(fieldFilter);
        return this;
    }
    orderBy(fields: string[], direction: StructuredQuery["orderBy"][0]["direction"]) {
        if (!this.query.orderBy) this.query.orderBy = [];
        this.query.orderBy.push(...fields.map(field => ({ field: { fieldPath: field }, direction })));
        return this;
    }

    limit(limit: number) {
        this.query.limit = limit;
        return this;
    }
    setOffset(offset: number) {
        this.query.offset = offset;
        return this;
    }
    /**
     * @param offsets A number to start after the nth document, or a string to start after a document with that path
     */
    startAt(offsets: (number | string)[], before = false) {
        this.query.startAt = {
            values: offsets.map(el => typeof el === "number" ? Firestore.createField(el) : { referenceValue: el }),
            before
        };
        return this;
    }
    build() {
        return this.query;
    }
}

export class BatchWriter {
    writes: BatchWriteWrite[];
    constructor() {
        this.writes = [];
    }
    update<T extends FSDocument>(pathParts: string[], fields: Partial<{ [K in keyof T]: FirestoreField }>, fieldTransforms: FieldTransform[] = []) {
        this.writes.push({
            pathParts,
            update: fields,
            updateTransforms: fieldTransforms
        });
        return this;
    }
    commit(idToken: string) {
        return Firestore.commitWrites(this.writes, idToken);
    }
}