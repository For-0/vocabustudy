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
export type StudyGuideReading = {body: string, type: 0};

/** A study guide quiz */
export type StudyGuideQuiz = {questions: {type: number, question: string, answers: string[]}, type: 1};

/** The document `terms` field */
export type SetTerms = TermDefinition[]|(StudyGuideQuiz|StudyGuideReading)[];

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
}>;

export type RawFirestoreFieldObject = { [key: string]: RawFirestoreField };

export type FirestoreField = number | boolean | string | FSDocument | FirestoreField[] | FirestoreFieldObject;

export type FirestoreFieldObject = { [key: string]: FirestoreField };
export type FirestoreFieldObjectGeneric<T> = { [K in keyof OnlyProperties<T>]: FirestoreField };

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

export type BatchWriteWrite = { collection: string, document: string, update: { [key: string]: FirestoreField } };

export type FirestoreRestDocument = {
    name: string;
    fields: RawFirestoreFieldObject;
    createTime: string;
    updateTime: string;
};