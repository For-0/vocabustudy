import type { RawFirestoreField, FirestoreField, SetTerms, FirestoreFieldObject, RawFirestoreFieldObject, StructuredQuery, FieldFilter, AtLeastOne, BatchWriteWrite, FirestoreRestDocument, FirestoreFieldObjectGeneric } from "../types";

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
        else return null;
    },
    createField: (value: FirestoreField): RawFirestoreField => {
        if (Number.isInteger(value)) return { integerValue: value.toString() };
        if (typeof value === "number") return { doubleValue: value.toString() };
        if (typeof value === "boolean") return { booleanValue: value };
        if (typeof value === "string") return { stringValue: value };
        if (value instanceof FSDocument) return { referenceValue: `${Firestore.projectPrefix}/${(value.constructor as typeof FSDocument).collectionKey}/${value.id}` };
        if (value instanceof Array) return { arrayValue: { values: value.map(Firestore.createField) } };
        if (value instanceof Object) return { mapValue: { fields: Firestore.specifyFields(value) } };
        return null;
    },
    specifyFields: (obj: FirestoreFieldObject): RawFirestoreFieldObject => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Firestore.createField(value)])),
    parseMap: (map: { fields: RawFirestoreFieldObject }): FirestoreFieldObject => {
        const result = {};
        for (const key in map.fields) result[key] = Firestore.parseField(map.fields[key]);
        return result;
    },
    getFieldMask: (fields: string[] | null) => fields ? `?${new URLSearchParams(fields.map(field => ["mask.fieldPaths", field])).toString()}` : "",
    getDocument: async function (collection: typeof FSDocument, documentId: string, fieldMask?: string[]) {
        const res = await fetch(`${this.baseUrl}/${collection.collectionKey}/${documentId}${Firestore.getFieldMask(fieldMask)}`);
        const json: FirestoreRestDocument = await res.json();
        return {
            id: documentId,
            ...Firestore.parseMap(json),
            createTime: new Date(Date.parse(json.createTime)),
            updateTime: new Date(Date.parse(json.updateTime))
        };
    },
    getDocuments: async function(structuredQuery: StructuredQuery) {
        const res = await fetch(`${this.baseUrl}:runQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ structuredQuery })
        });
        const json: {document: FirestoreRestDocument, done: boolean}[] = await res.json();
        return json.map((info) => {
            const docObj: BaseFirestoreDocument = {
                id: info.document.name.split("/").pop(),
                ...Firestore.parseMap(info.document),
                createTime: new Date(Date.parse(info.document.createTime)),
                updateTime: new Date(Date.parse(info.document.updateTime)),
            };
            if (info.done) docObj.last = true;
            return docObj
        });
    },
    getDocumentsForIds: async function (collection: string, documentIds: string[], fieldMask?: string[]) {
        const req: { documents: string[], mask?: { fieldPaths: string[] } } = { documents: documentIds.map(id => `${Firestore.projectPrefix}/${collection}/${id}`) };
        if (fieldMask) req.mask = { fieldPaths: fieldMask };
        const res = await fetch(`${Firestore.baseUrl}:batchGet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req)
        });
        const json: {found: FirestoreRestDocument, missing: string}[] = await res.json();
        return json.filter(doc => doc.found).map(({found: doc}) => ({
            id: doc.name.split("/").pop(),
            ...Firestore.parseMap(doc),
            createTime: new Date(Date.parse(doc.createTime)),
            updateTime: new Date(Date.parse(doc.updateTime))
        }));
    },
    createDocument: async function (collection: string, fields: FirestoreFieldObject, idToken: string) {
        const res = await fetch(`${Firestore.baseUrl}/${collection}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({ fields: Firestore.specifyFields(fields) })
        });
        const json: { name: string, createTime: string, updateTime: string } = await res.json();
        return {
            id: json.name.split("/").pop(),
            ...fields,
            createTime: new Date(Date.parse(json.createTime)),
            updateTime: new Date(Date.parse(json.updateTime))
        };
    },
    deleteDocument: async function (collection: string, documentId: string, idToken: string) {
        await fetch(`${Firestore.baseUrl}/${collection}/${documentId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
    },
    updateDocument: async function (collection: string, documentId: string, fields: FirestoreFieldObject, idToken: string) {
        await fetch(`${Firestore.baseUrl}/${collection}/${documentId}?updateMask.fieldPaths=${Object.keys(fields).join(",")}&currentDocument.exists=true`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({ fields: Firestore.specifyFields(fields) })
        });
    },
    commitWrites: async function (writes: BatchWriteWrite[], idToken: string) {
        await fetch(`${this.baseUrl}:commit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({
                writes: writes.map(({collection, document, update}) => ({
                    update: {
                        name: `${this.projectPrefix}/${collection}/${document}`,
                        fields: Firestore.specifyFields(update)
                    },
                    updateMask: { fieldPaths: Object.keys(update) }
                }))
            })
        });
    }
};

if (location.hostname === "localhost")
    Firestore.dbServer = "http://localhost:8080/v1/";

export abstract class BaseFirestoreDocument {
    id: string;
    createTime: Date;
    updateTime: Date;
    last?: boolean;
}

export class FSDocument extends BaseFirestoreDocument {
    static collectionKey: string;
    constructor({id, createTime, updateTime, last}: FSDocument) {
        super();
        this.id = id;
        this.createTime = createTime;
        this.updateTime = updateTime;
        if (last) this.last = true;
    }
    static async get<T extends typeof FSDocument>(this: T, id: string): Promise<InstanceType<T>> {
        return new this(await Firestore.getDocument(this, id)) as InstanceType<T>;
    }
    static async getDocuments<T extends typeof FSDocument>(this: T, structuredQuery: StructuredQuery): Promise<InstanceType<T>[]> {
        if (!structuredQuery.from) structuredQuery.from = structuredQuery.from = [{ collectionId: this.collectionKey }];
        return (await Firestore.getDocuments(structuredQuery)).map(doc => new this(doc)) as InstanceType<T>[];
    }
    static async getDocumentsForIds<T extends typeof FSDocument>(this: T, documentIds: string[]): Promise<InstanceType<T>[]>{
        return (await Firestore.getDocumentsForIds(this.collectionKey, documentIds)).map(doc => new this(doc)) as InstanceType<T>[];
    }
    static async create<T extends typeof FSDocument>(this: T, fields: FirestoreFieldObjectGeneric<InstanceType<T>>, idToken: string): Promise<InstanceType<T>> {
        return new this(await Firestore.createDocument(this.collectionKey, fields, idToken)) as InstanceType<T>;
    }
    static async delete(documentId: string, idToken: string) {
        await Firestore.deleteDocument(this.collectionKey, documentId, idToken);
    }
    static async update(documentId: string, fields: FirestoreFieldObject, idToken: string) {
        await Firestore.updateDocument(this.collectionKey, documentId, fields, idToken);
    }
}

export class VocabSet extends FSDocument {
    static collectionKey = "sets";
    name: string;
    description: string;
    creator: string;
    uid: string;
    visibility: number | string[];
    collections: string[];
    terms: SetTerms;
    likes: number;
    numTerms: number;
    constructor({ name, description, creator, uid, visibility, collections, terms, numTerms, likes, id, createTime, updateTime, last }: VocabSet) {
        super({ id, createTime, updateTime, last });
        this.name = name;
        this.description = description;
        this.creator = creator;
        this.uid = uid;
        this.visibility = visibility;
        this.collections = collections;
        this.terms = terms;
        this.likes = likes;
        this.numTerms = numTerms;
    }
}

export class CustomCollection extends FSDocument {
    static collectionKey = "collections";
    name: string;
    sets: string[];
    uid: string;
    constructor({ name, sets, uid, id, createTime, updateTime, last }: CustomCollection) {
        super({ id, createTime, updateTime, last });
        this.name = name;
        this.sets = sets;
        this.uid = uid;
    }
}

export class Social extends BaseFirestoreDocument {
    static collectionKey = "social";
    name: string;
    uid: string;
    like?: boolean;
    comment?: string;
    leaderboard?: number;
    constructor({ name, uid, like, comment, leaderboard, id, createTime, updateTime, last }: Social) {
        super();
        this.name = name;
        this.uid = uid;
        this.like = like;
        this.comment = comment;
        this.leaderboard = leaderboard;
        this.id = id;
        this.createTime = createTime;
        this.updateTime = updateTime;
        if (last) this.last = true;
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
    startAt(offsets: (number | FSDocument)[], before = false) {
        this.query.startAt = {
            values: offsets.map(el => Firestore.createField(el)),
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
    update<T extends FSDocument>(doc: T, fields: AtLeastOne<{ [K in keyof T]: FirestoreField }>) {
        this.writes.push({
            collection: (doc.constructor as typeof FSDocument).collectionKey,
            document: doc.id,
            update: fields,
        });
        return this;
    }
    commit(idToken: string) {
        return Firestore.commitWrites(this.writes, idToken);
    }
}