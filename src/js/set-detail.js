import { MDCCheckbox } from "@material/checkbox/index";
import { MDCCircularProgress } from "@material/circular-progress/index";
import { MDCDialog } from "@material/dialog/index";
import { MDCFormField } from "@material/form-field/index";
import { MDCList } from "@material/list/index";
import { MDCRadio } from "@material/radio/index";
import { MDCRipple } from "@material/ripple/index";
import { MDCTextField } from "@material/textfield/index";
import { MDCSnackbar } from "@material/snackbar/index";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, normalizeAnswer } from "./utils.js";
import { sanitize } from "dompurify";
import { marked } from "marked";
import { MDCIconButtonToggle } from "@material/icon-button";

class AccentKeyboard extends HTMLElement {
    constructor() {
        super();
    }
    get disabled() {
        return this.fieldset.disabled;
    }
    set disabled(value) {
        this.fieldset.disabled = value;
    }
    /**
     * Intialize accent keyboard with list of accents
     * @param {String[]} accents Accents to make buttons for
     * @param {HTMLInputElement} input Input to append accent to
     */
    initialize(accents, input) {
        this.accents = accents;
        this.input = input;
        if (this.isConnected) this.showButtons();
    }
    showButtons() {
        for (let specialChar of this.accents) {
            let btn = this.fieldset.appendChild(document.createElement("button"));
            btn.classList.add("mdc-button", "mdc-button--outlined");
            btn.appendChild(document.createElement("span")).classList.add("mdc-button__ripple");
            btn.appendChild(document.createElement("span")).classList.add("mdc-button__label");
            btn.lastElementChild.innerText = specialChar;
            btn.addEventListener("mousedown", e => {
                e.preventDefault();
                if (document.activeElement === this.input) {
                    let { selectionStart, selectionEnd } = this.input;
                    this.input.setRangeText(specialChar, selectionStart, selectionEnd, (selectionStart === selectionEnd) ? "end" : "preserve");
                }
                else this.input.value += specialChar;
            });
        }
    }
    clear() {
        this.fieldset.textContent = "";
    }
    connectedCallback() {
        this.fieldset = this.appendChild(document.createElement("fieldset"));
        if (this.accents) this.showButtons();
    }
}
class StarButton extends HTMLButtonElement {
    constructor() {
        super();
    }
    initialValue = false
    initialized = false
    /** @type {MDCIconButtonToggle?} */
    obj = null
    connectedCallback() {
        if (this.isConnected && !this.initialized) {
            this.initialized = true;
            this.classList.add("mdc-icon-button");
            this.ariaPressed = this.initialValue;
            this.appendChild(createElement("div", ["mdc-icon-button__ripple"]));
            this.appendChild(createElement("i", ["material-icons", "mdc-icon-button__icon", "mdc-icon-button__icon--on"], { innerText: "star" }));
            this.appendChild(createElement("i", ["material-icons", "mdc-icon-button__icon"], { innerText: "star_border" }));
            this.obj = new MDCIconButtonToggle(this);
            this.obj.on = this.initialValue;
        }
    }
}
customElements.define("accent-keyboard", AccentKeyboard);
customElements.define("star-button", StarButton, { extends: "button" });
const { db, auth } = initialize(async user => {
    if (user) {
        socialRef = doc(setRef, "social", user.uid);
        let socialDoc = await getDoc(socialRef);
        let userLikes = socialDoc.exists() ? socialDoc.data().like : false;
        showLikeStatus(userLikes);
    } else showLikeStatus(false);
});

