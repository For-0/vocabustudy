import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, normalizeAnswer, checkAnswers, styleAndSanitize, initQuickview, optionalAnimate, preventBreaking, initBulmaModals } from "./utils.js";
import fitty from "fitty";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal.js";
import { toast } from "bulma-toast";

/* global QRCode */

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
            let btn = this.fieldset.appendChild(createElement("button", ["button"], {innerText: specialChar}));
            btn.tabIndex = -1;
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
class StarButton extends HTMLElement {
    constructor() {
        super();
    }
    initialValue = false
    initialized = false
    get on() {
        return this.querySelector("i")?.classList?.contains("is-filled");
    }
    /**
     * @param {boolean | undefined} force
     */
    toggleOn(force) {
        this.querySelector("i")?.classList?.toggle("is-filled", force);
        this.querySelector("span")?.classList?.toggle("has-text-warning-dark", force);
    }
    connectedCallback() {
        if (this.isConnected && !this.initialized) {
            this.initialized = true;
            this.button = this.appendChild(createElement("button", ["is-inverted", "is-gold", "button"], {type: "button"},[
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "star"})])
            ]));
            this.button.addEventListener("click", e => {
                e.stopPropagation();
                this.toggleOn();
                window.StarredTerms.setStar(parseInt(this.dataset.termIndex), this.on);
                this.dispatchEvent(new CustomEvent("StarButton:toggle", {detail: this.on}));
            })
            this.toggleOn(this.initialValue);
        }
    }
}
customElements.define("accent-keyboard", AccentKeyboard);
customElements.define("star-button", StarButton);
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
const accentsRE = /[^a-zA-Z0-9\s_()[\]!'"./\\,-]/ig;
/** @type {{name: String, time: number, uid: String}[]?} */
let currentMatchLeaderboard = null;
/**
 * @type {{name: string, visibility: number|string[], terms: {term: string, definition: string}[], uid: string, description: string?}?}
 */
let currentSet = null;
let specialCharCollator = new Intl.Collator().compare;
let resizeTimeout;
window.StarredTerms = {
    getAllStarred() {
        return JSON.parse(localStorage.getItem("starred_terms")) || {};
    },
    getStarredTermList(initialList=null) {
        let starredIndices = this.getCurrentSet();
        return (initialList || currentSet.terms).filter((_, i) => starredIndices.includes(i));
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
        document.querySelectorAll("star-button").forEach(sb => sb.toggleOn(starList.includes(parseInt(sb.dataset.termIndex))));
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
        modalExportTerms: new Modal("#modal-export-terms").modal(),
        btnCopyTerms: document.querySelector("#modal-export-terms .btn-copy"),
        btnCopyLink: document.querySelector("#modal-export-terms .btn-copy-link"),
        btnCopyQrcode: document.querySelector("#modal-export-terms .btn-copy-qrcode"),
        btnShare: document.querySelector("#modal-export-terms .btn-share"),
        shareLink: document.querySelector("#modal-export-terms .share-link"),
        btnShorten: document.querySelector("#modal-export-terms .btn-shorten-link")
    },
    comment: {
        quickview: document.querySelector("#home .quickview"),
        container: document.querySelector("#home .quickview-body .list"),
        inputComment: document.getElementById("input-user-comment"),
        btnSaveComment: document.querySelector("#home .quickview-footer button"),
        btnShowComments: document.querySelector("#home .btn-show-comments")
    },
    flashcards: {
        el: document.getElementById("flashcards"),
        get index() {
            return parseInt(document.querySelector("#flashcards h1 > p > span").innerText);
        },
        set index(value) {
            if (value < 0 || value > this.numTerms) return;
            this.navigateBtns[0].disabled = (value === 0);
            this.navigateBtns[1].disabled = (value === this.numTerms);
            this.navigateBtns[2].disabled = (value === this.numTerms);
            this.terms.querySelectorAll(".show").forEach(el => el.classList.remove("show"));
            let currentCard = this.terms.children[value];
            currentCard.classList.add("show");
            document.querySelector("#flashcards h1 > p > span").innerText = value;
        },
        async nextCard() {
            this.navigateBtns.forEach(el => el.disabled = true);
            let currentFlashcard = this.terms.children[this.index];
            let nextFlashcard = this.terms.children[this.index + 1];
            currentFlashcard.style.position = "absolute";
            nextFlashcard.style.display = "block";
            if (this.index < this.numTerms) nextFlashcard.querySelectorAll("p").forEach(el => fitty(el, {maxSize: 100, observeMutations: false}));
            await Promise.all([
                optionalAnimate(currentFlashcard, [
                    {},
                    {transform: "translateX(-100vw)"}
                ], {easing: "ease", duration: 400})?.finished,
                optionalAnimate(nextFlashcard, [
                    {transform: "translateX(100vw)"},
                    {transform: "translateX(0)"}
                ], {easing: "ease", duration: 400})?.finished
            ]);
            currentFlashcard.style.removeProperty("position");
            nextFlashcard.style.removeProperty("display");
            this.index++;
        },
        async prevCard() {
            this.navigateBtns.forEach(el => el.disabled = true);
            let currentFlashcard = this.terms.children[this.index];
            let prevFlashcard = this.terms.children[this.index - 1];
            prevFlashcard.style.position = "absolute";
            prevFlashcard.style.display = "block";
            await Promise.all([
                optionalAnimate(currentFlashcard, [
                    {},
                    {transform: "translateX(100vw)"}
                ], {easing: "ease", duration: 400})?.finished,
                optionalAnimate(prevFlashcard, [
                    {transform: "translateX(-100vw)"},
                    {transform: "translateX(0)"}
                ], {easing: "ease", duration: 400})?.finished
            ]);
            prevFlashcard.style.removeProperty("position");
            prevFlashcard.style.removeProperty("display");
            this.index--;
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
        terms: document.querySelector("#flashcards > div:nth-child(2) > div:last-child > div:first-child"),
        btnShuffle: document.querySelector("#flashcards > div > div:first-child .button"),
        navigateBtns: document.querySelectorAll("#flashcards > div:nth-child(2) > div:last-child > div:last-child > button"),
        radioBtns: document.querySelectorAll("#flashcards [name='radio-flashcards-answer-with']"),
        checkOnlyStarred: document.getElementById("check-flashcard-starred"),
        onKeyUp(e) {
            if (e.key === "ArrowRight") this.navigateBtns[2].click();
            else if (e.key === "ArrowLeft") this.navigateBtns[0].click();
            else if (e.key === " ") {
                e.preventDefault();
                this.navigateBtns[1].click();
            }
        },
        createFlashcard({ term, definition, i }, isStarred) {
            let cardEl = createElement("div", [], {}, [
                createElement("div", [], {}, [
                    createElement("div", ["box"], {}, [
                        createElement("p", ["fit"], {innerHTML: styleAndSanitize(term.replace("\x00", " - "), true)})
                    ]),
                    createElement("div", ["box"], {}, [
                        createElement("p", ["fit", "content"], {})
                    ])
                ])
            ]);
            let cardBackParagraph = cardEl.firstElementChild.lastElementChild.firstElementChild;
            if (setType === "timeline" && definition.includes("\x00"))
                cardBackParagraph.appendChild(document.createElement("ul")).append(...definition.split("\x00").map(el => applyStyling(el, document.createElement("li"))));
            else cardBackParagraph.innerHTML = styleAndSanitize(definition, true)
            if (isStarred) cardEl.classList.add("is-starred");
            if (i >= 0) {
                let starButton = (/** @type {StarButton} */ (cardEl.firstElementChild.appendChild(document.createElement("star-button"))));
                starButton.initialValue = isStarred;
                starButton.dataset.termIndex = i;
                starButton.addEventListener("StarButton:toggle", e => cardEl.classList.toggle("is-starred", e.detail));
            }
            return this.terms.appendChild(cardEl);
        },
        show(shuffleA=false) {
            let terms = currentSet.terms.map((el, i) => ({i, ...el}));
            let onlyStarred = this.checkOnlyStarred.checked;
            if (onlyStarred) terms = window.StarredTerms.getStarredTermList(terms);
            this.numTerms = terms.length;
            this.setName.innerText = currentSet.name;
            this.terms.textContent = "";
            if (shuffleA) {
                terms = [...terms];
                shuffle(terms);
            }
            let starredList = window.StarredTerms.getCurrentSet();
            for (let term of terms) this.createFlashcard(term, onlyStarred || starredList.includes(term.i));
            this.createFlashcard({ term: "All done!\nYou've studied all of the flashcards.", definition: "All done!\nYou've studied all of the flashcards.", i: -1 }, false);
            this.index = 0;
            this.terms.children[0].querySelectorAll("p").forEach(el => fitty(el, {maxSize: 100, observeMutations: false}));
        },
        init() {
            this.checkOnlyStarred.addEventListener("change", () => this.show());
            this.btnShuffle.addEventListener("click", () => this.show(true));
            this.navigateBtns[0].addEventListener("click", async () => {
                this.terms.classList.toggle("flipped", this.radioBtns[0].checked);
                await this.prevCard();
            });
            this.navigateBtns[2].addEventListener("click", async () => {
                this.terms.classList.toggle("flipped", this.radioBtns[0].checked);
                await this.nextCard();
            });
            this.navigateBtns[1].addEventListener("click", () => this.terms.classList.toggle("flipped"));
            this.terms.addEventListener("click", () => this.navigateBtns[1].click());
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
            this.progressIndicator.style.setProperty("--progress", value / this.numTerms);
            this.progressIndicator.dataset.progress = `${(value * 100 / this.numTerms).toFixed(0)}%`;
            this.currentQuestionType.children[0].hidden = false;
            this.currentQuestionType.children[1].hidden = true;
        },
        get progressSA() {
            return this.progressSA_;
        },
        set progressSA(value) {
            this.progressSA_ = value;
            this.progressIndicator.style.setProperty("--progress", value / this.numTerms);
            this.progressIndicator.dataset.progress = `${(value * 100 / this.numTerms).toFixed(0)}%`;
            this.currentQuestionType.children[0].hidden = true;
            this.currentQuestionType.children[1].hidden = false;
        },
        get numTerms() {
            return parseInt(document.querySelector("#learn .field-num-terms").innerText);
        },
        set numTerms(value) {
            document.querySelector("#learn .field-num-terms").innerText = value;
        },
        get questionType() {
            return (this.radioBtns[0].checked) ? "definition" : "term";
        },
        get answerType() {
            return (this.radioBtns[1].checked) ? "definition" : "term";
        },
        checkOnlyStarred: document.getElementById("check-learn-starred"),
        setName: document.querySelector("#learn h1 > span"),
        question: document.querySelector("#learn > div > div:last-child p"),
        answerSA: document.querySelector("#learn .input[type=text]"),
        answerSABtns: (/** @type {AccentKeyboard} */ (document.querySelector("#learn accent-keyboard"))),
        answerSACheck: document.querySelector("#learn .field.has-addons button"),
        answerMC: document.querySelector("#learn > div > div:last-child > fieldset"),
        msgCorrect: document.querySelector("#learn .notification.is-success"),
        msgIncorrect: document.querySelector("#learn .notification.is-danger"),
        msgDone: document.querySelector("#learn > div > div:last-child > div:nth-child(2) > p:first-child"),
        radioBtns: document.querySelectorAll("#learn [name='radio-learn-answer-with']"),
        progressIndicator: document.querySelector("#learn .progress-circle"),
        currentQuestionType: document.querySelector("#learn .field-current-type"),
        currentQuestionIndex: 0,
        /**
         * @param {KeyboardEvent} e
         */
        onKeyUp(e) {
            if (["1", "2"].includes(this.msgDone.parentElement.dataset.mode) && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) this.generateQuestion();
            else if (!this.answerMC.hidden && !this.answerMC.disabled) this.answerMC.elements[parseInt(e.key) - 1]?.click();
        },
        show() {
            this.questionData = currentSet.terms.map((_, i) => ({ i, mc: 1, fmc: 0, sa: 1, fsa: 0 }));
            if (this.checkOnlyStarred.checked && window.StarredTerms.getCurrentSet().length) this.questionData = this.questionData.filter(({ i }) => window.StarredTerms.isStarred(i));
            this.setName.innerText = currentSet.name;
            this.msgDone.parentElement.dataset.mode = "0";
            this.numTerms = this.questionData.length;
            this.progressSA = 0;
            this.progressMC = 0;
            this.generateQuestion();
            this.answerSABtns.clear();
            this.answerSABtns.initialize(currentSet.specials, this.answerSA);
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
                this.answerSA.hidden = true;
                this.answerSABtns.hidden = true;
                this.answerSACheck.hidden = true;
                this.msgDone.parentElement.dataset.mode = "3";
            }
        },
        showQuestion(term, answers = null) {
            applyStyling(term[this.answerType], this.msgIncorrect.querySelector("strong"));
            applyStyling(term[this.answerType], this.msgCorrect.querySelector("strong"));
            this.msgDone.parentElement.dataset.mode = "0";
            if (answers) {
                this.answerMC.hidden = false;
                this.answerSA.hidden = true;
                this.answerSABtns.hidden = true;
                this.answerSACheck.hidden = true;
                this.answerMC.disabled = false;
                answers.forEach((answer, i) => {
                    let btn = this.answerMC.elements[i];
                    let ansTerm = currentSet.terms[answer];
                    applyStyling(ansTerm[this.answerType], btn.querySelector(".fit"));
                    preventBreaking(btn.querySelector(".fit"));
                    btn.dataset.answerindex = answer;
                });
            } else {
                this.answerMC.hidden = true;
                this.answerSA.hidden = false;
                this.answerSABtns.hidden = false;
                this.answerSACheck.hidden = false;
                this.answerSA.disabled = false;
                this.answerSABtns.disabled = false;
                this.answerSACheck.disabled = false;
                this.answerSA.value = "";
                this.answerSA.focus();
            }
            applyStyling(term[this.questionType], this.question);
            resizeTextToMaxHeight(this.question, this.question.parentElement.clientHeight);
            this.question.style.color = (window.StarredTerms.isStarred(this.questionData[this.currentQuestionIndex].i)) ? "goldenrod" : "unset";
        },
        processMCResult(answer) {
            this.answerMC.disabled = true;
            if (answer === this.questionData[this.currentQuestionIndex].i) {
                this.msgDone.parentElement.dataset.mode = "1";
                this.questionData[this.currentQuestionIndex].mc--;
                this.progressMC++;
            } else {
                this.msgDone.parentElement.dataset.mode = "2";
                if (++this.questionData[this.currentQuestionIndex].mc > 4) window.StarredTerms.setStar(this.currentQuestionIndex, true);
                this.questionData[this.currentQuestionIndex].fmc++;
                this.progressMC--;
            }
            resizeTextToMaxHeight(this.question, this.question.parentElement.clientHeight);
        },
        processSAResult() {
            if (!(this.answerSA.reportValidity())) return;
            let answer = this.answerSA.value;
            document.activeElement.blur();
            this.answerSA.disabled = true;
            this.answerSABtns.disabled = true;
            this.answerSACheck.disabled = true;
            if (checkAnswers(answer, currentSet.terms[this.questionData[this.currentQuestionIndex].i][this.answerType])) {
                this.msgDone.parentElement.dataset.mode = "1";
                this.questionData[this.currentQuestionIndex].sa--;
                this.progressSA++;
            } else {
                this.msgDone.parentElement.dataset.mode = "2";
                if (++this.questionData[this.currentQuestionIndex].sa > 4) window.StarredTerms.setStar(this.currentQuestionIndex, true);
                this.questionData[this.currentQuestionIndex].fsa++;
                this.progressSA--;
            }
            resizeTextToMaxHeight(this.question, this.question.parentElement.clientHeight);
        },
        overrideCorrect() {
            if (this.answerSA.hidden) {
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
            this.radioBtns.forEach(el => el.addEventListener("change", () => this.generateQuestion()));
            for (let btn of this.answerMC.elements) {
                btn.addEventListener("click", () => this.processMCResult(parseInt(btn.dataset.answerindex)));
                fitty(btn.querySelector(".fit"), {maxSize: 24, minSize: 4});
                btn.querySelector(".fit").addEventListener("fit", () => resizeTextToMaxHeight(btn.querySelector(".fit"), 60, 4));
            }
            this.checkOnlyStarred.addEventListener("change", () => this.show());
            this.msgCorrect.addEventListener("click", () => this.generateQuestion());
            this.msgIncorrect.addEventListener("click", () => this.generateQuestion());
            this.answerSACheck.addEventListener("click", () => this.processSAResult());
            this.answerSA.addEventListener("keyup", e => {
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
            //fitty(this.question); TODO finish migration
        }
    },
    test: {
        el: document.getElementById("test"),
        setName: document.querySelector("#test h1 > span"),
        btnToggleSettings: document.querySelector("#test > div > div:first-child .button"),
        btnNew: document.querySelector("#test > div > div:first-child .button:not(.is-dark)"),
        btnCheck: document.querySelector("#test > div > div:first-child .button.is-primary"),
        radioBtns: document.querySelectorAll("#test input[name='radio-test-answer-with']"),
        checkboxes: [...document.querySelectorAll("#test input[type=checkbox]:not(#check-test-starred)")],
        questionTypeHeaders: document.querySelectorAll("#test > div > fieldset > h2"),
        questionContainers: document.querySelectorAll("#test > div > fieldset > div"),
        questionsFieldset: document.querySelector("#test > div > fieldset"),
        currentMatchMode: 0,
        checkOnlyStarred: document.getElementById("check-test-starred"),
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
            let questionEl = this.questionContainers[0].appendChild(createElement("div", ["field"], {}, [
                createElement("label", ["label"], {innerHTML: styleAndSanitize(question[this.questionType], true)}),
                createElement("div", ["control"], {}, [
                    createElement("input", ["input"], {type: "text", placeholder: "Your Answer", required: true})
                ]),
                createElement("p", ["help"])
            ]));
            if (isStarred) questionEl.querySelector("label").style.color = "goldenrod";
            let accentKeyboard = this.questionContainers[0].appendChild(document.createElement("accent-keyboard"));
            accentKeyboard.initialize(currentSet.specials, questionEl.querySelector("input"))
            return questionEl;
        },
        makeMCQuestion(question, answers, container = 1, customQuestion = null) {
            let isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            let radioName = `_${crypto.randomUUID()}`;
            let answerRadios = answers.map((answer, i) => createElement("div", ["field"], {}, [
                createElement("input", ["is-checkradio"], {type: "radio", id: `${radioName}-${i}`, required: true, name: radioName}),
                createElement("label", [], {htmlFor: `${radioName}-${i}`, innerHTML: styleAndSanitize(answer, true)})
            ]));
            let questionContainer = this.questionContainers[container].appendChild(createElement("div", ["mb-4"], {}, [
                createElement("h3", ["title", "is-size-5", "mb-2"], {innerHTML: styleAndSanitize(customQuestion || question[this.questionType], true)}, []),
                ...answerRadios
            ]));
            if (isStarred) questionContainer.querySelector("h3").style.color = "goldenrod";
            return answerRadios;
        },
        makeMTQuestion(question) {
            let isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            let questionUUID = crypto.randomUUID();
            let div1 = applyStyling(question[this.questionType], this.questionContainers[2].querySelector(":scope > div:first-child").appendChild(createElement("div", ["test-matching-box", "left", "box"], {}, [])));
            div1.dataset.questionId = questionUUID;
            if (isStarred) div1.style.color = "goldenrod";
            let div2 = applyStyling(question[this.answerType], this.questionContainers[2].querySelector(":scope > div:nth-child(2)").appendChild(createElement("div", ["test-matching-box", "right", "box"], {}, [])));
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
            this.questionsFieldset.classList.remove("has-validated-inputs");
            this.btnCheck.disabled = false;
            this.btnCheck.querySelector("span:last-child").innerText = "Check Answers";
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
            this.questionsFieldset.classList.add("has-validated-inputs");
            for (let sa of this.questionInputs.sa) {
                if (!sa.input.querySelector("input").reportValidity()) return;
            }
            for (let mc of this.questionInputs.mc) if (!mc.inputs[0].querySelector("input").reportValidity()) return;
            for (let tf of this.questionInputs.tf) if (!tf.inputs[0].querySelector("input").reportValidity()) return;
            this.questionsFieldset.disabled = true;
            document.querySelectorAll(".test-matching-box").forEach(box => box.removeEventListener("click", this.matchingBoxClickListener));
            let numCorrect = 0;
            for (let sa of this.questionInputs.sa) {
                if (checkAnswers(sa.input.querySelector("input").value, sa.answer)) {
                    sa.input.classList.add("correct");
                    sa.input.querySelector(".help").innerText = "Correct!";
                    numCorrect++;
                } else {
                    sa.input.classList.add("incorrect");
                    sa.input.querySelector(".help").innerText = `Incorrect -> ${normalizeAnswer(sa.answer)}`;
                }
            }
            for (let mc of this.questionInputs.mc) {
                let correctAnswer = mc.inputs[mc.answer];
                numCorrect += correctAnswer.querySelector("input").checked; // implicit cast
                mc.inputs.find(el => el.querySelector("input").checked).classList.toggle("incorrect", !correctAnswer.querySelector("input").checked);
                correctAnswer.classList.add("correct");
            }
            for (let match of document.querySelectorAll(".matches-container > div")) {
                let isCorrect = match.dataset.fromCard === match.dataset.toCard;
                numCorrect += isCorrect;
                match.classList.add(isCorrect ? "correct" : "incorrect");
            }
            for (let tf of this.questionInputs.tf) {
                let selectedInput = tf.inputs.find(el => el.querySelector("input").checked);
                let correctAnswer = tf.inputs[tf.answer ? 0 : 1];
                correctAnswer.classList.add("correct");
                if (selectedInput !== correctAnswer) selectedInput.classList.add("incorrect");
                else numCorrect++;
            }
            let total = Math.max(Math.min(this.termList.length, this.userMaxQuestions), 1);
            let percentCorrect = Math.round(numCorrect * 100 / total);
            this.btnCheck.disabled = true;
            this.btnCheck.querySelector("span:last-child").innerText = `${percentCorrect}%`;
            this.questionsFieldset.classList.remove("has-validated-inputs");
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
                    }
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
            this.fieldMaxTerms.value = "20";
            this.checkboxes.forEach(el => el.checked = true);
            this.btnNew.addEventListener("click", () => this.generateQuestions());
            this.btnCheck.addEventListener("click", () => this.checkAnswers());
            this.btnToggleSettings.addEventListener("click", () => this.btnToggleSettings.nextElementSibling.classList.toggle("is-hidden-mobile"));
        }
    },
    match: {
        el: document.getElementById("match"),
        setName: document.querySelector("#match h1 > span"),
        btnNew: document.querySelector("#match .button"),
        btnShowHelp: document.querySelector("#match .button:last-child"),
        radioBtns: document.querySelectorAll("#match input[name='radio-match-answer-with']"),
        termsContainer: document.querySelector("#match > div > div:last-child"),
        completedDialog: new Modal("#modal-match-done").modal(),
        helpDialog: new Modal("#modal-match-help").modal(),
        completedDialogList: document.querySelector("#modal-match-done .list"),
        fieldTime: document.querySelector("#match .field-time"),
        get questionType() {
            return (this.radioBtns[0].checked) ? "definition" : "term";
        },
        get answerType() {
            return (this.radioBtns[1].checked) ? "definition" : "term";
        },
        checkOnlyStarred: document.getElementById("check-match-starred"),
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
            let card = createElement("div", ["draggable-card", "box", "mb-0", "notification", "is-primary", "p-4"], { draggable: true, innerHTML: styleAndSanitize(text, true), dataset: {questionId} });
            card.addEventListener("dragstart", this.dragEvents.start);
            card.addEventListener("dragend", this.dragEvents.end);
            card.addEventListener("click", this.dragEvents.dragClick, true);
            if (this.onlyStarred || window.StarredTerms.isStarred(index)) card.style.backgroundColor = "goldenrod";
            return card;
        },
        makeDropzoneCard(text, questionId) {
            let card = createElement("div", ["dropzone-card", "box", "mb-0", "p-1"], {dataset: {questionId}}, [
                createElement("div", ["p-4", "pb-1"], {innerHTML: styleAndSanitize(text, true)}),
                createElement("div")
            ]);
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
                terms = window.StarredTerms.getStarredTermList();
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
                    if (id !== dropzone.children[0]?.dataset?.questionId) return;
                } else return
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
            this.completedDialogList.textContent = "";
            for (let [i, item] of actualLeaderboard.entries()) {
                this.completedDialogList.appendChild(createElement("div", ["list-item"], {}, [
                    createElement("div", ["list-item-content"], {}, [
                        createElement("span", ["list-item-title"], { innerText: `#${i + 1} ${item.name}` }),
                        createElement("span", ["list-item-description"], { innerText: `${item.time.toFixed(2)}s` })
                    ])
                ]));
            }
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
            this.btnNew.addEventListener("click", () => this.generateCards());
            this.btnShowHelp.addEventListener("click", () => this.helpDialog.open());
            this.completedDialog.onuserclose = action => {
                if (action === "restart") this.generateCards();
                else history.back();
            };
            this.completedDialog.onclose = () => this.generateCards();
            this.helpDialog.onclose = () => {};
            initBulmaModals([this.completedDialog, this.helpDialog]);
        }
    }
};

