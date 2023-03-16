import { toast } from "bulma-toast";
import { getUpToDateIdToken, initializeAuth } from "./firebase-rest-api/auth";
import { Firestore } from "./firebase-rest-api/firestore";
import { navigateLoginSaveState } from "./utils";

const auth = initializeAuth();

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

initializeAuth(async user => {
    if (user) {
        Object.values(forms).forEach(form => {
            form.form.addEventListener("submit", async e => {
                e.preventDefault();
                form.btn.classList.add("is-loading");
                form.btn.disabled = true;
                const data = form.function();
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
    return {
        name: forms.feedback.name.value,
        email: forms.feedback.email.value,
        rating: forms.feedback.rating.value,
        text: forms.feedback.text.value
    };
}

function sendBug() {
   return {
        name: forms.bug.name.value,
        email: forms.bug.email.value,
        url: forms.bug.url.value,
        text: forms.bug.text.value
    };
}

function sendTakedown() {
    return {
        name: forms.takedown.name.value,
        email: forms.takedown.email.value,
        url: forms.takedown.url.value,
        text: forms.takedown.text.value
    };
}

function sendOther() {
    return {
        name: forms.other.name.value,
        email: forms.other.email.value,
        text: forms.other.text.value
    };
}