const [, setType, setId] = decodeURIComponent(location.pathname).match(/\/(set|timeline)\/([\w ]+)\/view\/?/) || (location.pathname = "/");
const setRef = doc(db, "sets", setId);
/** @type {import("firebase/firestore/lite").DocumentReference<import("firebase/firestore/lite").DocumentData>?} */
let socialRef = null;
/** @type {DOMPurify.Config} */
const sanitizerOpts = { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] };
const accentsRE = /[^a-zA-Z0-9\s_\(\)\[\]!'"\.\/\\,-]/ig;
/** @type {{name: String, time: number, uid: String}[]?} */
let currentMatchLeaderboard = null;
/**
 * @type {{name: string, public: true, terms: {term: string, definition: string}[], uid: string}?}
 */
let currentSet = null;
let specialCharCollator = new Intl.Collator().compare;
let resizeTimeout;
window.StarredTerms = {
    getAllStarred() {
        return JSON.parse(localStorage.getItem("starred_terms")) || {};
    },
    getStarredTermList() {
        let starredIndices = this.getCurrentSet();
        return currentSet.terms.filter((_, i) => starredIndices.includes(i));
    },
    /**
     * @returns {Number[]} Indexes of starred terms
     */
    getCurrentSet() {
        return this.getAllStarred()[setId] || [];
    },
    saveStarredList(starList) {
        let orig = this.getAllStarred();
        orig[setId] = starList;
        localStorage.setItem("starred_terms", JSON.stringify(orig));
    },
    /**
     * Find out if a term in the current set is starred
     * @param {Number} termIndex Index of the term
     */
    isStarred(termIndex) {
        return this.getCurrentSet().includes(termIndex);
    },
    setStar(termIndex, isStarred) {
        let starList = this.getCurrentSet();
        let possibleIndex = starList.indexOf(termIndex);
        if (isStarred && possibleIndex === -1) starList.push(termIndex);
        else if (!isStarred && possibleIndex !== -1) starList.splice(possibleIndex, 1);
        this.saveStarredList(starList);
    },
    setStars(termIndexes, isStarred) {
        let starList = this.getCurrentSet();
        for (let termIndex of termIndexes) {
            let possibleIndex = starList.indexOf(termIndex);
            if (isStarred && possibleIndex === -1) starList.push(termIndex);
            else if (!isStarred && possibleIndex !== -1) starList.splice(possibleIndex, 1);
        }
        this.saveStarredList(starList);
    }
};
const pages = {
    setOverview: {
        el: document.getElementById("home"),
        name: document.querySelector("#home .field-name"),
        description: document.querySelector("#home .field-description"),
        numTerms: document.querySelector("#home .field-num-terms"),
        terms: document.querySelector("#home .field-terms"),
        btnLike: document.querySelector("#home .btn-like"),
        btnExportTerms: document.querySelector("#home .btn-export-terms"),
        commentsContainer: document.querySelector(".comments-container"),
        fieldComment: document.querySelector("#home .field-comment"),
        snackbarCommentSaved: new MDCSnackbar(document.querySelector("#snackbar-comment-saved")),
        modalExportTerms: new MDCDialog(document.querySelector("#modal-export-terms"))
    },
    flashcards: {
        el: document.getElementById("flashcards"),
        get index() {
            return parseInt(document.querySelector("#flashcards h1 > p > span").innerText);
        },
        set index(value) {
            if (value < 0 || value > this.numTerms) return;
            this.btnPrevious.disabled = (value === 0);
            this.btnNext.disabled = (value === this.numTerms);
            this.btnFlip.disabled = (value === this.numTerms);
            this.terms.querySelectorAll(".show").forEach(el => el.classList.remove("show"));
            let currentCard = this.terms.children[value];
            currentCard.classList.add("show");
            document.querySelector("#flashcards h1 > p > span").innerText = value;
        },
        nextCard() {
            this.btnPrevious.disabled = true;
            this.btnNext.disabled = true;
            this.btnFlip.disabled = true;
            this.terms.classList.add("switching");
            setTimeout(() => {
                this.terms.classList.remove("switching");
                this.index++;
            }, 400);
        },
        prevCard() {
            this.btnPrevious.disabled = true;
            this.btnNext.disabled = true;
            this.btnFlip.disabled = true;
            this.terms.classList.add("returning");
            setTimeout(() => {
                this.terms.classList.remove("returning");
                this.index--;
            }, 400);
        },
        getTermText(tIndex, side) {
            return this.terms.children[tIndex].querySelector(`:scope > div > div:nth-child(${side}) > p`);
        },
        get numTerms() {
            return parseInt(document.querySelector("#flashcards h1 > p > span:last-child").innerText);
        },
        set numTerms(value) {
            document.querySelector("#flashcards h1 > p > span:last-child").innerText = value;
        },
        setName: document.querySelector("#flashcards h1 > span"),
        terms: document.querySelector("#flashcards > div:nth-child(2) > div:last-child"),
        btnShuffle: document.querySelector("#flashcards > div > div:first-child .mdc-button--outlined"),
        btnPrevious: document.getElementById("btn-previous-flashcard"),
        btnNext: document.getElementById("btn-next-flashcard"),
        btnFlip: document.getElementById("btn-flip-flashcard"),
        radioBtns: document.querySelectorAll("#flashcards .answer-with"),
        /** @type {MDCCheckbox} */
        checkOnlyStarred: document.querySelector("#flashcards .check-starred"),
        onKeyUp(e) {
            if (e.key === "ArrowRight") this.btnNext.click();
            else if (e.key === "ArrowLeft") this.btnPrevious.click();
            else if (e.key === " ") {
                e.preventDefault();
                this.btnFlip.click();
            }
        },
        createFlashcard({ term, definition, i }) {
            let cardEl = document.createElement("div");
            let cardInner = cardEl.appendChild(document.createElement("div"));
            let cardFront = cardInner.appendChild(document.createElement("div"));
            let cardBack = cardInner.appendChild(document.createElement("div"));
            cardFront.appendChild(applyStyling(term.replace("\x00", " - "), document.createElement("p")));
            if (setType === "timeline" && definition.includes("\x00")) cardBack.appendChild(document.createElement("p")).appendChild(document.createElement("ul")).append(...definition.split("\x00").map(el => applyStyling(el, document.createElement("li"))));
            else cardBack.appendChild(applyStyling(definition, document.createElement("p")));
            if (this.checkOnlyStarred.checked || window.StarredTerms.isStarred(i)) {
                cardEl.style.color = "goldenrod";
                cardEl.firstElementChild.style.boxShadow = "0 0 4px #d7a21faa";
            }
            return this.terms.appendChild(cardEl);
        },
        show(shuffleA=false) {
            let terms = currentSet.terms.map((el, i) => ({i, ...el}));
            if (this.checkOnlyStarred.checked) terms = window.StarredTerms.getStarredTermList();
            this.numTerms = terms.length;
            this.setName.innerText = currentSet.name;
            this.terms.textContent = "";
            if (shuffleA) {
                terms = [...terms];
                shuffle(terms);
            }
            for (let term of terms) this.createFlashcard(term);
            this.createFlashcard({ term: "All done!\nYou've studied all of the flashcards.", definition: "All done!\nYou've studied all of the flashcards." }, -1);
            this.index = 0;
            this.terms.children[0].querySelectorAll("p").forEach(el => {
                el.style.fontSize = "100px";
                resizeText(el);
            });
        },
        init() {
            document.querySelectorAll("#flashcards > div:last-child .mdc-button").forEach(el => MDCRipple.attachTo(el));
            this.radioBtns = [...this.radioBtns].map(el =>
                MDCFormField.attachTo(el).input = new MDCRadio(el.querySelector(".mdc-radio"))
            );
            this.checkOnlyStarred = (MDCFormField.attachTo(this.checkOnlyStarred).input = new MDCCheckbox(this.checkOnlyStarred.querySelector(".mdc-checkbox")));
            this.checkOnlyStarred.listen("change", () => this.show());
            this.btnShuffle.addEventListener("click", () => this.show(true));
            this.btnPrevious.addEventListener("click", () => {
                this.terms.classList.toggle("flipped", this.radioBtns[0].checked);
                this.prevCard();
            });
            this.btnNext.addEventListener("click", () => {
                this.terms.classList.toggle("flipped", this.radioBtns[0].checked);
                if (this.index < this.numTerms) {
                    this.terms.children[this.index + 1].querySelectorAll("p").forEach(el => {
                        el.style.fontSize = "100px";
                        resizeText(el);
                    });
                }
                this.nextCard();
            });
            this.btnFlip.addEventListener("click", () => this.terms.classList.toggle("flipped"));
            this.terms.addEventListener("click", () => this.btnFlip.click());
        }
    },
    learn: {
        el: document.getElementById("learn"),
        progressMC_: 0,
        progressSA_: 0,
        questionData: [],
        get progressMC() {
            return this.progressMC_;
        },
        set progressMC(value) {
            this.progressMC_ = value;
            this.progressIndicators[0].progress = value / this.numTerms;
            this.progressIndicators[0].root.dataset.progress = `${(value * 100 / this.numTerms).toFixed(0)}%`;
        },
        get progressSA() {
            return this.progressSA_;
        },
        set progressSA(value) {
            this.progressSA_ = value;
            this.progressIndicators[1].progress = value / this.numTerms;
            this.progressIndicators[1].root.dataset.progress = `${(value * 100 / this.numTerms).toFixed(0)}%`;
        },
        get numTerms() {
            return parseInt(document.getElementById("learn-num-terms").innerText);
        },
        set numTerms(value) {
            document.getElementById("learn-num-terms").innerText = value;
        },
        get questionType() {
            return (this.radioBtns[0].checked) ? "definition" : "term";
        },
        get answerType() {
            return (this.radioBtns[1].checked) ? "definition" : "term";
        },
        /** @type {MDCCheckbox} */
        checkOnlyStarred: document.querySelector("#learn .check-starred"),
        setName: document.querySelector("#learn h1 > span"),
        question: document.querySelector("#learn > div > div:last-child p"),
        answerSA: new MDCTextField(document.querySelector("#learn .mdc-text-field")),
        answerSABtns: (/** @type {AccentKeyboard} */ (document.querySelector("#learn accent-keyboard"))),
        answerSACheck: MDCRipple.attachTo(document.querySelector("#learn .mdc-text-field + button")).root,
        answerMC: document.querySelector("#learn > div > div:last-child > fieldset"),
        msgCorrect: document.querySelector("#learn .answer-correct"),
        msgIncorrect: document.querySelector("#learn .answer-incorrect"),
        msgIdle: document.querySelector("#learn > div > div:last-child > div:nth-child(2) > p"),
        msgDone: document.querySelector("#learn > div > div:last-child > div:nth-child(2) > p:nth-child(2)"),
        radioBtns: document.querySelectorAll("#learn .answer-with"),
        progressIndicators: (/** @type {MDCCircularProgress[]} */ (document.querySelectorAll("#learn .mdc-circular-progress"))),
        currentQuestionIndex: 0,
        /**
         * @param {KeyboardEvent} e
         */
        onKeyUp(e) {
            if (this.msgIdle.hidden && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) this.generateQuestion();
            else if (!this.answerMC.hidden && !this.answerMC.disabled) this.answerMC.elements[parseInt(e.key) - 1]?.click();
        },
        show() {
            this.questionData = currentSet.terms.map((_, i) => ({ i, mc: 1, fmc: 0, sa: 1, fsa: 0 }));
            if (this.checkOnlyStarred.checked && window.StarredTerms.getCurrentSet().length) this.questionData = this.questionData.filter(({ i }) => window.StarredTerms.isStarred(i));
            this.setName.innerText = currentSet.name;
            this.msgDone.hidden = true;
            this.numTerms = this.questionData.length;
            this.progressMC = 0;
            this.progressSA = 0;
            this.generateQuestion();
            this.answerSABtns.clear();
            this.answerSABtns.initialize(currentSet.specials, this.answerSA.root.querySelector("input"));
        },
        generateQuestion() {
            let mcQuestions = this.questionData.filter(el => el.mc > 0);
            let saQuestions = this.questionData.filter(el => el.sa > 0);
            if (mcQuestions.length > 0) {
                let question = mcQuestions[Math.floor(Math.random() * mcQuestions.length)];
                this.currentQuestionIndex = this.questionData.indexOf(question);
                let term = currentSet.terms[question.i];
                let answers = getRandomChoices(3, currentSet.terms.length, question.i);
                this.showQuestion(term, answers);
            } else if (saQuestions.length > 0) {
                let question = saQuestions[Math.floor(Math.random() * saQuestions.length)];
                this.currentQuestionIndex = this.questionData.indexOf(question);
                let term = currentSet.terms[question.i];
                this.showQuestion(term);
            } else {
                this.question.innerText = "All done!";
                this.answerMC.hidden = true;
                this.answerSA.root.hidden = true;
                this.answerSABtns.hidden = true;
                this.answerSACheck.hidden = true;
                this.msgCorrect.hidden = true;
                this.msgIncorrect.hidden = true;
                this.msgIdle.hidden = true;
                this.msgDone.hidden = false;
            }
        },
        showQuestion(term, answers = null) {
            document.querySelectorAll(".mdc-ripple-upgraded--background-focused").forEach(el => el.classList.remove("mdc-ripple-upgraded--background-focused"));
            applyStyling(term[this.answerType], this.msgIncorrect.querySelector("strong"));
            applyStyling(term[this.answerType], this.msgCorrect.querySelector("strong"));
            this.msgCorrect.hidden = true;
            this.msgIncorrect.hidden = true;
            this.msgIdle.hidden = false;
            if (answers) {
                this.answerMC.hidden = false;
                this.answerSA.root.hidden = true;
                this.answerSABtns.hidden = true;
                this.answerSACheck.hidden = true;
                this.answerMC.disabled = false;
                answers.forEach((answer, i) => {
                    let btn = this.answerMC.elements[i];
                    let ansTerm = currentSet.terms[answer];
                    applyStyling(ansTerm[this.answerType], btn.querySelector(".mdc-button__label"));
                    resizeButtonText(btn);
                    btn.dataset.answerindex = answer;
                });
            } else {
                this.answerMC.hidden = true;
                this.answerSA.root.hidden = false;
                this.answerSABtns.hidden = false;
                this.answerSACheck.hidden = false;
                this.answerSA.disabled = false;
                this.answerSABtns.disabled = false;
                this.answerSACheck.disabled = false;
                this.answerSA.value = "";
                this.answerSA.valid = true;
                this.answerSA.focus();
            }

            this.question.innerText = "";
            let height = this.question.clientHeight;
            applyStyling(term[this.questionType], this.question);
            resizeTextToMaxHeight(this.question, height);
            this.question.style.color = (window.StarredTerms.isStarred(this.questionData[this.currentQuestionIndex].i)) ? "goldenrod" : "unset";
        },
        processMCResult(answer) {
            this.answerMC.disabled = true;
            this.msgIdle.hidden = true;
            if (answer === this.questionData[this.currentQuestionIndex].i) {
                this.msgCorrect.hidden = false;
                this.questionData[this.currentQuestionIndex].mc--;
                this.progressMC++;
            } else {
                this.msgIncorrect.hidden = false;
                if (++this.questionData[this.currentQuestionIndex].mc > 4) window.StarredTerms.setStar(this.currentQuestionIndex, true);
                this.questionData[this.currentQuestionIndex].fmc++;
                this.progressMC--;
            }
        },
        processSAResult() {
            if (!(this.answerSA.valid = this.answerSA.valid)) return;
            let answer = this.answerSA.value;
            document.activeElement.blur();
            this.answerSA.disabled = true;
            this.answerSABtns.disabled = true;
            this.answerSACheck.disabled = true;
            this.msgIdle.hidden = true;
            if (checkAnswers(answer, currentSet.terms[this.questionData[this.currentQuestionIndex].i][this.answerType])) {
                this.msgCorrect.hidden = false;
                this.questionData[this.currentQuestionIndex].sa--;
                this.progressSA++;
            } else {
                this.msgIncorrect.hidden = false;
                if (++this.questionData[this.currentQuestionIndex].sa > 4) window.StarredTerms.setStar(this.currentQuestionIndex, true);
                this.questionData[this.currentQuestionIndex].fsa++;
                this.progressSA--;
            }
        },
        overrideCorrect() {
            if (this.answerSA.root.hidden) {
                this.questionData[this.currentQuestionIndex].mc -= 2;
                this.questionData[this.currentQuestionIndex].fmc--;
                this.progressMC += 2;
            } else {
                this.questionData[this.currentQuestionIndex].sa -= 2;
                this.questionData[this.currentQuestionIndex].fsa--;
                this.progressSA += 2;
            }
            this.generateQuestion();
        },
        showResults() {
            let processedResults = this.questionData.filter(el => el.fmc > 0 || el.fsa > 0).map(el => [el.i, `${currentSet.terms[el.i].term} - ${currentSet.terms[el.i].definition}`, `You missed ${el.fmc} multiple choice question(s) and ${el.fsa} short answer.`]).sort((a, b) => (b[1] + b[2]) - (a[1] + a[2]));
            window.temp_learnResults = { setName: currentSet.name, results: processedResults };
            open("/learn-results.html", "learn-results-context", "popup,width=900,height=500");
        },
        init() {
            MDCRipple.attachTo(this.msgDone.querySelector("button"));
            this.radioBtns = [...this.radioBtns].map(el => {
                el.addEventListener("change", () => this.generateQuestion());
                return MDCFormField.attachTo(el).input = new MDCRadio(el.querySelector(".mdc-radio"));
            });
            this.progressIndicators = [...this.progressIndicators].map(el =>
                new MDCCircularProgress(el)
            );
            for (let btn of this.answerMC.elements) {
                btn.addEventListener("click", () => this.processMCResult(parseInt(btn.dataset.answerindex)));
                MDCRipple.attachTo(btn);
            }
            this.checkOnlyStarred = (MDCFormField.attachTo(this.checkOnlyStarred).input = new MDCCheckbox(this.checkOnlyStarred.querySelector(".mdc-checkbox")));
            this.checkOnlyStarred.listen("change", () => this.show());
            this.msgCorrect.addEventListener("click", () => this.generateQuestion());
            this.msgIncorrect.addEventListener("click", () => this.generateQuestion());
            this.answerSACheck.addEventListener("click", () => this.processSAResult());
            this.answerSA.root.addEventListener("keyup", e => {
                if (e.key === "Enter") {
                    e.stopPropagation();
                    this.answerSACheck.click();
                }
            });
            this.msgDone.querySelector("button").addEventListener("click", () => this.showResults());
            this.msgIncorrect.querySelector("button").addEventListener("click", e => {
                e.stopPropagation();
                this.overrideCorrect()
            });
        }
    },
    test: {
        el: document.getElementById("test"),
        setName: document.querySelector("#test h1 > span"),
        btnNew: document.querySelector("#test > div > div:first-child .mdc-button--outlined"),
        btnCheck: document.querySelector("#test > div > div:first-child .mdc-button--raised"),
        radioBtns: document.querySelectorAll("#test .answer-with"),
        /** @type {MDCCheckbox[]} */
        checkboxes: document.querySelectorAll("#test .check-test-question-types"),
        questionTypeHeaders: document.querySelectorAll("#test > div > fieldset > h2"),
        questionContainers: document.querySelectorAll("#test > div > fieldset > div"),
        questionsFieldset: document.querySelector("#test > div > fieldset"),
        currentMatchMode: 0,
        /** @type {MDCCheckbox} */
        checkOnlyStarred: document.querySelector("#test .check-starred"),
        /** @type {MDCTextField} */
        fieldMaxTerms: document.querySelector("#test .field-max-terms"),
        get questionType() {
            return (this.radioBtns[0].checked) ? "definition" : "term";
        },
        get answerType() {
            return (this.radioBtns[1].checked) ? "definition" : "term";
        },
        get userMaxQuestions() {
            return Math.max(parseInt(this.fieldMaxTerms.value), 0);
        },
        questionInputs: {
            sa: [],
            mc: [],
            tf: []
        },
        show() {
            this.setName.innerText = currentSet.name;
            this.generateQuestions();
        },
        makeSAQuestion(question) {
            let isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            let helperTextId = `_${crypto.randomUUID()}`;
            let questionEl = applyStyling(question[this.questionType], this.questionContainers[0].appendChild(createElement("p", ["mdc-typography--body1"])));
            questionEl.style.margin = "0";
            questionEl.style.marginBottom = "4px";
            if (isStarred) questionEl.style.color = "goldenrod";
            let textFieldEl = this.questionContainers[0].appendChild(createElement("label", ["mdc-text-field", "mdc-text-field--outlined"], {}, [
                createElement("span", ["mdc-notched-outline"], {}, [
                    createElement("span", ["mdc-notched-outline__leading"], {}, []),
                    createElement("span", ["mdc-notched-outline__notch"], {}, [
                        createElement("span", ["mdc-floating-label"], { innerText: "Answer" }, [])
                    ]),
                    createElement("span", ["mdc-notched-outline__trailing"], {}, [])
                ]),
                createElement("input", ["mdc-text-field__input"], { "aria-label": "Answer", type: "text", "aria-controls": helperTextId, "aria-describedby": helperTextId }, [])
            ]));
            textFieldEl.style.marginBottom = "0";
            this.questionContainers[0].appendChild(createElement("div", ["mdc-text-field-helper-line"], {}, [
                createElement("div", ["mdc-text-field-helper-text", "mdc-text-field-helper-text--persistent"], { id: helperTextId }, [])
            ])).style.marginBottom = "1rem";
            let accentKeyboard = this.questionContainers[0].appendChild(document.createElement("accent-keyboard"));
            accentKeyboard.initialize(currentSet.specials, textFieldEl.querySelector("input"))
            let textField = new MDCTextField(textFieldEl);
            textField.required = true;
            return textField;
        },
        makeMCQuestion(question, answers, container = 1, customQuestion = null) {
            let isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            let radioName = `_${crypto.randomUUID()}`;
            let answerRadios = answers.map((answer, i) => {
                let el = createElement("div", [], {}, [
                    createElement("div", ["mdc-form-field"], {}, [
                        createElement("div", ["mdc-radio", "mdc-radio--touch"], {}, [
                            createElement("input", ["mdc-radio__native-control"], { type: "radio", id: `${radioName}-${i}`, name: radioName, required: true }, []),
                            createElement("div", ["mdc-radio__background"], {}, [
                                createElement("div", ["mdc-radio__outer-circle"], {}, []),
                                createElement("div", ["mdc-radio__inner-circle"], {}, [])
                            ]),
                            createElement("div", ["mdc-radio__ripple"], {}, [])
                        ]),
                        createElement("label", [], { htmlFor: `${radioName}-${i}` }, [])
                    ])
                ]);
                applyStyling(answer, el.querySelector("label"));
                return el;
            });
            let questionContainer = this.questionContainers[container].appendChild(createElement("div", [], {}, [
                createElement("h3", ["mdc-typography--headline5"], {}, []),
                ...answerRadios
            ]));
            if (isStarred) questionContainer.querySelector("h3").style.color = "goldenrod";
            applyStyling(customQuestion || question[this.questionType], questionContainer.querySelector("h3"));
            questionContainer.firstElementChild.style.marginBottom = "0";
            return answerRadios.map(formField => MDCFormField.attachTo(formField).input = new MDCRadio(formField.querySelector(".mdc-radio")));
        },
        makeMTQuestion(question) {
            let isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            let questionUUID = crypto.randomUUID();
            let div1 = applyStyling(question[this.questionType], this.questionContainers[2].querySelector(":scope > div:first-child").appendChild(createElement("div", ["test-matching-box", "left"], {}, [])));
            div1.dataset.questionId = questionUUID;
            if (isStarred) div1.style.color = "goldenrod";
            let div2 = applyStyling(question[this.answerType], this.questionContainers[2].querySelector(":scope > div:nth-child(2)").appendChild(createElement("div", ["test-matching-box", "right"], {}, [])));
            div2.dataset.questionId = questionUUID;
        },
        matchEls(div1, div2) {
            let off1 = getOffset(div1);
            let off2 = getOffset(div2);
            let x1 = off1.left + off1.width;
            let y1 = off1.top + off1.height / 2;
            let x2 = off2.left;
            let y2 = off2.top + off2.height / 2;
            let length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); //distance formula
            let cx = (x1 + x2 - length) / 2; // center
            let cy = (y1 + y2 - 4) / 2;
            let angle = Math.atan2(y1 - y2, x1 - x2) * 180 / Math.PI; // angle in degrees
            let match = this.questionContainers[2].querySelector(".matches-container").appendChild(document.createElement("div"));
            match.dataset.fromCard = div1.dataset.questionId;
            match.dataset.toCard = div2.dataset.questionId;
            match.style.setProperty("--left", `${cx}px`);
            match.style.setProperty("--top", `${cy}px`);
            match.style.setProperty("--length", `${length}px`);
            match.style.setProperty("--angle", `${angle}deg`);
        },
        rematchEls(matchEl) {
            let leftEl = document.querySelector(`.test-matching-box.left[data-question-id='${matchEl.dataset.fromCard}']`);
            let rightEl = document.querySelector(`.test-matching-box.right[data-question-id='${matchEl.dataset.toCard}']`);
            if (!leftEl || !rightEl) return;
            matchEl.remove();
            this.matchEls(leftEl, rightEl);
        },
        onResize() {
            this.questionContainers[2].querySelectorAll(".matches-container > div").forEach(el => this.rematchEls(el));
        },
        randomizeMatchOptions() {
            let container = this.questionContainers[2].querySelector(":scope > div:nth-child(2)");
            for (let i = container.children.length; i >= 0; i--) container.appendChild(container.children[Math.random() * i | 0]);
        },
        generateQuestions() {
            this.btnCheck.disabled = false;
            this.btnCheck.querySelector(".mdc-button__label").innerText = "Check Answers";
            this.questionContainers[0].textContent = this.questionContainers[1].textContent = this.questionContainers[3].textContent = "";
            this.questionContainers[2].querySelectorAll(":scope > div").forEach(el => el.textContent = "");
            this.questionTypeHeaders.forEach(el => el.dataset.count = 0);
            let groupTypes = this.checkboxes.map(el => el.checked);
            let terms = currentSet.terms;
            let numGroups = groupTypes.filter(el => el).length;
            if (this.checkOnlyStarred.checked && window.StarredTerms.getStarredTermList().length >= numGroups) terms = window.StarredTerms.getStarredTermList();
            this.termList = terms;
            let groups = makeRandomGroups(terms.length, numGroups, this.userMaxQuestions);
            this.questionInputs = { sa: [], mc: [], tf: [] };
            if (groupTypes[0] && groups[0]?.length) {
                let group = groups.shift();
                this.questionInputs.sa = group.map(el => ({ input: this.makeSAQuestion(terms[el]), answer: terms[el][this.answerType] }));
                this.questionTypeHeaders[0].dataset.count = group.length;
            }

            if (groupTypes[1] && groups[0]?.length) {
                let group = groups.shift();
                this.questionInputs.mc = group.map(el => {
                    let choices = getRandomChoices(3, terms.length, el);
                    return ({ inputs: this.makeMCQuestion(terms[el], choices.map(choice => terms[choice][this.answerType])), answer: choices.indexOf(el) });
                });
                this.questionTypeHeaders[1].dataset.count = group.length;
            }

            if (groupTypes[2] && groups[0]?.length) {
                let group = groups.shift();
                group.forEach(el => this.makeMTQuestion(terms[el]));
                this.randomizeMatchOptions();
                this.questionTypeHeaders[2].dataset.count = group.length;
                document.querySelectorAll(".test-matching-box").forEach(box => box.addEventListener("click", this.matchingBoxClickListener));
            }

            if (groupTypes[3] && groups[0]?.length) {
                let group = groups.shift();
                this.questionInputs.tf = group.map(el => {
                    let choiceIsCorrect = Math.random() < 0.5;
                    let answer = terms[el][this.answerType];
                    if (!choiceIsCorrect) {
                        let newAnswer = terms[Math.floor(Math.random() * terms.length)][this.answerType];
                        if (newAnswer === answer) choiceIsCorrect = true;
                        else answer = newAnswer;
                    }
                    let question = `${terms[el][this.questionType]} = ${answer}`;
                    return ({ inputs: this.makeMCQuestion(terms[el], ["True", "False"], 3, question), answer: choiceIsCorrect });
                });
                this.questionTypeHeaders[3].dataset.count = group.length;
            }
            this.questionsFieldset.disabled = false;
            this.currentMatchMode = 0;
        },
        checkAnswers() {
            for (let sa of this.questionInputs.sa) {
                if (!sa.input.valid) {
                    sa.input.valid = false; //trigger :invalid psuedoclass
                    return;
                }
            }
            for (let mc of this.questionInputs.mc) if (!mc.inputs[0].nativeControl.reportValidity()) return;
            for (let tf of this.questionInputs.tf) if (!tf.inputs[0].nativeControl.reportValidity()) return;
            this.questionsFieldset.disabled = true;
            document.querySelectorAll(".test-matching-box").forEach(box => box.removeEventListener("click", this.matchingBoxClickListener));
            let numCorrect = 0;
            for (let sa of this.questionInputs.sa) {
                if (checkAnswers(sa.input.value, sa.answer)) {
                    sa.input.root.classList.add("correct");
                    sa.input.helperTextContent = "Correct!";
                    numCorrect++;
                } else {
                    sa.input.root.classList.add("incorrect");
                    sa.input.helperTextContent = `Incorrect -> ${normalizeAnswer(sa.answer)}`;
                }
            }
            for (let mc of this.questionInputs.mc) {
                let correctAnswer = mc.inputs[mc.answer];
                numCorrect += correctAnswer.checked; // implicit cast
                mc.inputs.find(el => el.checked).root.classList.toggle("incorrect", !correctAnswer.checked);
                correctAnswer.root.classList.add("correct");
            }
            for (let match of document.querySelectorAll(".matches-container > div")) {
                let isCorrect = match.dataset.fromCard === match.dataset.toCard;
                numCorrect += isCorrect;
                match.classList.add(isCorrect ? "correct" : "incorrect");
            }
            for (let tf of this.questionInputs.tf) {
                let selectedInput = tf.inputs.find(el => el.checked);
                let correctAnswer = tf.inputs[tf.answer ? 0 : 1];
                correctAnswer.root.classList.add("correct");
                if (selectedInput !== correctAnswer) selectedInput.root.classList.add("incorrect");
                else numCorrect++;
            }
            let total = Math.max(Math.min(this.termList.length, this.userMaxQuestions), 1);
            let percentCorrect = Math.round(numCorrect * 100 / total);
            this.btnCheck.disabled = true;
            this.btnCheck.classList.remove("mdc-ripple-upgraded--background-focused");
            this.btnCheck.querySelector(".mdc-button__label").innerText = `${percentCorrect}%`;
        },
        matchingBoxClickListener(e) {
            switch (pages.test.currentMatchMode) {
                case 0: {
                    let otherEl = null;
                    let direction = null;
                    if (e.currentTarget.classList.contains("left")) {
                        pages.test.currentMatchMode = 1;
                        otherEl = "right";
                        direction = "from";
                    } else if (e.currentTarget.classList.contains("right")) {
                        pages.test.currentMatchMode = 2;
                        otherEl = "left";
                        direction = "to";
                    } else return;
                    pages.test.questionContainers[2].classList.add("selecting");
                    let possibleMatch = document.querySelector(`.matches-container > div[data-${direction}-card="${e.currentTarget.dataset.questionId}"]`);
                    if (possibleMatch) {
                        let rightEl = document.querySelector(`.test-matching-box.${otherEl}.chosen[data-question-id="${possibleMatch.dataset.toCard}"]`);
                        rightEl?.classList.remove("chosen");
                        possibleMatch.remove();
                    }
                    for (let el of document.querySelectorAll(".test-matching-box.selected")) {
                        el.classList.remove("selected");
                        if (el === e.currentTarget) {
                            pages.test.questionContainers[2].classList.remove("selecting");
                            e.currentTarget.classList.remove("chosen");
                            pages.test.currentMatchMode = 0;
                            return;
                        }
                    };
                    e.currentTarget.classList.add("selected");
                    e.currentTarget.classList.remove("chosen");
                    break;
                }
                case 1:
                case 2: {
                    let other = null;
                    let direction = null;
                    let otherDirection = null;
                    let leftEl = document.querySelector(".test-matching-box.left.selected");
                    let rightEl = document.querySelector(".test-matching-box.right.selected");
                    let el;
                    if (pages.test.currentMatchMode === 1 && leftEl && e.currentTarget.classList.contains("right")) {
                        other = "left";
                        direction = "to";
                        otherDirection = "from";
                        el = leftEl;
                    } else if (pages.test.currentMatchMode === 2 && rightEl && e.currentTarget.classList.contains("left")) {
                        other = "right";
                        direction = "from";
                        otherDirection = "to";
                        el = rightEl;
                    } else return;
                    pages.test.questionContainers[2].classList.remove("selecting");
                    let possibleMatch = document.querySelector(`.matches-container > div[data-${direction}-card="${e.currentTarget.dataset.questionId}"]`);
                    if (possibleMatch) {
                        let pLeftEl = document.querySelector(`.test-matching-box.${other}.chosen[data-question-id="${possibleMatch.dataset[`${otherDirection}Card`]}"]`);
                        pLeftEl?.classList.remove("chosen");
                        possibleMatch.remove();
                    }
                    document.querySelector(`.matches-container > div[data-${direction}-card="${e.currentTarget.dataset.questionId}"]`)?.remove();
                    el.classList.remove("selected");
                    if (pages.test.currentMatchMode === 1) pages.test.matchEls(el, e.currentTarget); else pages.test.matchEls(e.currentTarget, el);
                    el.classList.add("chosen");
                    e.currentTarget.classList.add("chosen");
                    pages.test.currentMatchMode = 0;
                    break;
                }
            }
        },
        init() {
            document.querySelectorAll("#test .mdc-button").forEach(el => MDCRipple.attachTo(el));
            this.radioBtns = [...this.radioBtns].map(el =>
                MDCFormField.attachTo(el).input = new MDCRadio(el.querySelector(".mdc-radio"))
            );
            this.checkboxes = [...this.checkboxes].map(el =>
                MDCFormField.attachTo(el).input = new MDCCheckbox(el.querySelector(".mdc-checkbox"))
            );
            this.checkOnlyStarred = (MDCFormField.attachTo(this.checkOnlyStarred).input = new MDCCheckbox(this.checkOnlyStarred.querySelector(".mdc-checkbox")));
            this.fieldMaxTerms = new MDCTextField(this.fieldMaxTerms);
            this.fieldMaxTerms.value = "20";
            this.checkboxes.forEach(el => el.checked = true);
            this.btnNew.addEventListener("click", () => this.generateQuestions());
            this.btnCheck.addEventListener("click", () => this.checkAnswers());
        }
    },
    match: {
        el: document.getElementById("match"),
        setName: document.querySelector("#match h1 > span"),
        btnNew: document.querySelectorAll("#match .btn-refresh"),
        radioBtns: document.querySelectorAll("#match .answer-with"),
        termsContainer: document.querySelector("#match > div > div:last-child"),
        completedDialog: new MDCDialog(document.getElementById("modal-match-done")),
        completedDialogList: new MDCList(document.querySelector("#modal-match-done ul")),
        fieldTime: document.querySelector("#match .field-time"),
        get questionType() {
            return (this.radioBtns[0].checked) ? "definition" : "term";
        },
        get answerType() {
            return (this.radioBtns[1].checked) ? "definition" : "term";
        },
        /** @type {MDCCheckbox} */
        checkOnlyStarred: document.querySelector("#match .check-starred"),
        onlyStarred: false,
        interval: null,
        dragEvents: {
            currentDragged: null,
            set currentClickDragged(el) {
                document.querySelectorAll(".draggable-card.selected").forEach(el => el.classList.remove("selected"));
                if (el)
                    el.classList.add("selected");
            },
            get currentClickDragged() {
                return document.querySelector(".draggable-card.selected");
            },
            start(e) {
                this.style.opacity = "0.6";
                e.dataTransfer.effectAllowed = "move";
                pages.match.dragEvents.currentDragged = this;
                pages.match.dragEvents.currentClickDragged = null;
            },
            end() {
                this.style.opacity = "1";
                document.querySelectorAll(".dropzone-card .over").forEach(el => el.classList.remove("over"));
                pages.match.dragEvents.currentClickDragged = null;
            },
            over(e) {
                e.preventDefault();
                return false;
            },
            enter() {
                this.querySelector("div:last-child").classList.add("over");
            },
            leave() {
                this.querySelector("div:last-child").classList.remove("over");
            },
            drop(e) {
                e.stopPropagation();
                e.preventDefault();
                if (this.querySelector("div:last-child").children[0]) pages.match.termsContainer.children[0].appendChild(this.querySelector("div:last-child").children[0]);
                this.querySelector("div:last-child").appendChild(pages.match.dragEvents.currentDragged);
                pages.match.checkAnswers();
                pages.match.dragEvents.currentClickDragged = null;
                return false;
            },
            dragClick(e) {
                e.stopPropagation();
                pages.match.dragEvents.currentDragged = null;
                pages.match.dragEvents.currentClickDragged = (pages.match.dragEvents.currentClickDragged === this) ? null : this;
            },
            dropClick() {
                if (pages.match.dragEvents.currentClickDragged) {
                    if (this.querySelector("div:last-child").children[0]) pages.match.termsContainer.children[0].appendChild(this.querySelector("div:last-child").children[0]);
                    this.querySelector("div:last-child").appendChild(pages.match.dragEvents.currentClickDragged);
                    pages.match.checkAnswers();
                    pages.match.dragEvents.currentDragged = null;
                    pages.match.dragEvents.currentClickDragged = null;
                }
            }
        },
        show() {
            this.setName.innerText = currentSet.name;
            this.generateCards();
        },
        makeDraggableCard(text, questionId, index) {
            let card = createElement("div", ["mdc-card", "draggable-card", "mdc-typography--button"], { draggable: true }, [
                createElement("div", ["mdc-card-wrapper__text-section"])
            ]);
            applyStyling(text, card.firstElementChild);
            card.dataset.questionId = questionId;
            card.addEventListener("dragstart", this.dragEvents.start);
            card.addEventListener("dragend", this.dragEvents.end);
            card.addEventListener("click", this.dragEvents.dragClick, true);
            if (this.onlyStarred || window.StarredTerms.isStarred(index)) card.style.backgroundColor = "goldenrod";
            return card;
        },
        makeDropzoneCard(text, questionId) {
            let card = createElement("div", ["mdc-card", "dropzone-card"], {}, [
                createElement("div", ["mdc-card-wrapper__text-section"]),
                createElement("div")
            ]);
            applyStyling(text, card.firstElementChild);
            card.dataset.questionId = questionId;
            card.addEventListener("dragover", this.dragEvents.over);
            card.addEventListener("dragenter", this.dragEvents.enter);
            card.addEventListener("dragleave", this.dragEvents.leave);
            card.addEventListener("drop", this.dragEvents.drop);
            card.addEventListener("click", this.dragEvents.dropClick);
            return card;
        },
        generateCards() {
            for (let el of this.termsContainer.children) el.textContent = "";
            let terms = currentSet.terms;
            if (this.checkOnlyStarred.checked) {
                terms = StarredTerms.getStarredTermList();
                this.onlyStarred = true;
            } else this.onlyStarred = false;
            let included = getRandomChoices(10, terms.length, null, true)
            this.startTime = Date.now();
            let leftCards = [];
            let rightCards = [];
            (this.questionType === "term") ?
                included.forEach(num => {
                    let { term, definition } = terms[num];
                    let id = `_${crypto.randomUUID()}`;
                    leftCards.push(this.makeDraggableCard(term, id, num));
                    rightCards.push(this.makeDropzoneCard(definition, id));
                }) :
                included.forEach(num => {
                    let { term, definition } = terms[num];
                    let id = `_${crypto.randomUUID()}`;
                    leftCards.push(this.makeDraggableCard(definition, id, num));
                    rightCards.push(this.makeDropzoneCard(term, id));
                });
            shuffle(rightCards);
            this.termsContainer.children[0].append(...leftCards);
            this.termsContainer.children[1].append(...rightCards);
            leftCards.forEach(el => resizeTextToMaxHeight(el, 100, 10));
            rightCards.forEach(el => resizeTextToMaxHeight(el, 100, 10));
            this.setTimer();
        },
        async checkAnswers() {
            this.termsContainer.querySelectorAll(".dropzone-card").forEach(el => el.style.border = (el.querySelector("div:last-child").children[0] && el.querySelector("div:last-child").children[0].dataset.questionId !== el.dataset.questionId) ? "1px solid red" : "none");
            for (let child of this.termsContainer.querySelectorAll(".dropzone-card")) {
                let id = child.dataset.questionId;
                let dropzone = child.querySelector("div:last-child");
                if (id && dropzone) {
                    if (id !== dropzone.children[0]?.dataset?.questionId) {
                        return;
                    }
                }
            }
            this.clearTimer();
            let totalTime = (Date.now() - this.startTime) / 1000;
            await this.showLeaderboard(totalTime);
            this.completedDialog.root.querySelector(".field-time-taken").innerText = totalTime.toFixed(2);
            this.completedDialog.open();
        },
        async showLeaderboard(time) {
            if (!currentMatchLeaderboard) {
                let l = await getDocs(query(collection(setRef, "social"), orderBy("leaderboard")));
                currentMatchLeaderboard = l.docs.map(el => {
                    let doc = el.data();
                    return { name: doc.name, time: doc.leaderboard, uid: el.id };
                });
            }
            if (!this.onlyStarred && auth.currentUser && socialRef) {
                let possibleExisting = currentMatchLeaderboard.find(el => el.uid === auth.currentUser.uid);
                if (possibleExisting) {
                    if (possibleExisting.time > time) possibleExisting.time = time;
                    else time = possibleExisting.time;
                } else currentMatchLeaderboard.push({ name: auth.currentUser.displayName, uid: auth.currentUser.uid, time });
                await setDoc(socialRef, { leaderboard: time, name: auth.currentUser.displayName, uid: auth.currentUser.uid }, { merge: true });
            }
            let actualLeaderboard = [...currentMatchLeaderboard];
            if (this.onlyStarred) actualLeaderboard.push({ name: "Play a full round to save!", time });
            else if (!auth.currentUser) actualLeaderboard.push({ name: "Sign in to save!", time });
            actualLeaderboard.sort((a, b) => a.time - b.time);
            this.completedDialogList.root.textContent = "";
            for (let [i, item] of actualLeaderboard.entries()) {
                this.completedDialogList.root.appendChild(createElement("li", ["mdc-list", "mdc-list-item--non-interactive", "mdc-list-item--with-two-lines"], {}, [
                    createElement("span", ["mdc-list-item__content"], {}, [
                        createElement("span", ["mdc-list-item__primary-text"], { innerText: `#${i + 1} ${item.name}` }),
                        createElement("span", ["mdc-list-item__secondary-text"], { innerText: `${item.time.toFixed(2)}s` })
                    ])
                ]));
            }
            this.completedDialogList.layout();
        },
        setTimer() {
            this.interval = setInterval(() => {
                if (location.hash === "#match" && !this.completedDialog.isOpen) {
                    let time = ((Date.now() - this.startTime) / 1000).toFixed(1);
                    this.fieldTime.innerText = time;
                }
            }, 100);
        },
        clearTimer() {
            clearInterval(this.interval);
        },
        init() {
            document.querySelectorAll("#test .mdc-button").forEach(el => MDCRipple.attachTo(el));
            this.radioBtns = [...this.radioBtns].map(el =>
                MDCFormField.attachTo(el).input = new MDCRadio(el.querySelector(".mdc-radio"))
            );
            this.btnNew.forEach(el => el.addEventListener("click", () => this.generateCards()));
            this.completedDialog.listen("MDCDialog:closing", e => {
                if (e.detail.action === "accept") this.generateCards();
                else history.back();
            });
            this.checkOnlyStarred = (MDCFormField.attachTo(this.checkOnlyStarred).input = new MDCCheckbox(this.checkOnlyStarred.querySelector(".mdc-checkbox")));
        }
    }
};