// #region UTILITIES
function resizeTextToMaxHeight(textEl, maxHeight, minSize = 1) {
    textEl.style.fontSize = "";
    let i = 0;
    let initialSize = parseInt(getComputedStyle(textEl).fontSize);
    while (i < 100 && textEl.clientHeight > maxHeight && initialSize > minSize) {
        textEl.style.fontSize = `${Math.max(initialSize -= 2, minSize)}px`;
        i++;
    }
    textEl.style.fontSize = `${Math.max(initialSize, minSize)}px`;
}
/**
 * Apply inline styling of text to an element
 * @template {keyof HTMLElementTagNameMap} T
 * @param {string} text Text to style with markdown and sanitize
 * @param {HTMLElementTagNameMap[T]} el The element to put the styled text in
 * @returns {HTMLElementTagNameMap[T]} The element with the text
 */
function applyStyling(text, el) {
    el.innerHTML = styleAndSanitize(text, true);
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
function createTermCard({ term, definition }, index, isStarred) {
    let cardEl = createElement("div", ["box", "is-relative"], {}, [
        createElement("p", ["has-font-weight-bold", "is-size-5"], {innerHTML: styleAndSanitize(term.replace("\x00", " - "))}),
        createElement("hr", ["my-3"]),
        createElement("star-button", [], {initialValue: isStarred, dataset: {termIndex: index}})
    ]);
    if (setType === "timeline") {
        cardEl.appendChild(document.createElement("ul")).append(...definition.split("\x00").map(el => applyStyling(el, document.createElement("li"))));
        cardEl.classList.add("timeline-piece", "content");
    } else cardEl.appendChild(document.createElement("p")).innerHTML = styleAndSanitize(definition);
    pages.setOverview.terms.appendChild(createElement("div", ["column", "is-one-quarter-desktop", "is-half-tablet"], {}, [cardEl]));
}
function createCommentCard({ name, comment, like }, id) {
    let isMyComment = auth.currentUser?.uid === id;
    if (isMyComment)
        pages.comment.inputComment.value = comment;
    else
        pages.comment.container.appendChild(createElement("div", ["list-item"], {}, [
            createElement("div", ["list-item-content"], {}, [
                createElement("div", ["list-item-title"], {}, [
                    createElement("div", ["list-item-title", "is-flex", "is-justify-content-space-between"], {}, [
                        createElement("span", [], {innerText: name}),
                        ...(like ? [createElement("span", ["tag", "is-success", "has-tooltip-arrow", "has-tooltip-info", "has-tooltip-left"], {dataset: {tooltip: `${name} likes this set`}}, [
                            createElement("span", ["icon"], {}, [
                                createElement("i", ["material-symbols-rounded", "is-filled"], {innerText: "thumb_up", style: {verticalAlign: "middle", fontSize: "1rem", cursor: "auto"}})
                            ])
                        ])] : [])
                    ])
                ]),
                createElement("div", ["list-item-description"], {innerHTML: styleAndSanitize(comment, true)})
            ])
        ]));
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
    pages.setOverview.btnLike.querySelector("i").classList.toggle("is-filled", likeStatus);
}

async function getShortenedSetUrl() {
    let longDynamicLinkObj = new URL("https://set.vocabustudy.org/");
    longDynamicLinkObj.searchParams.set("link", `https://vocabustudy.org${location.pathname}`);
    longDynamicLinkObj.searchParams.set("st", `${currentSet.name} - Vocabustudy`);
    longDynamicLinkObj.searchParams.set("sd", currentSet.description || `Study this set with ${currentSet.terms.length} terms on Vocabustudy`);
    let longDynamicLink = longDynamicLinkObj.href;
    let res = await fetch("https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyDU-lvyggKhMHuEllAEpXZ3y_TyPOGfXBM", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            longDynamicLink,
            suffix: {
                option: "SHORT"
            }
        })
    });
    let { shortLink } = await res.json();
    return shortLink;
}

