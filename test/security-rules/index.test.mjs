import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, after, beforeEach, it, before } from "mocha";
import { initEnvironment, setTestDoc, getTestDoc, getUserFirestore } from "./utils.test.mjs";
import { createWriteStream, mkdirSync } from "fs";
import { setLogLevel } from "firebase/firestore";
import http from "http";

/** @type {import("@firebase/rules-unit-testing").RulesTestEnvironment} */
let testEnv;

const SET_DATA = {
    set: {
        name: "Test Set",
        terms: [
            { term: "hi", definition: "hello" },
            { term: "hi", definition: "hello" },
            { term: "hi", definition: "hello" },
            { term: "hi", definition: "hello" },
        ],
        visibility: 2,
    },
    meta_set: {
        name: "Test Set",
        nameWords: ["test", "set"],
        numTerms: 4,
        collections: [0, 1, 2],
        visibility: 2,
        likes: 0,
    }
};

before(async () => {
    setLogLevel("error");
    testEnv = await initEnvironment();
});

beforeEach(async () => await testEnv.clearFirestore());

describe("Unauthenticated users", () => {
    it("Can view public sets", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: 2 });
            await setTestDoc(firestore, "sets", "set-id", { visibility: 2 });
        });
        let unauthed = testEnv.unauthenticatedContext().firestore();
        await assertSucceeds(getTestDoc(unauthed, "meta_sets", "set-id"));
        await assertSucceeds(getTestDoc(unauthed, "sets", "set-id"));
    });
    it("Can view unlisted sets", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: 1 });
            await setTestDoc(firestore, "sets", "set-id", { visibility: 1 });
        });
        let unauthed = testEnv.unauthenticatedContext().firestore();
        await assertSucceeds(getTestDoc(unauthed, "meta_sets", "set-id"));
        await assertSucceeds(getTestDoc(unauthed, "sets", "set-id"));
    });
    it("Cannot view private sets", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: 0 });
            await setTestDoc(firestore, "sets", "set-id", { visibility: 0 });
        });
        let unauthed = testEnv.unauthenticatedContext().firestore();
        await assertFails(getTestDoc(unauthed, "meta_sets", "set-id"));
        await assertFails(getTestDoc(unauthed, "sets", "set-id"));
    });
    it("Cannot view shared sets", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: ["user@example.com"] });
            await setTestDoc(firestore, "sets", "set-id", { visibility: ["user@example.com"] });
        });
        let unauthed = testEnv.unauthenticatedContext().firestore();
        await assertFails(getTestDoc(unauthed, "meta_sets", "set-id"));
        await assertFails(getTestDoc(unauthed, "sets", "set-id"));
    });
    it("Cannot create sets", async () => {
        let unauthed = testEnv.unauthenticatedContext().firestore();
        await assertFails(setTestDoc(unauthed, "meta_sets", "set-id", SET_DATA.meta_set));
        await assertFails(setTestDoc(unauthed, "sets", "set-id", SET_DATA.set));
    });
});