// #region UTILITIES
function resizeText(textEl) {
    let fontSize = parseFloat(getComputedStyle(textEl).fontSize);
    while (fontSize > 0 && (textEl.clientHeight >= textEl.parentElement.clientHeight)) textEl.style.fontSize = `${fontSize--}px`;
    textEl.style.fontSize = `${Math.max(fontSize - 5, 5)}px`;
}
function resizeButtonText(button, minSize = 1) {
    button.style.removeProperty("--mdc-outlined-button-label-text-size");
    let i = parseFloat(getComputedStyle(button)["font-size"]);
    let overflow = button.scrollHeight > button.getBoundingClientRect().height;
    while (overflow && i > minSize) {
        i--;
        button.style.setProperty("--mdc-outlined-button-label-text-size", `${i}px`);
        overflow = button.scrollHeight > button.getBoundingClientRect().height;
    }
}
function resizeTextToMaxHeight(textEl, maxHeight, minSize = 1) {
    textEl.style.fontSize = "";
    let i = 0;
    let initialSize = parseInt(getComputedStyle(textEl).fontSize);
    let currentHeight = null;
    while (i < 100 && currentHeight !== textEl.clientHeight && textEl.clientHeight > maxHeight && initialSize > minSize) {
        currentHeight = textEl.clientHeight;
        textEl.style.fontSize = `${Math.max(initialSize -= 2, minSize)}px`;
        i++;
    }
}
function applyStyling(text, el) {
    el.innerHTML = sanitize(marked.parseInline(text), setId === "ZEAuZPbTS5JlB1goITO5" ? {} : sanitizerOpts);
    return el;
}
/**
 * Makes a list of random numbers
 * @param {number} num The number of elements in the outputted list
 * @param {number} max 1 + the max any element in the list can be
 * @param {number?} numToInclude An optional number to include in the list
 * @param {boolean} canBeSmaller If the length of the outputted list can be smaller if max is not big enough
 * @returns {number[]}
 */
