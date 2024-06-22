import type { DBSchema } from "idb";
import type { FSDocument, VocabSet, FirestoreDate } from "./firebase-rest-api/firestore";

export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

export type OnlyProperties<T> = Pick<T, 
    // eslint-disable-next-line @typescript-eslint/ban-types
    { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
>;

/* eslint-disable @typescript-eslint/consistent-type-definitions */ // we use type aliases to define an explicit shape

/** A standard term/definition pair. Timelines also fall into this category */
export type TermDefinition = { term: string, definition: string } 

/** A study guide reading */
export type StudyGuideReading = { body: string, type: 0, title: string }

/** A study guide quiz */
export type StudyGuideQuiz = { questions: {type: 0|1, question: string, answers: string[], correct?: number[]}[], type: 1, title: string }

export type PartialVocabSet<T extends SetTerms = SetTerms> = Pick<VocabSet<T>, "name" | "collections" | "terms" | "visibility" | "description" | "uid" | "pathParts">;
export type TermDefinitionSet = PartialVocabSet<TermDefinition[]>;
export type StudyGuide = PartialVocabSet<(StudyGuideQuiz|StudyGuideReading)[]>;
export type ViewerExtraSetProperties = Pick<VocabSet, "creationTime" | "updateTime" | "likes" | "comments"> & { accents: string[] };
export type ViewerPartialSet = (TermDefinitionSet | StudyGuide) & ViewerExtraSetProperties;

/* eslint-enable @typescript-eslint/consistent-type-definitions */

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

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */ // if we make this a Record type, typescript detects the circular reference and complains
export interface RawFirestoreFieldObject { [key: string]: RawFirestoreField }
export interface FirestoreFieldObject { [key: string]: FirestoreField }
/* eslint-enable @typescript-eslint/consistent-indexed-object-style */

export type FirestoreField = null | number | boolean | string | FirestoreDate | FSDocument | FirestoreField[] | FirestoreFieldObject;


export interface FieldFilter {
    fieldFilter: {
        field: { fieldPath: string };
        op: "EQUAL" | "GREATER_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN" | "LESS_THAN_OR_EQUAL" | "ARRAY_CONTAINS" | "IN" | "ARRAY_CONTAINS_ANY";
        value: RawFirestoreField;
    }
}

interface FieldReference { fieldPath: string }

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


export type FieldTransform = { fieldPath: string; } & (
    { setToServerValue: "REQUEST_TIME"; } |
    { [key in "appendMissingElements" | "removeAllFromArray"]: NonNullable<RawFirestoreField["arrayValue"]>; }
);

export interface BatchWriteWrite { pathParts: string[], update: Record<string, FirestoreField>, updateTransforms: FieldTransform[] }

export interface FirestoreRestError {
    error?: { 
        code: number;
        message: string;
        status: string;
    };
}

export type FirestoreRestDocument = {
    name: string;
    fields: RawFirestoreFieldObject;
    createTime: string;
    updateTime: string;
} & FirestoreRestError;

export interface ParsedRestDocument {
    pathParts: string[],
    createTime: Date,
    updateTime: Date,
    last?: boolean
}

export interface User {
    created: Date,
    displayName: string,
    email: string,
    emailVerified: boolean,
    lastLogin: Date,
    photoUrl: string,
    token: { refresh: string, access: string, expirationTime: number },
    uid: string,
    customAttributes: Record<string, unknown>,
    providers: ("password" | "google.com")[]
}

export type UserProfile = Pick<User, "displayName" | "photoUrl" | "uid"> & { roles: string[] };

export interface AutosaveBackup {
    setId: string;
    set: Pick<VocabSet, "name" | "nameWords" | "collections" | "numTerms" | "terms" | "visibility" | "description">;
    timestamp: Date;
}

export interface VocabustudyDB extends DBSchema {
    "autosave-backups": {
        key: string;
        value: AutosaveBackup;
    }
    general: {
        key: "current-user";
        value: User | null;
    }
    "offline-sets": {
        key: string;
        value: ViewerPartialSet;
    }
    "recently-studied": {
        key: string;
        value: {
            url: string;
            name: string;
            studiedOn: Date;
        };
        indexes: { "by-oldest": Date };
    }
}