import { createElement, normalizeAnswer, checkAnswers, styleAndSanitize, initQuickview, optionalAnimate, preventBreaking, initBulmaModals, navigateLoginSaveState, addShowCommentsClickListener, shuffle } from "./utils";
import fitty from "fitty";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal.js";
import { toast } from "bulma-toast";
import { getCurrentUser, initializeAuth, refreshCurrentUser, setCurrentUser } from "./firebase-rest-api/auth";
import { Firestore, QueryBuilder, Social, VocabSet } from "./firebase-rest-api/firestore";
import { TermDefinition, User } from "./types";
import "typed-query-selector";

declare global {
    interface Window {
        StarredTerms: {
            getAllStarred(): {
                [key: string]: number[];
            }
            getStarredTermList<T extends TermDefinition = TermDefinition>(initialList?: T[]): T[]
            getCurrentSet(): number[]
            saveStarredList(starList: number[]): void
            isStarred(term: number): boolean
            setStar(term: number, starred: boolean): void
            setStars(terms: number[], starred: boolean): void
        }
        temp_learnResults: {
            setName: string,
            results: [number, string, string][]
        }
        QRCode: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    interface HTMLElementTagNameMap {
        "accent-keyboard": AccentKeyboard;
        "star-button": StarButton;
    }
    interface CustomEventMap {
        "StarButton:toggle": CustomEvent<boolean>
    }
    interface HTMLElement {
        addEventListener<K extends keyof CustomEventMap>(type: K, listener: (this: Document, ev: CustomEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
        dispatchEvent<K extends keyof CustomEventMap>(event: CustomEventMap[K]): boolean;
    }
}

class AccentKeyboard extends HTMLElement {
    fieldset: HTMLFieldSetElement;
    accents: string[]
    input: HTMLInputElement;
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
     * @param accents Accents to make buttons for
     * @param input Input to append accent to
     */
    initialize(accents: string[], input: HTMLInputElement) {
        this.accents = accents;
        this.input = input;
        if (this.isConnected) this.showButtons();
    }
    showButtons() {
        for (const specialChar of this.accents) {
            const btn = this.fieldset.appendChild(createElement("button", ["button"], {innerText: specialChar}));
            btn.tabIndex = -1;
            btn.addEventListener("mousedown", e => {
                e.preventDefault();
                if (document.activeElement === this.input) {
                    const { selectionStart, selectionEnd } = this.input;
                    if (selectionStart !== null && selectionEnd !== null)
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
    initialValue = false;
    initialized = false;
    button: HTMLButtonElement;
    get on() {
        return this.querySelector("i")?.classList?.contains("is-filled");
    }
    toggleOn(force?: boolean | undefined) {
        this.querySelector("i")?.classList?.toggle("is-filled", force);
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

const auth = initializeAuth(async user => {
    if (!initialized) initialize(user);
    if (user) {
        const socialDoc = Social.fromSingle(await Firestore.getDocument(`${VocabSet.collectionKey}/${setId}/${Social.collectionKey}`, user.uid));
        showLikeStatus(socialDoc?.like);
    } else showLikeStatus(false);
});

const [, setType, setId] = decodeURIComponent(location.pathname).match(/\/(set|timeline)\/([\w ]+)\/view\/?/) || (location.pathname = "/");
const accentsRE = /[^a-zA-Z0-9\s_()[\]!'"./\\,-]/ig;

let currentMatchLeaderboard: { name: string; time: number; uid?: string; }[] | null = null;
let currentSet: (VocabSet<TermDefinition[]> & { specials?: string[] }) | null = null;

const specialCharCollator = new Intl.Collator().compare;
let resizeTimeout: number;
let initialized = false;

window.StarredTerms = {
    getAllStarred() {
        return JSON.parse(localStorage.getItem("starred_terms") || "{}");
    },
    // @ts-ignore
    getStarredTermList(initialList) {
        const starredIndices = this.getCurrentSet();
        if (initialList) return initialList.filter((_, i) => starredIndices.includes(i));
        return (currentSet?.terms || []).filter((_, i) => starredIndices.includes(i));
    },
    /**
     * @returns Indexes of starred terms
     */
    getCurrentSet() {
        return this.getAllStarred()[setId] || [];
    },
    saveStarredList(starList) {
        const orig = this.getAllStarred();
        orig[setId] = starList;
        localStorage.setItem("starred_terms", JSON.stringify(orig));
        document.querySelectorAll("star-button").forEach(sb => sb.toggleOn(starList.includes(parseInt(sb.dataset.termIndex || "-1"))));
    },
    /**
     * Find out if a term in the current set is starred
     * @param termIndex Index of the term
     */
    isStarred(termIndex) {
        return this.getCurrentSet().includes(termIndex);
    },
    setStar(termIndex, isStarred) {
        const starList = this.getCurrentSet();
        const possibleIndex = starList.indexOf(termIndex);
        if (isStarred && possibleIndex === -1) starList.push(termIndex);
        else if (!isStarred && possibleIndex !== -1) starList.splice(possibleIndex, 1);
        this.saveStarredList(starList);
    },
    setStars(termIndexes, isStarred) {
        const starList = this.getCurrentSet();
        for (const termIndex of termIndexes) {
            const possibleIndex = starList.indexOf(termIndex);
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
        numTerms: document.querySelector<HTMLSpanElement>("#home .field-num-terms"),
        terms: document.querySelector<HTMLDivElement>("#home .field-terms"),
        btnLike: document.querySelector("#home .btn-like"),
        btnExportTerms: document.querySelector("#home .btn-export-terms"),
        modalExportTerms: new Modal("#modal-export-terms").modal(),
        btnCopyTerms: document.querySelector("#modal-export-terms .btn-copy"),
        btnCopyLink: document.querySelector("#modal-export-terms .btn-copy-link"),
        btnCopyQrcode: document.querySelector("#modal-export-terms .btn-copy-qrcode"),
        btnShare: document.querySelector("#modal-export-terms .btn-share"),
        shareLink: document.querySelector("#modal-export-terms a.share-link"),
        btnShorten: document.querySelector("#modal-export-terms button.btn-shorten-link")
    },
    comment: {
        quickview: document.querySelector<HTMLDivElement>("#home .quickview"),
        container: document.querySelector<HTMLDivElement>("#home .quickview-body .list"),
        inputComment: <HTMLInputElement>document.getElementById("input-user-comment"),
        btnSaveComment: document.querySelector("#home .quickview-footer button"),
        btnShowComments: document.querySelector("#home button.btn-show-comments")
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
            const currentCard = this.terms.children[value];
            currentCard.classList.add("show");
            document.querySelector("#flashcards h1 > p > span").innerText = value.toString();
        },
        async nextCard() {
            this.navigateBtns.forEach(el => el.disabled = true);
            const currentFlashcard = this.terms.children[this.index] as HTMLDivElement;
            const nextFlashcard = this.terms.children[this.index + 1] as HTMLDivElement;
            currentFlashcard.style.position = "absolute";
            nextFlashcard.style.display = "block";
            if (this.index < this.numTerms) nextFlashcard.querySelectorAll("p").forEach(el => fitty(el, { maxSize: 100, observeMutations: undefined }));
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
            const currentFlashcard = this.terms.children[this.index] as HTMLDivElement;
            const prevFlashcard = this.terms.children[this.index - 1] as HTMLDivElement;
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
        getTermText(tIndex: number, side: number) {
            return this.terms.children[tIndex].querySelector(`:scope > div > div:nth-child(${side}) > p`);
        },
        get numTerms() {
            return parseInt(document.querySelector("#flashcards h1 > p > span:last-child").innerText);
        },
        set numTerms(value) {
            document.querySelector("#flashcards h1 > p > span:last-child").innerText = value.toString();
        },
        setName: document.querySelector("#flashcards h1 > span"),
        terms: document.querySelector("#flashcards > div:nth-child(2) > div:last-child > div:first-child"),
        btnShuffle: document.querySelector<HTMLButtonElement>("#flashcards > div > div:first-child .button"),
        navigateBtns: document.querySelectorAll("#flashcards > div:nth-child(2) > div:last-child > div:last-child > button"),
        radioBtns: document.querySelectorAll<HTMLInputElement>("#flashcards [name='radio-flashcards-answer-with']"),
        checkOnlyStarred: <HTMLInputElement>document.getElementById("check-flashcard-starred"),
        onKeyUp(e: KeyboardEvent) {
            if (e.key === "ArrowRight") this.navigateBtns[2].click();
            else if (e.key === "ArrowLeft") this.navigateBtns[0].click();
            else if (e.key === " ") {
                e.preventDefault();
                this.navigateBtns[1].click();
            }
        },
        createFlashcard({ term, definition, i }: { term: string, definition: string, i: number }, isStarred: boolean) {
            const cardEl = createElement("div", [], {}, [
                createElement("div", [], {}, [
                    createElement("div", ["box"], {}, [
                        createElement("p", ["fit"], {innerHTML: styleAndSanitize(term.replace("\x00", " - "), true)})
                    ]),
                    createElement("div", ["box"], {}, [
                        createElement("p", ["fit", "content"], {})
                    ])
                ])
            ]);
            const cardBackParagraph = cardEl.firstElementChild.lastElementChild.firstElementChild;
            if (setType === "timeline" && definition.includes("\x00"))
                cardBackParagraph.appendChild(document.createElement("ul")).append(...definition.split("\x00").map(el => applyStyling(el, document.createElement("li"))));
            else cardBackParagraph.innerHTML = styleAndSanitize(definition, true)
            if (isStarred) cardEl.classList.add("is-starred");
            if (i >= 0) {
                const starButton = cardEl.firstElementChild.appendChild(document.createElement("star-button"));
                starButton.initialValue = isStarred;
                starButton.dataset.termIndex = i.toString();
                starButton.addEventListener("StarButton:toggle", e => cardEl.classList.toggle("is-starred", e.detail));
            }
            return this.terms.appendChild(cardEl);
        },
        show(shuffleA=false) {
            let terms = currentSet.terms.map((el, i) => ({i, ...el}));
            const onlyStarred = this.checkOnlyStarred.checked;
            if (onlyStarred) terms = window.StarredTerms.getStarredTermList(terms);
            this.numTerms = terms.length;
            this.setName.innerText = currentSet.name;
            this.terms.textContent = "";
            if (shuffleA) {
                terms = [...terms];
                shuffle(terms);
            }
            const starredList = window.StarredTerms.getCurrentSet();
            for (const term of terms) this.createFlashcard(term, onlyStarred || starredList.includes(term.i));
            this.createFlashcard({ term: "All done!\nYou've studied all of the flashcards.", definition: "All done!\nYou've studied all of the flashcards.", i: -1 }, false);
            this.index = 0;
            this.terms.children[0].querySelectorAll("p").forEach(el => fitty(el, {maxSize: 100, observeMutations: undefined}));
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
        questionData: [] as { i: number; mc: number; fmc: number; sa: number; fsa: number; }[],
        get progressMC() {
            return this.progressMC_;
        },
        set progressMC(value) {
            this.progressMC_ = value;
            this.progressIndicator.style.setProperty("--progress", (value / this.numTerms).toString());
            this.progressIndicator.dataset.progress = `${(value * 100 / this.numTerms).toFixed(0)}%`;
            (<HTMLElement>this.currentQuestionType.children[0]).hidden = false;
            (<HTMLElement>this.currentQuestionType.children[1]).hidden= true;
        },
        get progressSA() {
            return this.progressSA_;
        },
        set progressSA(value) {
            this.progressSA_ = value;
            this.progressIndicator.style.setProperty("--progress", (value / this.numTerms).toString());
            this.progressIndicator.dataset.progress = `${(value * 100 / this.numTerms).toFixed(0)}%`;
            (<HTMLElement>this.currentQuestionType.children[0]).hidden = true;
            (<HTMLElement>this.currentQuestionType.children[1]).hidden = false;
        },
        get numTerms() {
            return parseInt(document.querySelector<HTMLSpanElement>("#learn .field-num-terms").innerText);
        },
        set numTerms(value) {
            document.querySelector<HTMLSpanElement>("#learn .field-num-terms").innerText = value.toString();
        },
        get questionType() {
            return (this.radioBtns[0].checked) ? "definition" : "term";
        },
        get answerType() {
            return (this.radioBtns[1].checked) ? "definition" : "term";
        },
        checkOnlyStarred: <HTMLInputElement>document.getElementById("check-learn-starred"),
        setName: document.querySelector("#learn h1 > span"),
        question: document.querySelector("#learn > div > div:last-child p"),
        answerSA: document.querySelector<HTMLInputElement>("#learn .input[type=text]"),
        answerSABtns: document.querySelector("#learn accent-keyboard"),
        answerSACheck: document.querySelector("#learn .field.has-addons button"),
        answerMC: document.querySelector("#learn > div > div:last-child > fieldset"),
        msgCorrect: document.querySelector("#learn .notification.is-success"),
        msgIncorrect: document.querySelector("#learn .notification.is-danger"),
        msgDone: document.querySelector("#learn > div > div:last-child > div:nth-child(2) > p:first-child"),
        radioBtns: document.querySelectorAll<HTMLInputElement>("#learn [name='radio-learn-answer-with']"),
        progressIndicator: document.querySelector<HTMLDivElement>("#learn .progress-circle"),
        currentQuestionType: document.querySelector("#learn .field-current-type"),
        currentQuestionIndex: 0,
        fittyInitialized: false,
        onKeyUp(e: KeyboardEvent) {
            if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
            if (["1", "2"].includes(this.msgDone.parentElement.dataset.mode)) this.generateQuestion();
            else if (!this.answerMC.hidden && !this.answerMC.disabled) (<HTMLButtonElement>this.answerMC.elements[parseInt(e.key) - 1])?.click();
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
            if (!this.fittyInitialized) {
                for (const btn of this.answerMC.elements) {
                    fitty(btn.querySelector<HTMLSpanElement>(".fit"), {maxSize: 24, minSize: 4, multiLine: true});
                    btn.querySelector(".fit").addEventListener("fit", () => {
                        if (btn.querySelector(".fit").scrollHeight > btn.clientHeight) resizeTextToMaxHeight(btn.querySelector(".fit"), 60, 4);
                    });
                }
                this.fittyInitialized = true;
            }
        },
        generateQuestion() {
            const mcQuestions = this.questionData.filter(el => el.mc > 0);
            const saQuestions = this.questionData.filter(el => el.sa > 0);
            if (mcQuestions.length > 0) {
                const question = mcQuestions[Math.floor(Math.random() * mcQuestions.length)];
                this.currentQuestionIndex = this.questionData.indexOf(question);
                const term = currentSet.terms[question.i];
                const answers = getRandomChoices(3, currentSet.terms.length, question.i);
                this.showQuestion(term, answers);
            } else if (saQuestions.length > 0) {
                const question = saQuestions[Math.floor(Math.random() * saQuestions.length)];
                this.currentQuestionIndex = this.questionData.indexOf(question);
                const term = currentSet.terms[question.i];
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
        showQuestion(term: TermDefinition, answers: number[] = null) {
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
                    const btn = <HTMLButtonElement>this.answerMC.elements[i];
                    const ansTerm = currentSet.terms[answer];
                    applyStyling(ansTerm[this.answerType], btn.querySelector<HTMLSpanElement>(".fit"));
                    preventBreaking(btn.querySelector(".fit"));
                    btn.dataset.answerindex = answer.toString();
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
        processMCResult(answer: number) {
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
            const answer = this.answerSA.value;
            if ("blur" in document.activeElement) (<HTMLInputElement>document.activeElement).blur();
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
            const processedResults = this.questionData
                .filter(el => el.fmc > 0 || el.fsa > 0)
                .sort((a, b) => (b.fmc + b.fsa) - (a.fmc + a.fsa))
                .map((el): [number, string, string] => [el.i, `${currentSet.terms[el.i].term} - ${currentSet.terms[el.i].definition}`, `You missed ${el.fmc} multiple choice question(s) and ${el.fsa} short answer.`]);
            window.temp_learnResults = { setName: currentSet.name, results: processedResults };
            open("/learn-results.html", "learn-results-context", "popup,width=900,height=500");
        },
        init() {
            this.radioBtns.forEach(el => el.addEventListener("change", () => this.generateQuestion()));
            for (const btn of this.answerMC.elements as HTMLCollectionOf<HTMLButtonElement>)
                btn.addEventListener("click", () => this.processMCResult(parseInt(btn.dataset.answerindex)));
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
        btnToggleSettings: document.querySelector<HTMLButtonElement>("#test > div > div:first-child .button"),
        btnNew: document.querySelector<HTMLButtonElement>("#test > div > div:first-child .button:not(.is-dark):not(.is-primary-alt)"),
        btnCheck: document.querySelector<HTMLButtonElement>("#test > div > div:first-child .button.is-primary"),
        radioBtns: document.querySelectorAll("#test input[name='radio-test-answer-with']"),
        checkboxes: [...document.querySelectorAll("#test input[type=checkbox]:not(#check-test-starred)")],
        questionTypeHeaders: document.querySelectorAll("#test > div > fieldset > h2"),
        questionContainers: document.querySelectorAll("#test > div > fieldset > div"),
        questionsFieldset: document.querySelector("#test > div > fieldset"),
        currentMatchMode: 0,
        checkOnlyStarred: <HTMLInputElement>document.getElementById("check-test-starred"),
        fieldMaxTerms: document.querySelector<HTMLInputElement>("#test .field-max-terms"),
        termList: [] as TermDefinition[],
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
            sa: [] as { input: HTMLDivElement; answer: string; }[],
            mc: [] as { inputs: HTMLDivElement[]; answer: number; }[],
            tf: [] as { inputs: HTMLDivElement[]; answer: boolean; }[]
        },
        show() {
            this.setName.innerText = currentSet.name;
            this.generateQuestions();
        },
        /** Make a short answer question - an input box with an accent keyboard */
        makeSAQuestion(question: TermDefinition) {
            const isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            const questionEl = this.questionContainers[0].appendChild(createElement("div", ["field"], {}, [
                createElement("label", ["label"], {innerHTML: styleAndSanitize(question[this.questionType], true)}),
                createElement("div", ["control"], {}, [
                    createElement("input", ["input"], {type: "text", placeholder: "Your Answer", required: true})
                ]),
                createElement("p", ["help"])
            ]));
            if (isStarred) questionEl.querySelector("label").style.color = "goldenrod";
            const accentKeyboard = this.questionContainers[0].appendChild(document.createElement("accent-keyboard"));
            accentKeyboard.initialize(currentSet.specials, questionEl.querySelector("input"))
            return questionEl;
        },
        /**
         * Make a multiple choice question with radio buttons for each answer
         * @param customQuestion Override the question displayed (used for true/false questions)
         */
        makeMCQuestion(question: TermDefinition, answers: string[], container = 1, customQuestion: string = null) {
            const isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            const radioName = `_${crypto.randomUUID()}`;
            const answerRadios = answers.map((answer, i) => createElement("div", ["field"], {}, [
                createElement("input", ["is-checkradio"], {type: "radio", id: `${radioName}-${i}`, required: true, name: radioName}),
                createElement("label", [], {htmlFor: `${radioName}-${i}`, innerHTML: styleAndSanitize(answer, true)})
            ]));
            const questionContainer = this.questionContainers[container].appendChild(createElement("div", ["mb-4"], {}, [
                createElement("h3", ["title", "is-size-5", "mb-2"], {innerHTML: styleAndSanitize(customQuestion || question[this.questionType], true)}, []),
                ...answerRadios
            ]));
            if (isStarred) questionContainer.querySelector("h3").style.color = "goldenrod";
            return answerRadios;
        },
        /** Make a matching question by creating a matching box in both matching question containers */
        makeMTQuestion(question: TermDefinition) {
            const isStarred = window.StarredTerms.isStarred(currentSet.terms.indexOf(question));
            const questionUUID = crypto.randomUUID();
            const div1 = applyStyling(question[this.questionType], this.questionContainers[2].querySelector(":scope > div:first-child").appendChild(createElement("div", ["test-matching-box", "left", "box"], {}, [])));
            div1.dataset.questionId = questionUUID;
            if (isStarred) div1.style.color = "goldenrod";
            const div2 = applyStyling(question[this.answerType], this.questionContainers[2].querySelector(":scope > div:nth-child(2)").appendChild(createElement("div", ["test-matching-box", "right", "box"], {}, [])));
            div2.dataset.questionId = questionUUID;
        },
        /** Draw a line between two divs */
        matchEls(div1: HTMLDivElement, div2: HTMLDivElement) {
            const off1 = getOffset(div1);
            const off2 = getOffset(div2);
            const x1 = off1.left + off1.width;
            const y1 = off1.top + off1.height / 2;
            const x2 = off2.left;
            const y2 = off2.top + off2.height / 2;
            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); //distance formula
            const cx = (x1 + x2 - length) / 2; // center
            const cy = (y1 + y2 - 4) / 2;
            const angle = Math.atan2(y1 - y2, x1 - x2) * 180 / Math.PI; // angle in degrees
            const match = this.questionContainers[2].querySelector(".matches-container").appendChild(document.createElement("div"));
            match.dataset.fromCard = div1.dataset.questionId;
            match.dataset.toCard = div2.dataset.questionId;
            match.style.setProperty("--left", `${cx}px`);
            match.style.setProperty("--top", `${cy}px`);
            match.style.setProperty("--length", `${length}px`);
            match.style.setProperty("--angle", `${angle}deg`);
        },
        /** Rematch two divs if they are already matched (used when resizing) */
        rematchEls(matchEl: HTMLDivElement) {
            const leftEl = document.querySelector<HTMLDivElement>(`.test-matching-box.left[data-question-id='${matchEl.dataset.fromCard}']`);
            const rightEl = document.querySelector<HTMLDivElement>(`.test-matching-box.right[data-question-id='${matchEl.dataset.toCard}']`);
            if (!leftEl || !rightEl) return;
            matchEl.remove();
            this.matchEls(leftEl, rightEl);
        },
        onResize() {
            this.questionContainers[2].querySelectorAll(".matches-container > div").forEach(el => this.rematchEls(el));
        },
        randomizeMatchOptions() {
            const container = this.questionContainers[2].querySelector(":scope > div:nth-child(2)");
            for (let i = container.children.length; i >= 0; i--) container.appendChild(container.children[Math.random() * i | 0]);
        },
        /** Generate questions in each of the categories for the current set */
        generateQuestions() {
            // Reset everything to the initial state
            this.questionsFieldset.classList.remove("has-validated-inputs");
            this.btnCheck.disabled = false;
            this.btnCheck.querySelector("span:last-child").innerText = "Check Answers";
            this.questionContainers[0].textContent = this.questionContainers[1].textContent = this.questionContainers[3].textContent = "";
            this.questionContainers[2].querySelectorAll(":scope > div").forEach(el => el.textContent = "");
            this.questionTypeHeaders.forEach(el => el.dataset.count = "0");


            const groupTypes = this.checkboxes.map(el => el.checked);
            let terms = currentSet.terms;
            const numGroups = groupTypes.filter(el => el).length;
            if (this.checkOnlyStarred.checked && window.StarredTerms.getStarredTermList().length >= numGroups) terms = window.StarredTerms.getStarredTermList();
            this.termList = terms;
            const groups = makeRandomGroups(terms.length, numGroups, this.userMaxQuestions);
            this.questionInputs = { sa: [], mc: [], tf: [] };
            if (groupTypes[0] && groups[0]?.length) {
                const group = groups.shift();
                this.questionInputs.sa = group.map(el => ({ input: this.makeSAQuestion(terms[el]), answer: terms[el][this.answerType] }));
                this.questionTypeHeaders[0].dataset.count = group.length.toString();
            }

            if (groupTypes[1] && groups[0]?.length) {
                const group = groups.shift();
                this.questionInputs.mc = group.map(el => {
                    const choices = getRandomChoices(3, terms.length, el);
                    return ({ inputs: this.makeMCQuestion(terms[el], choices.map(choice => terms[choice][this.answerType])), answer: choices.indexOf(el) });
                });
                this.questionTypeHeaders[1].dataset.count = group.length.toString();
            }

            if (groupTypes[2] && groups[0]?.length) {
                const group = groups.shift();
                group.forEach(el => this.makeMTQuestion(terms[el]));
                this.randomizeMatchOptions();
                this.questionTypeHeaders[2].dataset.count = group.length.toString();
                document.querySelectorAll(".test-matching-box").forEach(box => box.addEventListener("click", this.matchingBoxClickListener));
            }

            if (groupTypes[3] && groups[0]?.length) {
                const group = groups.shift();
                this.questionInputs.tf = group.map(el => {
                    let choiceIsCorrect = Math.random() < 0.5;
                    let answer = terms[el][this.answerType];
                    if (!choiceIsCorrect) {
                        const newAnswer = terms[Math.floor(Math.random() * terms.length)][this.answerType];
                        if (newAnswer === answer) choiceIsCorrect = true;
                        else answer = newAnswer;
                    }
                    const question = `${terms[el][this.questionType]} = ${answer}`;
                    return ({ inputs: this.makeMCQuestion(terms[el], ["True", "False"], 3, question), answer: choiceIsCorrect });
                });
                this.questionTypeHeaders[3].dataset.count = group.length.toString();
            }
            this.questionsFieldset.disabled = false;
            this.currentMatchMode = 0;
        },
        checkAnswers() {
            this.questionsFieldset.classList.add("has-validated-inputs");
            for (const sa of this.questionInputs.sa) {
                if (!sa.input.querySelector("input").reportValidity()) return;
            }
            for (const mc of this.questionInputs.mc) if (!mc.inputs[0].querySelector("input").reportValidity()) return;
            for (const tf of this.questionInputs.tf) if (!tf.inputs[0].querySelector("input").reportValidity()) return;
            this.questionsFieldset.disabled = true;
            document.querySelectorAll(".test-matching-box").forEach(box => box.removeEventListener("click", this.matchingBoxClickListener));
            let numCorrect = 0;
            for (const sa of this.questionInputs.sa) {
                if (checkAnswers(sa.input.querySelector("input").value, sa.answer)) {
                    sa.input.classList.add("correct");
                    sa.input.querySelector<HTMLParagraphElement>(".help").innerText = "Correct!";
                    numCorrect++;
                } else {
                    sa.input.classList.add("incorrect");
                    sa.input.querySelector<HTMLParagraphElement>(".help").innerText = `Incorrect -> ${normalizeAnswer(sa.answer)}`;
                }
            }
            for (const mc of this.questionInputs.mc) {
                const correctAnswer = mc.inputs[mc.answer];
                numCorrect += Number(correctAnswer.querySelector("input").checked);
                mc.inputs.find(el => el.querySelector("input").checked).classList.toggle("incorrect", !correctAnswer.querySelector("input").checked);
                correctAnswer.classList.add("correct");
            }
            for (const match of document.querySelectorAll(".matches-container > div")) {
                const isCorrect = match.dataset.fromCard === match.dataset.toCard;
                numCorrect += Number(isCorrect);
                match.classList.add(isCorrect ? "correct" : "incorrect");
            }
            for (const tf of this.questionInputs.tf) {
                const selectedInput = tf.inputs.find(el => el.querySelector("input").checked);
                const correctAnswer = tf.inputs[tf.answer ? 0 : 1];
                correctAnswer.classList.add("correct");
                if (selectedInput !== correctAnswer) selectedInput.classList.add("incorrect");
                else numCorrect++;
            }
            const total = Math.max(Math.min(this.termList.length, this.userMaxQuestions), 1);
            const percentCorrect = Math.round(numCorrect * 100 / total);
            this.btnCheck.disabled = true;
            this.btnCheck.querySelector("span:last-child").innerText = `${percentCorrect}%`;
            this.questionsFieldset.classList.remove("has-validated-inputs");
        },
        matchingBoxClickListener(e: MouseEvent & { currentTarget: HTMLDivElement }) {
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
                    const possibleMatch = document.querySelector<HTMLDivElement>(`.matches-container > div[data-${direction}-card="${e.currentTarget.dataset.questionId}"]`);
                    if (possibleMatch) {
                        const rightEl = document.querySelector<HTMLDivElement>(`.test-matching-box.${otherEl}.chosen[data-question-id="${possibleMatch.dataset.toCard}"]`);
                        rightEl?.classList.remove("chosen");
                        possibleMatch.remove();
                    }
                    for (const el of document.querySelectorAll(".test-matching-box.selected")) {
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
                    const leftEl = document.querySelector<HTMLDivElement>(".test-matching-box.left.selected");
                    const rightEl = document.querySelector<HTMLDivElement>(".test-matching-box.right.selected");
                    let el: HTMLDivElement;
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
                    const possibleMatch = document.querySelector<HTMLDivElement>(`.matches-container > div[data-${direction}-card="${e.currentTarget.dataset.questionId}"]`);
                    if (possibleMatch) {
                        const pLeftEl = document.querySelector(`.test-matching-box.${other}.chosen[data-question-id="${possibleMatch.dataset[`${otherDirection}Card`]}"]`);
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
        checkOnlyStarred: <HTMLInputElement>document.getElementById("check-match-starred"),
        onlyStarred: false,
        interval: null,
        startTime: null as number,
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
            start(this: HTMLDivElement, e: DragEvent) {
                this.style.opacity = "0.6";
                e.dataTransfer.effectAllowed = "move";
                pages.match.dragEvents.currentDragged = this;
                pages.match.dragEvents.currentClickDragged = null;
            },
            end(this: HTMLDivElement) {
                this.style.opacity = "1";
                document.querySelectorAll(".dropzone-card .over").forEach(el => el.classList.remove("over"));
                pages.match.dragEvents.currentClickDragged = null;
            },
            over(e: DragEvent) {
                e.preventDefault();
                return false;
            },
            enter(this: HTMLDivElement) {
                this.querySelector("div:last-child").classList.add("over");
            },
            leave(this: HTMLDivElement) {
                this.querySelector("div:last-child").classList.remove("over");
            },
            drop(this: HTMLDivElement, e: DragEvent) {
                e.stopPropagation();
                e.preventDefault();
                if (this.querySelector("div:last-child").children[0]) pages.match.termsContainer.children[0].appendChild(this.querySelector("div:last-child").children[0]);
                this.querySelector("div:last-child").appendChild(pages.match.dragEvents.currentDragged);
                pages.match.checkAnswers();
                pages.match.dragEvents.currentClickDragged = null;
                return false;
            },
            dragClick(this: HTMLDivElement, e: DragEvent) {
                e.stopPropagation();
                pages.match.dragEvents.currentDragged = null;
                pages.match.dragEvents.currentClickDragged = (pages.match.dragEvents.currentClickDragged === this) ? null : this;
            },
            dropClick(this: HTMLDivElement) {
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
        makeDraggableCard(text: string, questionId: string, index: number) {
            const card = createElement("div", ["draggable-card", "box", "mb-0", "notification", "is-primary", "p-4"], { draggable: true, innerHTML: styleAndSanitize(text, true), dataset: { questionId } });
            card.addEventListener("dragstart", this.dragEvents.start);
            card.addEventListener("dragend", this.dragEvents.end);
            card.addEventListener("click", this.dragEvents.dragClick, true);
            if (this.onlyStarred || window.StarredTerms.isStarred(index)) card.style.backgroundColor = "goldenrod";
            return card;
        },
        makeDropzoneCard(text: string, questionId: string) {
            const card = createElement("div", ["dropzone-card", "box", "mb-0", "p-1"],  {dataset: { questionId }}, [
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
            for (const el of this.termsContainer.children) el.textContent = "";
            let terms = currentSet.terms;
            if (this.checkOnlyStarred.checked) {
                terms = window.StarredTerms.getStarredTermList();
                this.onlyStarred = true;
            } else this.onlyStarred = false;
            const included = getRandomChoices(10, terms.length, null, true)
            this.startTime = Date.now();
            const leftCards = [];
            const rightCards = [];
            (this.questionType === "term") ?
                included.forEach(num => {
                    const { term, definition } = terms[num];
                    const id = `_${crypto.randomUUID()}`;
                    leftCards.push(this.makeDraggableCard(term, id, num));
                    rightCards.push(this.makeDropzoneCard(definition, id));
                }) :
                included.forEach(num => {
                    const { term, definition } = terms[num];
                    const id = `_${crypto.randomUUID()}`;
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
            this.termsContainer.querySelectorAll<HTMLDivElement>(".dropzone-card")
                .forEach(el => el.style.border = 
                    (el.querySelector("div:last-child").children[0] && (<HTMLDivElement>el.querySelector("div:last-child").children[0]).dataset.questionId !== el.dataset.questionId)
                    ? "1px solid red" : "none"
                );
            for (const child of this.termsContainer.querySelectorAll<HTMLDivElement>(".dropzone-card")) {
                const id = child.dataset.questionId;
                const dropzone = child.querySelector("div:last-child");
                if (id && dropzone) {
                    if (id !== (dropzone.children[0] as HTMLDivElement)?.dataset?.questionId) return;
                } else return
            }
            this.clearTimer();
            const totalTime = (Date.now() - this.startTime) / 1000;
            await this.showLeaderboard(totalTime);
            this.completedDialog.root.querySelector(".field-time-taken").innerText = totalTime.toFixed(2);
            this.completedDialog.open();
        },
        async showLeaderboard(time: number) {
            if (!currentMatchLeaderboard) {
                const query = new QueryBuilder()
                    .select("name", "leaderboard")
                    .from("social")
                    .orderBy(["leaderboard"], "ASCENDING");
                const l = Social.fromMultiple(await Firestore.getDocuments(query.build(), undefined, `/sets/${currentSet.id}`));
                currentMatchLeaderboard = l.map(({ name, leaderboard, id }) => ({ name: name, time: leaderboard, uid: id }));
            }
            const currentUser = await refreshCurrentUser(auth);
            if (!this.onlyStarred && currentUser) {
                const possibleExisting = currentMatchLeaderboard.find(el => el.uid === currentUser.uid);
                if (possibleExisting) {
                    if (possibleExisting.time > time) possibleExisting.time = time;
                    else time = possibleExisting.time;
                } else currentMatchLeaderboard.push({ name: currentUser.displayName, uid: currentUser.uid, time });

                await Firestore.updateDocument(
                    `sets/${currentSet.id}/social`,
                    currentUser.uid,
                    { leaderboard: time, name: currentUser.displayName, uid: currentUser.uid },
                    currentUser.token.access,
                    true
                );
            }

            const actualLeaderboard = [...currentMatchLeaderboard]; // clone the array so we can sort in place

            if (this.onlyStarred) actualLeaderboard.push({ name: "Play a full round to save!", time });
            else if (!currentUser) actualLeaderboard.push({ name: "Sign in to save!", time });

            actualLeaderboard.sort((a, b) => a.time - b.time);

            this.completedDialogList.textContent = "";
            for (const [i, item] of actualLeaderboard.entries()) {
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
                    const time = ((Date.now() - this.startTime) / 1000).toFixed(1);
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
            this.completedDialog.onuserclose = (action: string) => {
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
 * @param text Text to style with markdown and sanitize
 * @param el The element to put the styled text in
 * @returns The element with the text
 */
function applyStyling<T extends HTMLElement>(text: string, el: T): T {
    el.innerHTML = styleAndSanitize(text, true);
    return el;
}
/**
 * Makes a list of random numbers
 * @param num The number of elements in the outputted list
 * @param max 1 + the max any element in the list can be
 * @param numToInclude An optional number to include in the list
 * @param canBeSmaller If the length of the outputted list can be smaller if max is not big enough
 */
function getRandomChoices(num: number, max: number, numToInclude?: number, canBeSmaller = false) {
    const nums: number[] = [];
    if (canBeSmaller) num = Math.min(num, max);
    if (num > max - ((numToInclude === null) ? 0 : 1)) return nums;
    for (let i = 0; i < 100000; i++) {
        if (nums.length >= num) break;
        const rand = Math.floor(Math.random() * max);
        if (!nums.includes(rand) && rand !== numToInclude) nums.push(rand);
    }
    if (numToInclude !== null) nums.splice(Math.floor(Math.random() * (num + 1)), 0, numToInclude);
    return nums;
}
// TODO: figure out this function
function makeRandomGroups(max: number, numGroups: number, aMax: number) {
    const numIncluded = Math.min(aMax, max);
    const nums = getRandomChoices(numIncluded, max, null);
    const baseVal = Math.floor(numIncluded / numGroups);
    const extra = numIncluded % numGroups;
    const groups = Array(numGroups).fill(baseVal).fill(baseVal + 1, 0, extra).map(el => nums.splice(0, el));
    return groups;
}
function getOffset(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    return {
        left: el.offsetLeft,
        top: el.offsetTop,
        width: rect.width || el.offsetWidth,
        height: rect.height || el.offsetHeight
    };
}
// #endregion UTILITIES

// #region CARD GENERATION
function createTermCard({ term, definition }, index, isStarred) {
    const cardEl = createElement("div", ["box", "is-relative"], {}, [
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
function showLikeStatus(likeStatus?: boolean) {
    pages.setOverview.btnLike.querySelector("i").classList.toggle("is-filled", Boolean(likeStatus));
}

async function getShortenedSetUrl() {
    const longDynamicLinkObj = new URL("https://set.vocabustudy.org/");
    longDynamicLinkObj.searchParams.set("link", `https://vocabustudy.org${location.pathname}`);
    longDynamicLinkObj.searchParams.set("st", `${currentSet.name} - Vocabustudy`);
    longDynamicLinkObj.searchParams.set("sd", currentSet.description || `Study this set with ${currentSet.terms.length} terms on Vocabustudy`);
    const longDynamicLink = longDynamicLinkObj.href;
    const res = await fetch("https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyDU-lvyggKhMHuEllAEpXZ3y_TyPOGfXBM", {
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
    const { shortLink } = await res.json();
    return shortLink;
}

async function initialize(user: User) {
    initialized = true;
    pages.flashcards.init();
    pages.learn.init();
    pages.test.init();
    pages.match.init();
    if (setType === "timeline") {
        pages.setOverview.terms.style.justifyContent = "left";
        document.querySelectorAll(".study-modes > :not([href='#flashcards'])").forEach(el => el.hidden = true);
    }
    try {
        currentSet = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, setId, undefined, user?.token.access)) as VocabSet<TermDefinition[]>;
        if (!currentSet) return location.replace("/404/");
        currentSet.terms.forEach(term => {
            term.term = term.term.replace(/[\u2018\u2019]/g, "'");
            term.definition = term.definition.replace(/[\u2018\u2019]/g, "'");
        });

        // Store special characters for the accent keyboard
        currentSet.specials = currentSet.terms.map(el => [[...el.term.matchAll(accentsRE)].map(el => el[0]), [...el.definition.matchAll(accentsRE)].map(el => el[0])]).flat(2);
        currentSet.specials = currentSet.specials.concat(currentSet.specials.map(el => el.toUpperCase()));
        currentSet.specials = [...new Set(currentSet.specials)].sort(specialCharCollator);

        // Set the open graph tags
        document.querySelector("meta[property='og:title']").content = document.title = `${currentSet.name} - Vocabustudy`;
        document.querySelector("meta[name=description]").content = document.querySelector("meta[property='og:description']").content = currentSet.description || `${currentSet.terms.length} terms`;
        const quizJsonLD = {
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
        pages.setOverview.numTerms.innerText = currentSet.terms.length.toString();
        const starredList = window.StarredTerms.getCurrentSet();
        for (const [i, term] of currentSet.terms.entries()) createTermCard(term, i, starredList.includes(i));
        navigate();
        initQuickview(pages.comment.quickview, pages.comment.btnShowComments);

        // Events
        document.addEventListener("keyup", e => {
            if (location.hash === "#flashcards") pages.flashcards.onKeyUp(e);
            else if (location.hash === "#learn") pages.learn.onKeyUp(e);
        });
        document.addEventListener("click", async (e: MouseEvent & { target: HTMLElement }) => {
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
            resizeTimeout = window.setTimeout(() => {
                if (location.hash === "#test") pages.test.onResize();
            }, 100);
        })
        pages.setOverview.btnLike.addEventListener("click", async () => {
            // If the user is logged in, toggle the like status. Otherwise, navigate to the login page.
            const currentUser = await refreshCurrentUser(auth);
            if (currentUser) {
                const currentLikeStatus = pages.setOverview.btnLike.querySelector("i").classList.contains("is-filled");
                await Firestore.updateDocument(`${VocabSet.collectionKey}/${setId}/${Social.collectionKey}`, currentUser.uid, { like: !currentLikeStatus, name: currentUser.displayName, uid: currentUser.uid }, user?.token.access, true);
                showLikeStatus(!currentLikeStatus);
            } else navigateLoginSaveState();
        });
        addShowCommentsClickListener(pages.comment, setId, user?.uid);
        pages.comment.inputComment.addEventListener("input", () => pages.comment.btnSaveComment.disabled = false);
        pages.comment.btnSaveComment.addEventListener("click", async () => {
            const currentUser = await refreshCurrentUser(auth);
            if (currentUser && pages.comment.inputComment.reportValidity()) {
                await Firestore.updateDocument(`${VocabSet.collectionKey}/${setId}/${Social.collectionKey}`, currentUser.uid, { comment: pages.comment.inputComment.value, name: currentUser.displayName, uid: currentUser.uid }, user.token.access, true);
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
            const shortLink = await getShortenedSetUrl();
            pages.setOverview.btnShorten.disabled = true;
            pages.setOverview.shareLink.innerText = shortLink;
            pages.setOverview.shareLink.href = shortLink;
        });

        // Share Modal
        pages.setOverview.modalExportTerms.root.querySelector("pre").innerText = currentSet.terms.map(el => `${el.term}  ${el.definition}`).join("\n");
        pages.setOverview.shareLink.innerText = `https://vocabustudy.org${location.pathname}`;
        pages.setOverview.shareLink.href = `https://vocabustudy.org${location.pathname}`;
        new window.QRCode(document.getElementById("set-qrcode"), `https://vocabustudy.org${location.pathname}`);
        if (!navigator.share) pages.setOverview.btnShare.hidden = true;
        else pages.setOverview.btnShare.addEventListener("click", () => navigator.share({title: `${currentSet.name} - Vocabustudy`, text: currentSet.description || `Study this set with ${currentSet.terms.length} terms on Vocabustudy`, url: pages.setOverview.shareLink.href}));
        if (!navigator.clipboard.write) pages.setOverview.btnCopyQrcode.hidden = true;
        else pages.setOverview.btnCopyQrcode.addEventListener("click", async () => {
            const qrcodeBlob = await (await fetch(document.querySelector("#set-qrcode img").src)).blob();
            await navigator.clipboard.write([new ClipboardItem({"image/png": qrcodeBlob})]);
            pages.setOverview.btnCopyQrcode.querySelector("i").textContent = "inventory";
            setTimeout(() => pages.setOverview.btnCopyQrcode.querySelector("i").textContent = "content_paste", 500);
        });
        document.querySelector(".page-loader").hidden = true;
    } catch (err) {
        if (err.message.includes("Forbidden") || err.message === "PERMISSION_DENIED") {
            console.error(err);
            if (await getCurrentUser()) await setCurrentUser(auth, null);
            navigateLoginSaveState();
            return;
        } else throw err;
    }
}

addEventListener("hashchange", () => navigate());