function getRandomChoices(num, max, numToInclude, canBeSmaller = false) {
    let nums = [];
    if (canBeSmaller) num = Math.min(num, max);
    if (num > max - ((numToInclude === null) ? 0 : 1)) return nums;
    for (let i = 0; i < 100000; i++) {
        if (nums.length >= num) break;
        let rand = Math.floor(Math.random() * max);
        if (!nums.includes(rand) && rand !== numToInclude) nums.push(rand);
    }
    if (numToInclude !== null) nums.splice(Math.floor(Math.random() * (num + 1)), 0, numToInclude);
    return nums;
}
function makeRandomGroups(max, numGroups, aMax) {
    let numIncluded = Math.min(aMax, max);
    let nums = getRandomChoices(numIncluded, max, null);
    let baseVal = Math.floor(numIncluded / numGroups);
    let extra = numIncluded % numGroups;
    let groups = Array(numGroups).fill(baseVal).fill(baseVal + 1, 0, extra).map(el => nums.splice(0, el));
    return groups;
}
function checkAnswers(answer, correct) {
    let cleanAnswer = normalizeAnswer(answer).toUpperCase();
    let possibleCorrect = [correct, correct.split(","), correct.split("/")].flat().map(el => el = normalizeAnswer(el).toUpperCase());
    return possibleCorrect.includes(cleanAnswer);
}
function getOffset(el) {
    let rect = el.getBoundingClientRect();
    return {
        left: el.offsetLeft,
        top: el.offsetTop,
        width: rect.width || el.offsetWidth,
        height: rect.height || el.offsetHeight
    };
}
function shuffle(arr) {
    let currentIndex = arr.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
}
// #endregion UTILITIES

