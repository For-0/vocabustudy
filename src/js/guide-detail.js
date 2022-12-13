import { MDCRipple } from "@material/ripple/index";
import { MDCTextField } from "@material/textfield/index";
import { MDCFormField } from "@material/form-field/index";
import { MDCRadio } from "@material/radio/index";
import { MDCSnackbar } from "@material/snackbar/index";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, createTextFieldWithHelper, normalizeAnswer } from "./utils.js";
import { sanitize } from "dompurify";
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
        else if (this.question.type == 1) {
            let isCorrect = this.question.answers.some(el => checkAnswers(el, this.input.value));
            this.input.helperText.root.innerText = isCorrect ? "Correct!" : `Incorrect -> ${normalizeAnswer(this.question.answers[0])}`;
            this.input.helperText.root.parentElement.hidden = false;
            return isCorrect;
        }
    }
    /**
     * @param {boolean} value
     */
    set disabled(value) {
        if (this.question.type == 0) this.radios.forEach(el => el.disabled = value);
        else if (this.question.type == 1) this.input.disabled = value;
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
                createElement("label", [], { innerText: sanitize(marked.parseInline(answer), sanitizerOpts), htmlFor: optionId })
            ])
        ]));
        return MDCFormField.attachTo(radioButton.firstElementChild).input = new MDCRadio(radioButton.firstElementChild.firstElementChild);
    }
    createSAInput() {
        let input = createTextFieldWithHelper("Answer", "howdy", { required: true });
        input.helperLine.querySelector(".mdc-text-field-helper-text").classList.add("mdc-text-field-helper-text--persistent");
        this.append(input.textField, input.helperLine);
        input.obj.initialize();
        input.helperLine.hidden = true;
        return input.obj;
    }
    showQuestion() {
        this.appendChild(createElement("p", [], { innerHTML: sanitize(marked.parseInline(`**${this.question.question}**`), sanitizerOpts) }));
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

const { db, auth } = initialize(async user => {
    if (user) {
        socialRef = doc(setRef, "social", user.uid);
        let socialDoc = await getDoc(socialRef);
        let userLikes = socialDoc.exists() ? socialDoc.data().like : false;
        showLikeStatus(userLikes);
    } else showLikeStatus(false);
});
const [, setId] = decodeURIComponent(location.pathname).match(/\/guide\/([\w ]+)\/view\/?/) || (location.pathname = "/");
const setRef = doc(db, "sets", setId);
/** @type {DOMPurify.Config} */
const sanitizerOpts = { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] };
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
        termNav: document.querySelector("#home .field-term-navigation"),
        btnLike: document.querySelector("#home .btn-like"),
        commentsContainer: document.querySelector(".comments-container"),
        fieldComment: document.querySelector("#home .field-comment"),
        snackbarCommentSaved: new MDCSnackbar(document.querySelector("#snackbar-comment-saved"))
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
    let cleanAnswer = normalizeAnswer(answer).toUpperCase();
    let possibleCorrect = [correct, correct.split(","), correct.split("/")].flat().map(el => el = normalizeAnswer(el).toUpperCase());
    return possibleCorrect.includes(cleanAnswer);
}

function selectNavButton(btn) {
    pages.setOverview.termNav.querySelectorAll(".mdc-button--raised").forEach(el => {
        el.classList.remove("mdc-button--raised", "mdc-button--unelevated");
        el.classList.add("mdc-button--outlined");
    });
    btn.classList.add("mdc-button--raised", "mdc-button--unelevated");
    btn.classList.remove("mdc-button--outlined");
}

