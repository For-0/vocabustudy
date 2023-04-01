import { initializeAuth } from "./firebase-rest-api/auth";
import { CustomCollection, Firestore, VocabSet } from "./firebase-rest-api/firestore";
import { createSetCard } from "./utils";

const collectionId = decodeURIComponent(location.pathname).match(/\/collection\/([\w ]+)\/?/)[1];

initializeAuth();

const fields = {
    collectionName: document.querySelector<HTMLSpanElement>(".field-collection-name"),
    sets: document.querySelector<HTMLDivElement>(".set-container")
};

function goBack() {
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#search";
}

if (!collectionId) goBack();
else
    addEventListener("DOMContentLoaded", async () => {
        fields.sets.innerText = "Loading sets...";
        const customCollection = await Firestore.getDocument("collections", collectionId, ["name", "sets"]);
        const collectionData = CustomCollection.fromSingle(customCollection);
        if (!collectionData) return goBack();
        fields.collectionName.innerText = collectionData.name;
        fields.sets.innerText = "";
        if (collectionData.sets.length < 1) return;
        const sets = VocabSet.fromMultiple(await Firestore.getDocumentsForIds(VocabSet.collectionKey, collectionData.sets, ["creator", "name", "numTerms", "collections", "likes", "uid"]));
        sets.forEach(async doc => {
            const els = await createSetCard(doc);
            fields.sets.appendChild(els.card);
        });
    });