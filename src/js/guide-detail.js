import { MDCRipple } from "@material/ripple/index";
import { MDCTextField } from "@material/textfield/index";
import {MDCFormField} from "@material/form-field/index";
import {MDCRadio} from "@material/radio/index";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, createTextFieldWithHelper } from "./utils.js";
import {sanitize} from "dompurify";
import { marked } from "marked";

class QuizQuestion extends HTMLElement {
    constructor() {
        super();
        this.questionId = `_${crypto.randomUUID()}`;
    }
    /**
     * Initialize the quiz question and create the elements if connected
     * @param {{question: string, answers: String[], type: 0|1}} question The initial data for the quiz question
     */
    initialize(question) {
        this.question = question;
        if (this.isConnected) this.showQuestion();
    }
    reportValidity() {
        if (this.question.type == 0) return this.radios[0].root.querySelector("input").reportValidity();
        else if (this.question.type == 1) return this.input.valid = this.input.valid;
    }
    get correct() {
        if (this.question.type == 0) return this.correctOption.checked;
        else if (this.question.type == 1) return this.question.answers.some(el => checkAnswers(el, this.input.value));
    }
    createMCInput(answer) {
        let optionId = `_${crypto.randomUUID()}`;
        let radioButton = this.appendChild(createElement("div", [], {}, [
            createElement("div", ["mdc-form-field"], {}, [
                createElement("div", ["mdc-radio", "mdc-radio__touch"], {}, [
                    createElement("input", ["mdc-radio__native-control"], {
                        type: "radio",
                        name: this.questionId,
                        id: optionId,
                        required: true
                    }),
                    createElement("div", ["mdc-radio__background"], {}, [
                        createElement("div", ["mdc-radio__outer-circle"]),
                        createElement("div", ["mdc-radio__inner-circle"])
                    ])
                ]),
                createElement("label", [], {innerText: sanitize(marked.parseInline(answer), {FORBID_ATTR: ["style"]}), htmlFor: optionId})
            ])
        ]));
        return MDCFormField.attachTo(radioButton.firstElementChild).input = new MDCRadio(radioButton.firstElementChild.firstElementChild);
    }
    createSAInput() {
        let input = createTextFieldWithHelper("Answer", null, {required: true}).obj;
        this.appendChild(input.root);
        return input;
    }
    showQuestion() {
        this.appendChild(createElement("p", [], {innerHTML: sanitize(marked.parseInline(`**${this.question.question}**`), {FORBID_ATTR: ["style"]})}));
        if (this.question.type == 0) {
            let shuffledOptions = [...this.question.answers];
            shuffle(shuffledOptions);
            let correctIndex = shuffledOptions.indexOf(this.question.answers[0]);
            this.radios = shuffledOptions.map(option => this.createMCInput(option));
            this.correctOption = this.radios[correctIndex];
        } else if (this.question.type == 1)
            this.input = this.createSAInput();
    }
    connectedCallback() {
        this.textContent = "";
        if (this.question) this.showQuestion();
    }
}
window.customElements.define("quiz-question", QuizQuestion);

const {db, auth} = initialize(async user => {
    if (user) {
        socialRef = doc(setRef, "social", user.uid);
        let socialDoc = await getDoc(socialRef);
        let userLikes = socialDoc.exists() ? socialDoc.data().like : false;
        showLikeStatus(userLikes);
    } else showLikeStatus(false);
});
const ignoredCharsRE = /[\*_\.]/g;
const [, setId] = decodeURIComponent(location.pathname).match(/\/guide\/([\w ]+)\/view\/?/) || (location.pathname = "/");
const setRef = doc(db, "sets", setId);
/** @type {import("firebase/firestore/lite").DocumentReference<import("firebase/firestore/lite").DocumentData>?} */
let socialRef = null;
/**
 * @type {{name: string, public: true, terms: {term: string, definition: string}[], uid: string}?}
 */
let currentSet = null;

const pages = {
    setOverview: {
        el: document.getElementById("home"),
        name: document.querySelector("#home .field-name"),
        description: document.querySelector("#home .field-description"),
        numTerms: document.querySelector("#home .field-num-terms"),
        terms: document.querySelector("#home .field-terms"),
        btnLike: document.querySelector("#home .btn-like"),
        commentsContainer: document.querySelector(".comments-container"),
        fieldComment: document.querySelector("#home .field-comment"),
    }
};

function showLikeStatus(likeStatus) {
    if (likeStatus) {
        pages.setOverview.btnLike.querySelector(".mdc-button__label").innerText = "Unlike";
        pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText = "favorite";
    } else {
        pages.setOverview.btnLike.querySelector(".mdc-button__label").innerText = "Like";
        pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText = "favorite_border";
    }
}

function checkAnswers(answer, correct) {
    let cleanAnswer = answer.trim().replace(ignoredCharsRE, "").toUpperCase();
    let possibleCorrect = [correct, correct.split(","), correct.split("/")].flat().map(el => el = el.trim().replace(ignoredCharsRE, "").toUpperCase());
    return possibleCorrect.includes(cleanAnswer);
}

