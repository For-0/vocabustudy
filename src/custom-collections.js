import { collection, doc, documentId, getDoc, getDocs, query, where } from "firebase/firestore/lite";
import initialize from "./general.js"
import { createSetCard } from "./utils.js";

const collectionId = decodeURIComponent(location.pathname).match(/\/collection\/([\w ]+)\/?/)[1] || goBack();

const {db, storage} = initialize();
const fields = {
    collectionName: document.querySelector(".field-collection-name"),
    sets: document.querySelector(".set-container")
};

function goBack() {
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#search";
}

addEventListener("DOMContentLoaded", async () => {
    fields.sets.innerText = "Loading sets...";
    let customCollection = await getDoc(doc(db, "collections", collectionId));
    if (!customCollection.exists()) return goBack();
    let collectionData = customCollection.data();
    fields.collectionName.innerText = collectionData.name;
    let sets = await getDocs(query(collection(db, "meta_sets"), where(documentId(), "in", collectionData.sets)));
    fields.sets.innerText = "";
    sets.forEach(async docSnap => {
        let els = await createSetCard(docSnap.data(), docSnap.id, storage);
        fields.sets.appendChild(els.card);
    });
});