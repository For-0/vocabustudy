import { QueryBuilder, VocabSet } from "./firebase-rest-api/firestore.js";
import initialize from "./general.js"
import { createSetCard, paginateQueries } from "./utils";

const userId = decodeURIComponent(location.pathname).match(/\/user\/([\w ]+)\/?/)[1];

function goBack() {
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#search";
}

if (!userId) goBack();
else {
    initialize();
    const fields = {
        userName: document.querySelector<HTMLSpanElement>(".field-user-name"),
        sets: document.querySelector<HTMLDivElement>(".set-container")
    };
    
    addEventListener("DOMContentLoaded", async () => {
        fields.sets.innerText = "Loading sets...";
        const query = new QueryBuilder()
            .select("creator", "name", "numTerms", "collections", "likes", "uid")
            .from("sets")
            .where("visibility", "EQUAL", 2)
            .where("uid", "EQUAL", userId)
            .build();
        await paginateQueries<VocabSet>([query], fields.sets.nextElementSibling as HTMLButtonElement, results => {
            results.forEach(async doc => {
                fields.userName.innerText = doc.creator;
                const els = await createSetCard(doc, doc.id);
                fields.sets.appendChild(els.card);
            });
        }, [0], ["likes", "desc"]);
        fields.sets.innerText = "";
    });
}