function createItem(item) {
    if (item.type === 0) {
        let cardEl = createElement("div", ["mdc-card", "mdc-card--outlined"], {}, [
            createElement("div", ["mdc-card-wrapper__text-section"], {}, [
                createElement("div", ["mdc-typography--headline6"], {innerHTML: sanitize(marked.parse("# " + item.title), {FORBID_ATTR: ["style"]})}),
                createElement("div", [], {innerHTML: sanitize(marked.parse(item.body), {FORBID_ATTR: ["style"]})})
            ])
        ]);
        return pages.setOverview.terms.appendChild(cardEl);
    } else if (item.type === 1) {
        let questionEls = item.questions.map(question => createElement("quiz-question", [], {question}));
        let btnCheck = createElement("div", [], {}, [createElement("button", ["mdc-button", "mdc-button--raised"], {}, [
            createElement("span", ["mdc-button__ripple"]),
            createElement("span", ["mdc-button__label"], {innerText: "Check"})
        ])]);
        let cardEl = createElement("div", ["mdc-card", "mdc-card--outlined"], {}, [
            createElement("div", ["mdc-card-wrapper__text-section"], {}, [
                createElement("div", ["mdc-typography--headline6"], {innerHTML: sanitize(marked.parse("# " + item.title), {FORBID_ATTR: ["style"]})}),
                createElement("div", [], {}, [...questionEls, btnCheck])
            ])
        ]);
        MDCRipple.attachTo(btnCheck.firstElementChild);
        btnCheck.addEventListener("click", () => {
            if (questionEls.every(el => el.reportValidity())) {
                questionEls.forEach(el => el.classList.add(el.correct ? "correct" : "incorrect"));
                let numCorrect = cardEl.querySelectorAll(".correct").length;
                alert(`You got ${numCorrect} out of ${questionEls.length} correct!`);
            }
        })
        return pages.setOverview.terms.appendChild(cardEl);
    }
}
function createCommentCard({ name, comment, like }, id) {
    let isMyComment = auth.currentUser?.uid === id;
    let cardEl = createElement("div", ["mdc-card"]);
    let cardHeading = cardEl.appendChild(createElement("div", ["mdc-card-wrapper__text-section"]));
    let cardTitle = cardHeading.appendChild(createElement("div", ["mdc-typography--headline6"], {}, [createElement("a", [], {innerText: name, href: `/user/${id}/`})]));
    cardTitle.style.fontWeight = "600";
    let cardText = cardHeading.appendChild(document.createElement("div"));
    if (isMyComment) {
        cardText.appendChild(pages.setOverview.fieldComment).hidden = false;
        pages.setOverview.fieldComment.input.value = comment;
    } else {
        cardText.innerHTML = sanitize(marked.parseInline(comment), {FORBID_ATTR: ["style"]});
        cardText.style.overflowWrap = "break-word";
        if (like) cardText.appendChild(createElement("span", ["likes-badge"], {innerText: `${name} likes this set`}));
    }
    return pages.setOverview.commentsContainer.appendChild(cardEl);
}
function shuffle(arr) {
    let currentIndex = arr.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
        console.log(randomIndex);
    }
}

addEventListener("DOMContentLoaded", async () => {
    pages.setOverview.fieldComment.input = new MDCTextField(pages.setOverview.fieldComment.querySelector("label"));
    pages.setOverview.fieldComment.button = new MDCRipple(pages.setOverview.fieldComment.querySelector("button")).root;
    try {
        let setSnap = await getDoc(setRef);
        currentSet = setSnap.data();
        document.title = `${currentSet.name} - Vocabustudy`;
        currentSet.terms.filter(el => el.type === 0).forEach(term => {
            term.title = term.title.replace(/[\u2018\u2019]/g, "'");
            term.body = term.body.replace(/[\u2018\u2019]/g, "'");
        });

        // MDC Instantiation and Events
        pages.setOverview.name.innerText = currentSet.name;
        pages.setOverview.description.innerHTML = sanitize(marked.parse(currentSet.description || ""), {FORBID_ATTR: ["style"]})
        pages.setOverview.numTerms.innerText = currentSet.terms.length;
        for (let term of currentSet.terms) createItem(term);
        pages.setOverview.btnLike.addEventListener("click", async () =>  {
            if (!auth.currentUser) {
                localStorage.setItem("redirect_after_login", location.href);
                location.href = "/#login";
            } else if (socialRef) {
                let currentLikeStatus = pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText === "favorite";
                await setDoc(socialRef, {like: !currentLikeStatus, name: auth.currentUser.displayName}, {merge: true});
                showLikeStatus(!currentLikeStatus);
            }
        });
        pages.setOverview.commentsContainer.parentElement.addEventListener("toggle", async () => { // TODO modularize
            let comments = await getDocs(query(collection(setRef, "social"), orderBy("comment")));
            if (comments.size) comments.forEach(comment => createCommentCard(comment.data(), comment.id));
            else pages.setOverview.commentsContainer.innerText = "No Comments. Post one!";
            if (auth.currentUser && !pages.setOverview.commentsContainer.querySelector(".mdc-text-field")) {
                createCommentCard({name: auth.currentUser.displayName, comment: ""}, auth.currentUser.uid);
                pages.setOverview.fieldComment.input.valid = true;
            }
        }, {once: true});
        pages.setOverview.fieldComment.input.listen("change", () => pages.setOverview.fieldComment.button.disabled = false);
        pages.setOverview.fieldComment.button.addEventListener("click", async () => {
            if (auth.currentUser && (pages.setOverview.fieldComment.input.valid = pages.setOverview.fieldComment.input.valid)) {
                await setDoc(socialRef, {comment: pages.setOverview.fieldComment.input.value, name: auth.currentUser.displayName}, {merge: true});
                pages.setOverview.fieldComment.button.disabled = true;
            }
        });
    } catch (err) {
        localStorage.setItem("redirect_after_login", location.href);
        if (auth.currentUser) await auth.signOut();
        location.href = "/#login";
        return;
    }
});

addEventListener("hashchange", () => navigate());