// #region CARD GENERATION
function createTermCard({ term, definition }, index) {
    let cardEl = document.createElement("div");
    cardEl.classList.add("mdc-card", "mdc-card--outlined");
    let cardHeading = cardEl.appendChild(document.createElement("div"));
    cardHeading.classList.add("mdc-card-wrapper__text-section");
    let cardTitle = cardHeading.appendChild(document.createElement("div"));
    cardTitle.classList.add("mdc-typography--headline6");
    cardTitle.style.fontWeight = "600";
    applyStyling(term.replace("\x00", " - "), cardTitle);
    let starButton = (/** @type {StarButton} */ (cardTitle.appendChild(document.createElement("button", { is: "star-button" }))));
    starButton.initialValue = window.StarredTerms.isStarred(index);
    if (setType === "timeline") {
        cardHeading.appendChild(document.createElement("ul")).append(...definition.split("\x00").map(el => applyStyling(el, document.createElement("li"))));
        cardEl.classList.add("timeline-piece")
    } else applyStyling(definition, cardHeading.appendChild(document.createElement("div")));
    pages.setOverview.terms.appendChild(cardEl);
    starButton.obj.listen("MDCIconButtonToggle:change", e => window.StarredTerms.setStar(index, e.detail.isOn));
    return cardEl;
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
        cardText.innerHTML = sanitize(marked.parseInline(comment), { FORBID_ATTR: ["style"] });
        cardText.style.overflowWrap = "break-word";
        if (like) cardText.appendChild(createElement("span", ["likes-badge"], { innerText: `${name} likes this set` }));
    }
    return pages.setOverview.commentsContainer.appendChild(cardEl);
}
// #endregion
function navigate() {
    switch (location.hash) {
        case "#flashcards":
            pages.flashcards.show();
            break;
        case "#learn":
            pages.learn.show();
            break;
        case "#test":
            pages.test.show()
            break;
        case "#match":
            pages.match.show();
            break;
    }
}
function showLikeStatus(likeStatus) {
    if (likeStatus) {
        pages.setOverview.btnLike.querySelector(".mdc-button__label").innerText = "Unlike";
        pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText = "favorite";
    } else {
        pages.setOverview.btnLike.querySelector(".mdc-button__label").innerText = "Like";
        pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText = "favorite_border";
    }
}