function createItem(item, index) {
    let itemId = `item-${index}`;
    let navBtn = pages.setOverview.termNav.appendChild(createElement("a", ["mdc-button", "mdc-button--outlined"], {href: `#${itemId}`}, [
        createElement("span", ["mdc-button__ripple"]),
        createElement("span", ["mdc-button__label"], { innerText: item.title })
    ]));
    let navRipple = MDCRipple.attachTo(navBtn);
    navBtn.addEventListener("click", () => {
        selectNavButton(navBtn);
        navRipple.layout();
    });
    if (index === 0) navBtn.click();
    if (item.type === 0) {
        let cardEl = createElement("div", ["guide-item"], {id: itemId}, [
            createElement("h2", ["mdc-typography--headline6"], { innerHTML: sanitize(marked.parse("# " + item.title), sanitizerOpts) }),
            createElement("div", [], { innerHTML: sanitize(marked.parse(item.body), sanitizerOpts) })
        ]);
        return pages.setOverview.terms.appendChild(cardEl);
    } else if (item.type === 1) {
        let questionEls = item.questions.map(question => createElement("quiz-question", [], { question }));
        let btnCheck = createElement("div", [], {}, [createElement("button", ["mdc-button", "mdc-button--raised"], {}, [
            createElement("span", ["mdc-button__ripple"]),
            createElement("span", ["mdc-button__label"], { innerText: "Check" })
        ])]);
        btnCheck.style.marginTop = "1rem";
        let cardEl = createElement("div", ["guide-item"], {id: itemId}, [
            createElement("h2", ["mdc-typography--headline6"], { innerHTML: sanitize(marked.parse("# " + item.title), sanitizerOpts) }),
            createElement("div", [], {}, [...questionEls, btnCheck])
        ]);
        MDCRipple.attachTo(btnCheck.firstElementChild);
        btnCheck.firstElementChild.addEventListener("click", () => {
            if (btnCheck.querySelector(".mdc-button__label").innerText === "CHECK") {
                if (questionEls.every(el => el.reportValidity())) {
                    questionEls.forEach(el => {
                        el.classList.add(el.correct ? "correct" : "incorrect");
                        el.correctOption?.root.classList.add("option-correct");
                        el.disabled = true;
                    });
                    let numCorrect = cardEl.querySelectorAll(".correct").length;
                    btnCheck.querySelector(".mdc-button__label").innerText = `${(numCorrect/questionEls.length).toFixed(2) * 100}% - Restart`;
                }
            } else {
                btnCheck.querySelector(".mdc-button__label").innerText = "Check";
                questionEls.forEach(el => {
                    el.classList.remove("correct", "incorrect");
                    el.connectedCallback()
                });
            }
        })
        return pages.setOverview.terms.appendChild(cardEl);
    }
}
function createCommentCard({ name, comment, like }, id) {
    let isMyComment = auth.currentUser?.uid === id;
    let cardEl = createElement("div", ["mdc-card"]);
    let cardHeading = cardEl.appendChild(createElement("div", ["mdc-card-wrapper__text-section"]));
    let cardTitle = cardHeading.appendChild(createElement("div", ["mdc-typography--headline6"], {}, [createElement("a", [], { innerText: name, href: `/user/${id}/` })]));
    cardTitle.style.fontWeight = "600";
    let cardText = cardHeading.appendChild(document.createElement("div"));
    if (isMyComment) {
        cardText.appendChild(pages.setOverview.fieldComment).hidden = false;
        pages.setOverview.fieldComment.input.value = comment;
    } else {
        cardText.innerHTML = sanitize(marked.parseInline(comment), sanitizerOpts);
        cardText.style.overflowWrap = "break-word";
        if (like) cardText.appendChild(createElement("span", ["likes-badge"], { innerText: `${name} likes this set` }));
    }
    return pages.setOverview.commentsContainer.appendChild(cardEl);
}
function shuffle(arr) {
    let currentIndex = arr.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
}

addEventListener("DOMContentLoaded", async () => {
    pages.setOverview.fieldComment.input = new MDCTextField(pages.setOverview.fieldComment.querySelector("label"));
    pages.setOverview.fieldComment.button = new MDCRipple(pages.setOverview.fieldComment.querySelector("button")).root;
    try {
        let setSnap = await getDoc(setRef);
        if (!setSnap.exists()) return location.href = "/404";
        currentSet = setSnap.data();
        document.title = `${currentSet.name} - Vocabustudy`;
        currentSet.terms.filter(el => el.type === 0).forEach(term => {
            term.title = term.title.replace(/[\u2018\u2019]/g, "'");
            term.body = term.body.replace(/[\u2018\u2019]/g, "'");
        });

        // MDC Instantiation and Events
        pages.setOverview.name.innerText = currentSet.name;
        pages.setOverview.description.innerHTML = sanitize(marked.parse(currentSet.description || ""), sanitizerOpts)
        pages.setOverview.numTerms.innerText = currentSet.terms.length;
        for (let [i, term] of currentSet.terms.entries()) createItem(term, i);
        pages.setOverview.btnLike.addEventListener("click", async () => {
            if (!auth.currentUser) {
                localStorage.setItem("redirect_after_login", location.href);
                location.href = "/#login";
            } else if (socialRef) {
                let currentLikeStatus = pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText === "favorite";
                await setDoc(socialRef, { like: !currentLikeStatus, name: auth.currentUser.displayName }, { merge: true });
                showLikeStatus(!currentLikeStatus);
            }
        });
        pages.setOverview.commentsContainer.parentElement.addEventListener("toggle", async () => { // TODO modularize
            let comments = await getDocs(query(collection(setRef, "social"), orderBy("comment")));
            comments.forEach(comment => createCommentCard(comment.data(), comment.id));
            if (auth.currentUser && !pages.setOverview.commentsContainer.querySelector(".mdc-text-field")) {
                createCommentCard({ name: auth.currentUser.displayName, comment: "" }, auth.currentUser.uid);
                pages.setOverview.fieldComment.input.valid = true;
            }
        }, { once: true });
        pages.setOverview.fieldComment.input.listen("change", () => pages.setOverview.fieldComment.button.disabled = false);
        pages.setOverview.fieldComment.button.addEventListener("click", async () => {
            if (auth.currentUser && (pages.setOverview.fieldComment.input.valid = pages.setOverview.fieldComment.input.valid)) {
                await setDoc(socialRef, { comment: pages.setOverview.fieldComment.input.value, name: auth.currentUser.displayName }, { merge: true });
                pages.setOverview.snackbarCommentSaved.open();
                pages.setOverview.fieldComment.button.disabled = true;
            }
        });
        location.hash = "#";
        location.hash = "#item-0";
        setTimeout(() => document.documentElement.scrollTo(0, 0), 100);
    } catch (err) {
        if (err.message.includes("Forbidden")) {
            localStorage.setItem("redirect_after_login", location.href);
            if (auth.currentUser) await auth.signOut();
            location.href = "/#login";
            return;
        } else window.sentryCaptureException?.call(globalThis, err)
    }
});

addEventListener("hashchange", () => {
    let possibleBtn = document.querySelector(`a[href="${location.hash}"]`);
    if (possibleBtn) selectNavButton(possibleBtn);
    document.documentElement.scrollTo(0, 0);
});