// disabled because this file is WIP
/* eslint-disable no-unused-vars */

/**
 * A standard term/definition pair. Timelines also fall into this category
 * @typedef {{term: string, definition: string}} TermDefinition
 */

/**
 * A study guide reading
 * @typedef {{body: string, type: 0}} StudyGuideReading
 */

/**
 * A study guide quiz
 * @typedef {{questions: {type: Number, question: String, answers: String[]}, type: 1}} StudyGuideQuiz
 */

/**
 * The document `terms` field
 * @typedef {TermDefinition[]|(StudyGuideQuiz|StudyGuideReading)[]} SetTerms
 */

export const firestore = {
    dbServer: "https://firestore.googleapis.com/v1/",
    projectPrefix: "projects/vocab-u-study/databases/(default)/documents",
    get baseUrl() {
        return this.dbServer + this.projectPrefix;
    },
    parseField: field => {
        if (field.integerValue) return parseInt(field.integerValue);
        if (field.doubleValue) return parseFloat(field.doubleValue);
        if (field.booleanValue) return field.booleanValue;
        if (field.stringValue) return field.stringValue;
        if (field.mapValue) return firestore.parseMap(field.mapValue);
        if (field.arrayValue?.values) return field.arrayValue.values.map(firestore.parseField);
        if (field.arrayValue) return [];
        return null;
    },
    createField: value => {
        if (Number.isInteger(value)) return { integerValue: value.toString() };
        if (typeof value === "number") return { doubleValue: value.toString() };
        if (typeof value === "boolean") return { booleanValue: value };
        if (typeof value === "string") return { stringValue: value };
        if (value instanceof FSDocument) return { referenceValue: `${firestore.projectPrefix}/${value.constructor.collectionKey}/${value.id}` };
        if (value instanceof Array) return { arrayValue: { values: value.map(firestore.createField) } };
        if (value instanceof Object) return { mapValue: { fields: firestore.specifyFields(value) } };
        return null;
    },
    specifyFields: obj => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, firestore.createField(value)])),
    parseMap: map => {
        const result = {};
        for (const key in map.fields) result[key] = firestore.parseField(map.fields[key]);
        return result;
    },
    getDocument: async function (collection, documentId) {
        let res = await fetch(`${this.baseUrl}/${collection.collectionKey}/${documentId}`);
        let json = await res.json();
        return {
            id: documentId,
            ...firestore.parseMap(json),
            createTime: new Date(Date.parse(json.createTime)),
            updateTime: new Date(Date.parse(json.updateTime))
        };
    },
    getDocuments: async function (collection, structuredQuery) {
        structuredQuery.from = [{ collectionId: collection.collectionKey }];
        let res = await fetch(`${this.baseUrl}:runQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ structuredQuery })
        });
        let json = await res.json();
        return json.map(info => {
            let docObj = {
                id: info.document.name.split("/").pop(),
                ...firestore.parseMap(info.document),
                createTime: new Date(Date.parse(info.document.createTime)),
                updateTime: new Date(Date.parse(info.document.updateTime))
            };
            if (info.done) docObj.last = true;
            return docObj
        });
    },
    getDocumentsForIds: async function (collection, documentIds) {
        let res = await fetch(`${this.baseUrl}:batchGet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documents: documentIds.map(id => `${this.projectPrefix}/${collection.collectionKey}/${id}`) })
        });
        let json = await res.json();
        return json.filter(doc => doc.found).map(({found: doc}) => ({
            id: doc.name.split("/").pop(),
            ...firestore.parseMap(doc),
            createTime: new Date(Date.parse(doc.createTime)),
            updateTime: new Date(Date.parse(doc.updateTime))
        }));
    },
    createDocument: async function (collection, fields, idToken) {
        let res = await fetch(`${this.baseUrl}/${collection.collectionKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({ fields: this.specifyFields(fields) })
        });
        let json = await res.json();
        return {
            id: json.name.split("/").pop(),
            ...fields,
            createTime: new Date(Date.parse(json.createTime)),
            updateTime: new Date(Date.parse(json.updateTime))
        };
    },
    deleteDocument: async function (collection, documentId, idToken) {
        await fetch(`${this.baseUrl}/${collection.collectionKey}/${documentId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
    },
    updateDocument: async function (collection, documentId, fields, idToken) {
        await fetch(`${this.baseUrl}/${collection.collectionKey}/${documentId}?updateMask.fieldPaths=${Object.keys(fields).join(",")}&currentDocument.exists=true`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({ fields: this.specifyFields(fields) })
        });
    },
    /**
     * @template {FSDocument} T
     * @param {{document: T, fields: T}[]} writes
     */
    commitWrites: async function (writes, idToken) {
        await fetch(`${this.baseUrl}:commit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({
                writes: writes.map(({document, fields}) => ({
                    update: {
                        name: `${this.projectPrefix}/${document.constructor.collectionKey}/${document.id}`,
                        fields: this.specifyFields(fields)
                    },
                    updateMask: { fieldPaths: Object.keys(fields) }
                }))
            })
        });
    }
};

if (location.hostname === "localhost")
    firestore.dbServer = "http://localhost:8080/v1/";

function getIdToken() {
    return JSON.parse(localStorage.getItem("firebase:authUser:AIzaSyCsDuM2jx3ZqccS8MS5aumkOKaV2LiVwZk:[DEFAULT]")).stsTokenManager.accessToken;
}

class FSDocument {
    constructor({id, createTime, updateTime, last}) {
        /** @type {String} */
        this.id = id;
        /** @type {Date} */
        this.createTime = createTime;
        /** @type {Date} */
        this.updateTime = updateTime;
        /** @type {Boolean} */
        if (last) this.last = true;
    }
    static async get(id) {
        return new this(await firestore.getDocument(this, id));
    }
    /**
     * @returns {Promise<this[]>}
     */
    static async getDocuments(structuredQuery) {
        return (await firestore.getDocuments(this, structuredQuery)).map(doc => new this(doc));
    }
    /**
     * @returns {Promise<this[]>}
     */
    static async getDocumentsForIds(documentIds) {
        return (await firestore.getDocumentsForIds(this, documentIds)).map(doc => new this(doc));
    }
    /**
     * @param {this} fields
     * @returns {Promise<this>}
     */
    static async create(fields) {
        return new this(await firestore.createDocument(this, fields, getIdToken()));
    }
    static async delete(documentId) {
        await firestore.deleteDocument(this, documentId, getIdToken());
    }
    static async update(documentId, fields) {
        await firestore.updateDocument(this, documentId, fields, getIdToken());
    }
}

export class VocabSet extends FSDocument {
    static collectionKey = "sets";
    constructor(data) {
        super(data)
        /** @type {String} */
        this.name = data.name;
        /** @type {String} */
        this.description = data.description;
        /** @type {String} */
        this.creator = data.creator;
        /** @type {String} */
        this.uid = data.uid;
        /** @type {Number|string[]} */
        this.visibility = data.visibility;
        /** @type {String[]} */
        this.collections = data.collections;
        /** @type {SetTerms} */
        this.terms = data.terms;
    }
}

class CustomCollection extends FSDocument {
    static collectionKey = "collections";
    constructor(data) {
        super(data);
        /** @type {String} */
        this.name = data.name;
        /** @type {String[]} */
        this.sets = data.sets;
        /** @type {String} */
        this.uid = data.uid;
    }
}

class QueryBuilder {
    constructor() {
        this.query = {};
    }
    /**
     * @param {String} field
     * @param {"LESS_THAN"|"LESS_THAN_OR_EQUAL"|"GREATER_THAN"|"GREATER_THAN_OR_EQUAL"|"EQUAL"|"NOT_EQUAL"|"ARRAY_CONTAINS"|"IN"|"ARRAY_CONTAINS_ANY"|"NOT_IN"} op
     * @param {any} value
     * @returns {this}
     */
    where(field, op, value) {
        let fieldFilter = { fieldFilter: { field: { fieldPath: field }, op, value: firestore.createField(value) } };
        if (!this.query.where) this.query.where = fieldFilter;
        else if (this.query.where.fieldFilter) this.query.where = { compositeFilter: { op: "AND", filters: [this.query.where, fieldFilter] } };
        else this.query.where.compositeFilter.filters.push(fieldFilter);
        return this;
    }
    /**
     * @param {string} field
     * @param {"ASCENDING"|"DESCENDING"} direction
     * @returns {this}
     */
    orderBy(field, direction) {
        if (!this.query.orderBy) this.query.orderBy = [];
        this.query.orderBy.push({ field: { fieldPath: field }, direction });
        return this;
    }
    /**
     * @param {Number} limit
     * @returns {this}
     */
    limit(limit) {
        this.query.limit = limit;
        return this;
    }
    /**
     * @param {Number} limit
     * @returns {this}
     */
    setOffset(offset) {
        this.query.offset = offset;
        return this;
    }
    /**
     * @param {(Number|FSDocument)[]} offsets
     * @param {Boolean} before
     * @returns {this}
     */
    startAt(offsets, before) {
        this.query.startAt = {
            values: offsets.map(el => firestore.createField(el)),
            before
        };
        return this;
    }
    build() {
        return this.query;
    }
}

class WriteTransaction {
    constructor() {
        this.writes = [];
    }
    /**
     * @template {extends FSDocument} T
     * @param {T} doc
     * @param {T} fields
     * @returns {this}
     */
    update(doc, fields) {
        this.writes.push({
            collection: doc.constructor.collectionKey,
            document: doc.id,
            update: fields,
        });
        return this;
    }
    commit() {
        return firestore.commit(this.writes, getIdToken());
    }
}