addEventListener("DOMContentLoaded", async () => {
    pages.flashcards.init();
    pages.learn.init();
    pages.test.init();
    pages.match.init();
    pages.setOverview.fieldComment.input = new MDCTextField(pages.setOverview.fieldComment.querySelector("label"));
    pages.setOverview.fieldComment.button = new MDCRipple(pages.setOverview.fieldComment.querySelector("button")).root;
    if (setType === "timeline") {
        pages.setOverview.terms.style.justifyContent = "left";
        document.querySelectorAll(".study-modes :is(a, button):not([href='#flashcards'])").forEach(el => {
            el.style.pointerEvents = "none";
            el.style.opacity = 0.5;
        }); // TODO other study modes
    }
    try {
        let setSnap = await getDoc(setRef);
        if (!setSnap.exists()) return location.href = "/404";
        currentSet = setSnap.data();
        currentSet.terms.forEach(term => {
            term.term = term.term.replace(/[\u2018\u2019]/g, "'");
            term.definition = term.definition.replace(/[\u2018\u2019]/g, "'");
        });
        currentSet.specials = currentSet.terms.map(el => [[...el.term.matchAll(accentsRE)].map(el => el[0]), [...el.definition.matchAll(accentsRE)].map(el => el[0])]).flat(2);
        currentSet.specials = currentSet.specials.concat(currentSet.specials.map(el => el.toUpperCase()));
        currentSet.specials = [...new Set(currentSet.specials)].sort(specialCharCollator);
        document.querySelector("meta[property='og:title']").content = document.title = `${currentSet.name} - Vocabustudy`;
        document.querySelector("meta[name=description]").content = document.querySelector("meta[property='og:description']").content = currentSet.description || `${currentSet.terms.length} terms`;
        let quizJsonLD = {
            "@context": "https://schema.org/",
            "@type": "Quiz",
            about: {
                "@type": "Name",
                name: currentSet.description
            },
            hasPart: currentSet.terms.slice(0, 5).map(el => ({
                "@context": "https://schema.org/",
                "@type": "Question",
                eduQuestionType: "Flashcard",
                text: el.term,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: el.definition
                }
            }))
        };
        document.head.appendChild(createElement("script", [], {type: "application/ld+json", innerText: JSON.stringify(quizJsonLD)}));

        // MDC Instantiation and Events
        document.querySelectorAll("#home .study-modes .mdc-button").forEach(el => MDCRipple.attachTo(el));
        document.addEventListener("keyup", e => {
            if (location.hash === "#flashcards") pages.flashcards.onKeyUp(e);
            else if (location.hash === "#learn") pages.learn.onKeyUp(e);
        });
        document.addEventListener("click", async e => {
            if (e.target.nodeName === "IMG") {
                const { default: fscreen } = await import("fscreen");
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (fscreen.fullscreenElement === e.target) fscreen.exitFullscreen();
                else fscreen.requestFullscreen(e.target);
            }
        }, true);
        window.addEventListener("resize", () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (location.hash === "#test") pages.test.onResize();
            }, 100);
        })
        pages.setOverview.name.innerText = currentSet.name;
        applyStyling(currentSet.description || "", pages.setOverview.description);
        pages.setOverview.numTerms.innerText = currentSet.terms.length;
        for (let [i, term] of currentSet.terms.entries()) createTermCard(term, i);
        navigate();
        pages.setOverview.btnLike.addEventListener("click", async () => {
            if (!auth.currentUser) {
                localStorage.setItem("redirect_after_login", location.href);
                location.href = "/#login";
            } else if (socialRef) {
                let currentLikeStatus = pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText === "favorite";
                await setDoc(socialRef, { like: !currentLikeStatus, name: auth.currentUser.displayName, uid: auth.currentUser.uid }, { merge: true });
                showLikeStatus(!currentLikeStatus);
            }
        });
        pages.setOverview.commentsContainer.parentElement.addEventListener("toggle", async () => {
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
                await setDoc(socialRef, { comment: pages.setOverview.fieldComment.input.value, name: auth.currentUser.displayName, uid: auth.currentUser.uid }, { merge: true });
                pages.setOverview.snackbarCommentSaved.open();
                pages.setOverview.fieldComment.button.disabled = true;
            }
        });
        pages.setOverview.btnExportTerms.addEventListener("click", () => {
            pages.setOverview.modalExportTerms.root.querySelector("pre").innerText = currentSet.terms.map(el => `${el.term}  ${el.definition}`).join("\n");
            pages.setOverview.modalExportTerms.open();
        });
    } catch (err) {
        if (err.message.includes("Forbidden")) {
            localStorage.setItem("redirect_after_login", location.href);
            if (auth.currentUser) await auth.signOut();
            location.href = "/#login";
            return;
        } else window.sentryCaptureException?.call(globalThis, err);
    }
});

addEventListener("hashchange", () => navigate());