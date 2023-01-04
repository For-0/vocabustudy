import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { readFileSync } from "fs";

export const PROJECT_ID = "vocabustudy-testing";
export const SECURITY_RULES = readFileSync("firestore.rules", "utf8");

export async function initEnvironment() {
    let testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: SECURITY_RULES, host: "127.0.0.1", port: 8080 } });
    return testEnv;
}
/**
 * @param {import("firebase/firestore").Firestore} firestore The firestore instance
 * @param {string} collectionPath The collection path
 * @param {string} id The document ID
 * @param {Object} data The data to go in the document
 */
export async function setTestDoc(firestore, collectionPath, id, data) {
    await setDoc(doc(firestore, collectionPath, id), data, { merge: true });
}

/**
 * @param {import("firebase/firestore").Firestore} firestore The firestore instance
 * @param {string} collectionPath The collection path
 * @param {string} id The document ID
 */
export async function getTestDoc(firestore, collectionPath, id) {
    await getDoc(doc(firestore, collectionPath, id));
}

/**
 * @param {import("@firebase/rules-unit-testing").RulesTestEnvironment} testEnv 
 * @param {string} uid 
 * @param {string} name 
 */
export function getUserFirestore(testEnv, uid, name, email=undefined) {
    return testEnv.authenticatedContext(uid, { name, email_verified: true, email }).firestore();
}