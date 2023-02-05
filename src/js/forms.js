import { collection, addDoc } from "firebase/firestore/lite";
import initialize from "./general.js";

const feedbackName = document.getElementById("name-feedback");
const feedbackEmail = document.getElementById("email-feedback");
const feedbackRating = document.getElementById("rating-feedback");
const feedbackText = document.getElementById("text-feedback");
const feedbackBtn = document.getElementById("btn-feedback");

const bugName = document.getElementById("name-bug");
const bugEmail = document.getElementById("email-bug");
const bugURL = document.getElementById("url-bug");
const bugText = document.getElementById("text-bug");
const bugBtn = document.getElementById("btn-bug");

const takedownName = document.getElementById("name-takedown");
const takedownEmail = document.getElementById("email-takedown");
const takedownURL = document.getElementById("url-takedown");
const takedownText = document.getElementById("text-takedown");
const takedownBtn = document.getElementById("btn-takedown");

const otherName = document.getElementById("name-other");
const otherEmail = document.getElementById("email-other");
const otherText = document.getElementById("text-other");
const otherBtn = document.getElementById("btn-other");

const toFeedback = document.getElementById("to-feedback");
const toBug = document.getElementById("to-bug");
const toTakedown = document.getElementById("to-takedown");
const toOther = document.getElementById("to-other");

const feedbackForm = document.getElementById("feedback-form");
const bugForm = document.getElementById("bug-form");
const takedownForm = document.getElementById("takedown-form");
const otherForm = document.getElementById("other-form");

const {db, auth} = initialize(async user => {
    if (user) {
        feedbackForm.addEventListener('submit',  async (e) => {
            e.preventDefault();
            feedbackBtn.classList.add("is-loading");
            await sendFeedback();
        });
        bugForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            bugBtn.classList.add("is-loading");
            await sendBug();
        });
        takedownForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            takedownBtn.classList.add("is-loading");
            await sendTakedown();
        });
        otherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            otherBtn.classList.add("is-loading");
            await sendOther();
        });
    } else {
        toFeedback.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        toBug.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        toTakedown.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        toOther.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        feedbackBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        bugBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        takedownBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
        otherBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            localStorage.setItem("redirect_after_login", location.href);
            location.href = "/#login";
        });
    }
});

async function sendFeedback() {
    const feedback = {
        name: feedbackName.value,
        email: feedbackEmail.value,
        rating: feedbackRating.value,
        text: feedbackText.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "feedback"), feedback).then(() => {
        feedbackBtn.classList.remove("is-loading");
        feedbackBtn.disabled = true;
        feedbackBtn.innerHTML = "Submitted!";
    })
}

async function sendBug() {
    const bug = {
        name: bugName.value,
        email: bugEmail.value,
        url: bugURL.value,
        text: bugText.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "bug"), bug).then(() => {
        bugBtn.classList.remove("is-loading");
        bugBtn.disabled = true;
        bugBtn.innerHTML = "Submitted!";
    })
}

async function sendTakedown() {
    const takedown = {
        name: takedownName.value,
        email: takedownEmail.value,
        url: takedownURL.value,
        text: takedownText.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "takedown"), takedown).then(() => {
        takedownBtn.classList.remove("is-loading");
        takedownBtn.disabled = true;
        takedownBtn.innerHTML = "Submitted!";
    })
}

async function sendOther() {
    const other = {
        name: otherName.value,
        email: otherEmail.value,
        text: otherText.value,
        uid: auth.currentUser.uid
    };
    await addDoc(collection(db, "form_data", "types", "other"), other).then(() => {
        otherBtn.classList.remove("is-loading");
        otherBtn.disabled = true;
        otherBtn.innerHTML = "Submitted!";
    })
}