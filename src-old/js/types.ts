import type { FSDocument } from "./firebase-rest-api/firestore";

export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

export type OnlyProperties<T> = Pick<T, 
    // eslint-disable-next-line @typescript-eslint/ban-types
    { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
>;

/** A standard term/definition pair. Timelines also fall into this category */
export type TermDefinition = { term: string, definition: string }; 

/** A study guide reading */
export type StudyGuideReading = { body: string, type: 0, title: string };

/** A study guide quiz */
export type StudyGuideQuiz = { questions: {type: 0|1, question: string, answers: string[]}[], type: 1, title: string };

/** The document `terms` field */
export type SetTerms = TermDefinition[]|(StudyGuideQuiz|StudyGuideReading)[];

export type StudyGuideQuizQuestion = StudyGuideQuiz["questions"][0];

/** This is a Partial of T intersected with a union of all possible subsets of T */
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export type RawFirestoreField = AtLeastOne<{
    integerValue: string;
    doubleValue: string;
    booleanValue: boolean;
    stringValue: string;
    referenceValue: string;
    mapValue: { fields: RawFirestoreFieldObject; };
    arrayValue: { values: RawFirestoreField[]; };
    nullValue: null;
    timestampValue: string;
}>;

export type RawFirestoreFieldObject = { [key: string]: RawFirestoreField };

export type FirestoreField = null | number | boolean | string | Date | FSDocument | FirestoreField[] | FirestoreFieldObject;

export type FirestoreFieldObject = { [key: string]: FirestoreField };


export type FieldFilter = {
    fieldFilter: {
        field: { fieldPath: string };
        op: "EQUAL" | "GREATER_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN" | "LESS_THAN_OR_EQUAL" | "ARRAY_CONTAINS" | "IN" | "ARRAY_CONTAINS_ANY";
        value: RawFirestoreField;
    }
};

type FieldReference = { fieldPath: string };

export type StructuredQuery = Partial<{
    select: { fields: FieldReference[] };
    from: { collectionId: string, allDescendants?: boolean }[];
    where: FieldFilter | { compositeFilter: { op: "AND", filters: FieldFilter[] } };
    orderBy: {
        field: FieldReference;
        direction: "ASCENDING" | "DESCENDING";
    }[];
    limit: number;
    offset: number;
    startAt: {
        values: RawFirestoreField[];
        before: boolean;
    };
    endAt: {
        values: RawFirestoreField[];
        before: boolean;
    };
}>;

export type BatchWriteWrite = { pathParts: string[], update: { [key: string]: FirestoreField }, updateTransforms: FieldTransform[] };

export type FirestoreRestError = {
    error?: { 
        code: number;
        message: string;
        status: string;
    };
};

export type FirestoreRestDocument = {
    name: string;
    fields: RawFirestoreFieldObject;
    createTime: string;
    updateTime: string;
} & FirestoreRestError;

export type ParsedRestDocument = {
    pathParts: string[],
    createTime: Date,
    updateTime: Date,
    last?: boolean
};

export type RemoteConfigAnnouncement = {
    id: string,
    message: string,
    title: string,
    type: "info" | "warning" | "danger" | "primary" | "success" | "secondary" | "light" | "dark"
};

export type CollectionJsonList = { c: (string | { n: string; s: string[]; o?: undefined; } | { n: string; s: string[]; o: string[]; })[] };

export interface User {
    created: Date,
    displayName: string,
    email: string,
    emailVerified: boolean,
    lastLogin: Date,
    photoUrl: string,
    token: { refresh: string, access: string, expirationTime: number },
    uid: string,
    customAttributes: { [key: string]: unknown },
    providers: ("password" | "google.com")[]
}

export type FieldTransform = {
    fieldPath: string;
    setToServerValue: "REQUEST_TIME";
};