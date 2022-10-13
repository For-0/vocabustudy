import { collection, query, where } from "firebase/firestore/lite";
import initialize from "./general.js"
import { createSetCard, paginateQueries } from "./utils.js";

const userId = decodeURIComponent(location.pathname).match(/\/user\/([\w ]+)\/?/)[1] || goBack();

const {db, storage} = initialize();
const fields = {
    userName: document.querySelector(".field-user-name"),
    sets: document.querySelector(".set-container")
};

function goBack() {
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#search";
}

addEventListener("DOMContentLoaded", async () => {
    fields.sets.innerText = "Loading sets...";
    await paginateQueries([query(collection(db, "meta_sets"), where("public", "==", true), where("uid", "==", userId))], fields.sets.nextElementSibling, results => {
        results.forEach(async docSnap => {
            fields.userName.innerText = docSnap.get("creator");
            let els = await createSetCard(docSnap.data(), docSnap.id, storage);
            fields.sets.appendChild(els.card);
        });
    });
    fields.sets.innerText = "";
});