addEventListener("DOMContentLoaded", async () => {
    pages.flashcards.init();
    pages.learn.init();
    pages.test.init();
    pages.match.init();
    if (setType === "timeline") {
        pages.setOverview.terms.style.justifyContent = "left";
        document.querySelectorAll(".study-modes > :not([href='#flashcards'])").forEach(el => el.hidden = true);
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

        pages.setOverview.name.innerText = currentSet.name;
        applyStyling(currentSet.description || "", pages.setOverview.description);
        pages.setOverview.numTerms.innerText = currentSet.terms.length;
        let starredList = window.StarredTerms.getCurrentSet();
        for (let [i, term] of currentSet.terms.entries()) createTermCard(term, i, starredList.includes(i));
        navigate();
        initQuickview(pages.comment.quickview, pages.comment.btnShowComments);

        // Events
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
        pages.setOverview.btnLike.addEventListener("click", async () => {
            if (!auth.currentUser) {
                localStorage.setItem("redirect_after_login", location.href);
                location.href = "/#login";
            } else if (socialRef) {
                let currentLikeStatus = pages.setOverview.btnLike.querySelector("i").classList.contains("is-filled");
                await setDoc(socialRef, { like: !currentLikeStatus, name: auth.currentUser.displayName, uid: auth.currentUser.uid }, { merge: true });
                showLikeStatus(!currentLikeStatus);
            }
        });
        pages.comment.btnShowComments.addEventListener("click", async () => { // TODO modularize
            let comments = await getDocs(query(collection(setRef, "social"), orderBy("comment")));
            comments.forEach(comment => createCommentCard(comment.data(), comment.id));
        }, { once: true });
        pages.comment.inputComment.addEventListener("input", () => pages.comment.btnSaveComment.disabled = false);
        pages.comment.btnSaveComment.addEventListener("click", async () => {
            if (auth.currentUser && pages.comment.inputComment.reportValidity()) {
                await setDoc(socialRef, { comment: pages.comment.inputComment.value, name: auth.currentUser.displayName, uid: auth.currentUser.uid }, { merge: true });
                toast({message: "Comment saved!", type: "is-success", dismissible: true, position: "bottom-center", duration: 5000})
                pages.comment.btnSaveComment.disabled = true;
            }
        });
        pages.setOverview.btnExportTerms.addEventListener("click", () => pages.setOverview.modalExportTerms.open());
        pages.setOverview.btnCopyTerms.addEventListener("click", async () => {
            await navigator.clipboard.writeText(pages.setOverview.modalExportTerms.root.querySelector("pre").innerText);
            pages.setOverview.btnCopyTerms.querySelector("i").textContent = "inventory";
            setTimeout(() => pages.setOverview.btnCopyTerms.querySelector("i").textContent = "content_paste", 500);
        });
        pages.setOverview.btnCopyLink.addEventListener("click", async () => {
            await navigator.clipboard.writeText(pages.setOverview.shareLink.href);
            pages.setOverview.btnCopyLink.querySelector("i").textContent = "inventory";
            setTimeout(() => pages.setOverview.btnCopyLink.querySelector("i").textContent = "content_paste", 500);
        });
        pages.setOverview.btnShorten.addEventListener("click", async () => {
            let shortLink = await getShortenedSetUrl();
            pages.setOverview.btnShorten.disabled = true;
            pages.setOverview.shareLink.innerText = shortLink;
            pages.setOverview.shareLink.href = shortLink;
        });

        // Share Modal
        pages.setOverview.modalExportTerms.root.querySelector("pre").innerText = currentSet.terms.map(el => `${el.term}  ${el.definition}`).join("\n");
        pages.setOverview.shareLink.innerText = `https://vocabustudy.org${location.pathname}`;
        pages.setOverview.shareLink.href = `https://vocabustudy.org${location.pathname}`;
        new QRCode(document.getElementById("set-qrcode"), `https://vocabustudy.org${location.pathname}`);
        if (!navigator.share) pages.setOverview.btnShare.hidden = true;
        else pages.setOverview.btnShare.addEventListener("click", () => navigator.share({title: `${currentSet.name} - Vocabustudy`, text: currentSet.description || `Study this set with ${currentSet.terms.length} terms on Vocabustudy`, url: pages.setOverview.shareLink.href}));
        if (!navigator.clipboard.write) pages.setOverview.btnCopyQrcode.hidden = true;
        else pages.setOverview.btnCopyQrcode.addEventListener("click", async () => {
            let qrcodeBlob = await (await fetch(document.querySelector("#set-qrcode img").src)).blob();
            await navigator.clipboard.write([new ClipboardItem({"image/png": qrcodeBlob})]);
            pages.setOverview.btnCopyQrcode.querySelector("i").textContent = "inventory";
            setTimeout(() => pages.setOverview.btnCopyQrcode.querySelector("i").textContent = "content_paste", 500);
        });
        document.querySelector(".page-loader").hidden = true;
    } catch (err) {
        console.error(err);
        if (err.message.includes("Forbidden") || err.code === "permission-denied") {
            localStorage.setItem("redirect_after_login", location.href);
            if (auth.currentUser) await auth.signOut();
            location.href = "/#login";
            return;
        } else window.sentryCaptureException?.call(globalThis, err);
    }
});

addEventListener("hashchange", () => navigate());