describe("Authenticated users", () => {
    it("Can view private sets that they own", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: 0, uid: "user-id" });
            await setTestDoc(firestore, "sets", "set-id", { visibility: 0, uid: "user-id" });
        });
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertSucceeds(getTestDoc(authed, "meta_sets", "set-id"));
        await assertSucceeds(getTestDoc(authed, "sets", "set-id"));
    });
    it("Cannot view private sets that they don't own", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: 0, uid: "user-id" });
            await setTestDoc(firestore, "sets", "set-id", { visibility: 0, uid: "user-id" });
        });
        let authed = getUserFirestore(testEnv, "another-user-id", "A User");
        await assertFails(getTestDoc(authed, "meta_sets", "set-id"));
        await assertFails(getTestDoc(authed, "sets", "set-id"));
    });
    it("Can view shared sets that they own", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: ["user@example.com"], uid: "user-id" });
            await setTestDoc(firestore, "sets", "set-id", { visibility: ["user@example.com"], uid: "user-id" });
        });
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertSucceeds(getTestDoc(authed, "meta_sets", "set-id"));
        await assertSucceeds(getTestDoc(authed, "sets", "set-id"));
    });
    it("Can view sets shared with them", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: ["user@example.com"], uid: "user-id" });
            await setTestDoc(firestore, "sets", "set-id", { visibility: ["user@example.com"], uid: "user-id" });
        });
        let authed = getUserFirestore(testEnv, "another-user-id", "A User", "user@example.com");
        await assertSucceeds(getTestDoc(authed, "meta_sets", "set-id"));
        await assertSucceeds(getTestDoc(authed, "sets", "set-id"));
    });
    it("Cannot view sets shared with to other users", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { visibility: ["user@example.com"], uid: "user-id" });
            await setTestDoc(firestore, "sets", "set-id", { visibility: ["user@example.com"], uid: "user-id" });
        });
        let authed = getUserFirestore(testEnv, "third-user-id", "A User", "user2@example.com");
        await assertFails(getTestDoc(authed, "meta_sets", "set-id"));
        await assertFails(getTestDoc(authed, "sets", "set-id"));
    });


    it("Cannot create sets without the required properties", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", {}));
        await assertFails(setTestDoc(authed, "sets", "set-id", {}));
    });
    it("Cannot create sets under a different user ID", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "another-user-id", creator: "A User" }));
        await assertFails(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set, uid: "another-user-id" }));
    });
    it("Cannot create sets under a different display name", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", creator: "Another User" }));
    });
    it("Can create sets with all the required properties", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertSucceeds(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", creator: "A User" }));
        await assertSucceeds(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set, uid: "user-id" }));
    });
    it("Can create sets with all the required properties and the optional properties", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertSucceeds(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set, uid: "user-id", description: "A Description" }));
    });
    it("Can create sets with names that contain accents", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertSucceeds(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", creator: "A User", name: " a Sèñor  to BEAt (them)? all     ".normalize("NFD"), nameWords: ["a", "senor", "to", "beat", "them", "all"] }));
    });
    it("Cannot create sets with names that do not match nameWords", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", creator: "A User", name: "some random title", nameWords: ["free", "robux", "nitro", "vbucks"] })); // this is a joke lol
    });
    it("Cannot alter the likes a set has", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", likes: 5 }));
    });
    it("Cannot create sets with no terms", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set, uid: "user-id", terms: [] }));
    });
    it("Cannot create sets with extra fields", async () => {
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", creator: "A User", extraField: "something" }));
        await assertFails(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set, uid: "user-id", extraField: "something" }));
    });

    it("Cannot edit sets that they don't own", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { uid: "another-user-id" });
            await setTestDoc(firestore, "sets", "set-id", { uid: "another-user-id" });
        });
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        await assertFails(setTestDoc(authed, "meta_sets", "set-id", { ...SET_DATA.meta_set, uid: "user-id", creator: "A User" }));
        await assertFails(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set, uid: "user-id" }));
    });
    it("Can edit sets they own", async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
            const firestore = context.firestore();
            await setTestDoc(firestore, "meta_sets", "set-id", { uid: "user-id" });
            await setTestDoc(firestore, "sets", "set-id", { uid: "user-id" });
        });
        let authed = getUserFirestore(testEnv, "user-id", "A User");
        const { likes: _, ...setMetaToUpdate } = SET_DATA.meta_set;
        await assertSucceeds(setTestDoc(authed, "meta_sets", "set-id", { ...setMetaToUpdate, creator: "A User" }));
        await assertSucceeds(setTestDoc(authed, "sets", "set-id", { ...SET_DATA.set }));
    });
});

after(async () => {
    await testEnv.cleanup();
    try { mkdirSync("coverage", { recursive: true,  }); } catch { /* empty */ }
    const coverageFileStream = createWriteStream("coverage/firestore-rules-coverage.html");
    await new Promise((resolve, reject) => {
        const { host, port } = testEnv.emulators.firestore;
        http.get(`http://${host}:${port}/emulator/v1/projects/${testEnv.projectId}:ruleCoverage.html`, res => {
            res.pipe(coverageFileStream);
            res.on("end", resolve);
            res.on("error", reject);
        });
    });
    coverageFileStream.close();
    console.log("Wrote coverage report to coverage/firestore-rules-coverage.html");
});