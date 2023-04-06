import { toast } from "bulma-toast";
import { getUpToDateIdToken, initializeAuth } from "./firebase-rest-api/auth";
import { Firestore } from "./firebase-rest-api/firestore";
import { navigateLoginSaveState } from "./utils";

let initialized = false;

const forms = {
    feedback: {
        name: document.getElementById("name-feedback") as HTMLInputElement,
        email: document.getElementById("email-feedback") as HTMLInputElement,
        rating: document.getElementById("rating-feedback") as HTMLInputElement,
        text: document.getElementById("text-feedback") as HTMLInputElement,
        btn: document.getElementById("btn-feedback") as HTMLButtonElement,
        form: document.getElementById("feedback-form") as HTMLFormElement,
        collection: "feedback",
        function: sendFeedback
    },
    bug: {
        name: document.getElementById("name-bug") as HTMLInputElement,
        email: document.getElementById("email-bug") as HTMLInputElement,
        url: document.getElementById("url-bug") as HTMLInputElement,
        text: document.getElementById("text-bug") as HTMLInputElement,
        btn: document.getElementById("btn-bug") as HTMLButtonElement,
        form: document.getElementById("bug-form") as HTMLFormElement,
        collection: "bug",
        function: sendBug
    },
    takedown: {
        name: document.getElementById("name-takedown") as HTMLInputElement,
        email: document.getElementById("email-takedown") as HTMLInputElement,
        url: document.getElementById("url-takedown") as HTMLInputElement,
        text: document.getElementById("text-takedown") as HTMLInputElement,
        btn: document.getElementById("btn-takedown") as HTMLButtonElement,
        form: document.getElementById("takedown-form") as HTMLFormElement,
        collection: "takedown",
        function: sendTakedown
    },
    other: {
        name: document.getElementById("name-other") as HTMLInputElement,
        email: document.getElementById("email-other") as HTMLInputElement,
        text: document.getElementById("text-other") as HTMLInputElement,
        btn: document.getElementById("btn-other") as HTMLButtonElement,
        form: document.getElementById("other-form") as HTMLFormElement,
        collection: "other",
        function: sendOther
    }
};

const auth = initializeAuth(async user => {
    if (user && !initialized) {
        initialized = true;
        Object.values(forms).forEach(form => {
            form.form.addEventListener("submit", async e => {
                e.preventDefault();
                form.btn.classList.add("is-loading");
                form.btn.disabled = true;
                const data = {
                    ...form.function(),
                    name: form.name.value,
                    email: form.email.value,
                    text: form.text.value,
                    response: null // null so we can query for it
                };
                const idToken = await getUpToDateIdToken(auth);
                await Firestore.createDocument(`form_data/types/${form.collection}`, { uid: user.uid, ...data }, idToken);
                form.btn.classList.remove("is-loading");
                form.btn.disabled = false;
                toast({ message: "Form submitted!", type: "is-success" });
                form.form.reset();
            });
        });
    } else navigateLoginSaveState();
});

function sendFeedback() {
    return { rating: forms.feedback.rating.value };
}

function sendBug() {
   return { url: forms.bug.url.value };
}

function sendTakedown() {
    return { url: forms.takedown.url.value };
}

function sendOther() {
    return { }; // other has no extra fields
}