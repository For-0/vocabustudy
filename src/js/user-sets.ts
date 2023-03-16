import { initializeAuth } from "./firebase-rest-api/auth";
import { QueryBuilder, VocabSet } from "./firebase-rest-api/firestore";
import { createSetCard, paginateQueries } from "./utils";

initializeAuth();

const userId = decodeURIComponent(location.pathname).match(/\/user\/([\w ]+)\/?/)[1];

function goBack() {
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#search";
}

if (!userId) goBack();
else {
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
            .orderBy(["likes", "__name__"], "DESCENDING")
            .build();
        await paginateQueries([query], fields.sets.nextElementSibling as HTMLButtonElement, results => {
            VocabSet.fromMultiple(results).forEach(async doc => {
                fields.userName.innerText = doc.creator;
                const els = await createSetCard(doc);
                fields.sets.appendChild(els.card);
            });
        });
        fields.sets.innerText = "";
    });
}