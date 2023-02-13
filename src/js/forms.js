import { collection, addDoc } from "firebase/firestore/lite";
import initialize from "./general.js";

// collapse the below code into a single const array
const forms = {
    feedback: {
        name: document.getElementById("name-feedback"),
        email: document.getElementById("email-feedback"),
        rating: document.getElementById("rating-feedback"),
        text: document.getElementById("text-feedback"),
        btn: document.getElementById("btn-feedback"),
        form: document.getElementById("feedback-form"),
        function: sendFeedback
    },
    bug: {
        name: document.getElementById("name-bug"),
        email: document.getElementById("email-bug"),
        url: document.getElementById("url-bug"),
        text: document.getElementById("text-bug"),
        btn: document.getElementById("btn-bug"),
        form: document.getElementById("bug-form"),
        function: sendBug
    },
    takedown: {
        name: document.getElementById("name-takedown"),
        email: document.getElementById("email-takedown"),
        url: document.getElementById("url-takedown"),
        text: document.getElementById("text-takedown"),
        btn: document.getElementById("btn-takedown"),
        form: document.getElementById("takedown-form"),
        function: sendTakedown
    },
    other: {
        name: document.getElementById("name-other"),
        email: document.getElementById("email-other"),
        text: document.getElementById("text-other"),
        btn: document.getElementById("btn-other"),
        form: document.getElementById("other-form"),
        function: sendOther
    }
};

const {db, auth} = initialize(async user => {
    if (user) {
        Object.values(forms).forEach(form => {
            form.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                form.btn.classList.add("is-loading");
                await form.function();
                form.form.reset();
            });
        });
    } else {
        localStorage.setItem("redirect_after_login", location.href);
        location.href = "/#login";
    }
});

async function sendFeedback() {
    const feedback = {
        name: forms.feedback.name.value,
        email: forms.feedback.email.value,
        rating: forms.feedback.rating.value,
        text: forms.feedback.text.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "feedback"), feedback).then(() => {
        forms.feedback.btn.classList.remove("is-loading");
        forms.feedback.btn.disabled = true;
        forms.feedback.btn.innerText = "Submitted!";
    })
}

async function sendBug() {
    const bug = {
        name: forms.bug.name.value,
        email: forms.bug.email.value,
        url: forms.bug.url.value,
        text: forms.bug.text.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "bug"), bug).then(() => {
        forms.bug.btn.classList.remove("is-loading");
        forms.bug.btn.disabled = true;
        forms.bug.btn.innerText = "Submitted!";
    })
}

async function sendTakedown() {
    const takedown = {
        name: forms.takedown.name.value,
        email: forms.takedown.email.value,
        url: forms.takedown.url.value,
        text: forms.takedown.text.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "takedown"), takedown).then(() => {
        forms.takedown.btn.classList.remove("is-loading");
        forms.takedown.btn.disabled = true;
        forms.takedown.btn.innerText = "Submitted!";
    })
}

async function sendOther() {
    const other = {
        name: forms.other.name.value,
        email: forms.other.email.value,
        text: forms.other.text.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "other"), other).then(() => {
        forms.other.btn.classList.remove("is-loading");
        forms.other.btn.disabled = true;
        forms.other.btn.innerText = "Submitted!";
    })
}