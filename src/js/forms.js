import { collection, addDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { navigateLoginSaveState } from "./utils";

// collapse the below code into a single const array
const forms = {
    feedback: {
        name: document.getElementById("name-feedback"),
        email: document.getElementById("email-feedback"),
        rating: document.getElementById("rating-feedback"),
        text: document.getElementById("text-feedback"),
        btn: document.getElementById("btn-feedback"),
        form: document.getElementById("feedback-form"),
        collection: "feedback",
        function: sendFeedback
    },
    bug: {
        name: document.getElementById("name-bug"),
        email: document.getElementById("email-bug"),
        url: document.getElementById("url-bug"),
        text: document.getElementById("text-bug"),
        btn: document.getElementById("btn-bug"),
        form: document.getElementById("bug-form"),
        collection: "bug",
        function: sendBug
    },
    takedown: {
        name: document.getElementById("name-takedown"),
        email: document.getElementById("email-takedown"),
        url: document.getElementById("url-takedown"),
        text: document.getElementById("text-takedown"),
        btn: document.getElementById("btn-takedown"),
        form: document.getElementById("takedown-form"),
        collection: "takedown",
        function: sendTakedown
    },
    other: {
        name: document.getElementById("name-other"),
        email: document.getElementById("email-other"),
        text: document.getElementById("text-other"),
        btn: document.getElementById("btn-other"),
        form: document.getElementById("other-form"),
        collection: "other",
        function: sendOther
    }
};

const { db } = initialize(async user => {
    if (user) {
        Object.values(forms).forEach(form => {
            form.form.addEventListener("submit", async e => {
                e.preventDefault();
                form.btn.classList.add("is-loading");
                let data = form.function();
                await addDoc(collection(db, "form_data", "types", form.collection), { uid: user.uid, ...data });
                forms.btn.classList.remove("is-loading");
                forms.btn.disabled = true;
                forms.btn.innerText = "Submitted!"; // TODO change to toast
                form.form.reset();
            });
        });
    } else navigateLoginSaveState();
});

async function sendFeedback() {
    return {
        name: forms.feedback.name.value,
        email: forms.feedback.email.value,
        rating: forms.feedback.rating.value,
        text: forms.feedback.text.value
    };
}

async function sendBug() {
   return {
        name: forms.bug.name.value,
        email: forms.bug.email.value,
        url: forms.bug.url.value,
        text: forms.bug.text.value
    };
}

async function sendTakedown() {
    return {
        name: forms.takedown.name.value,
        email: forms.takedown.email.value,
        url: forms.takedown.url.value,
        text: forms.takedown.text.value
    };
}

async function sendOther() {
    return {
        name: forms.other.name.value,
        email: forms.other.email.value,
        text: forms.other.text.value
    };
}