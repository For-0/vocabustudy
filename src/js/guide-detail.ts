import { createElement, createTextFieldWithHelper, normalizeAnswer, checkAnswers, initQuickview, styleAndSanitize, navigateLoginSaveState, addShowCommentsClickListener, shuffle } from "./utils";
import { toast } from "bulma-toast";
import Tabs from "@vizuaalog/bulmajs/src/plugins/tabs";
import { getCurrentUser, initializeAuth, refreshCurrentUser, setCurrentUser } from "./firebase-rest-api/auth";
import type { StudyGuideQuiz, StudyGuideQuizQuestion, StudyGuideReading, User } from "./types";
import { Firestore, Social, VocabSet } from "./firebase-rest-api/firestore";

declare global {
    interface HTMLElementTagNameMap {
        "quiz-question": QuizQuestion
    }
}

class QuizQuestion extends HTMLElement {
    questionId: string;
    question: StudyGuideQuizQuestion;
    radios: HTMLInputElement[] = [];
    correctOption: HTMLInputElement;
    input: HTMLDivElement;
    constructor() {
        super();
        this.questionId = `_${crypto.randomUUID()}`;
    }
    /**
     * Initialize the quiz question and create the elements if connected
     * @param question The initial data for the quiz question
     */
    initialize(question: StudyGuideQuizQuestion) {
        this.question = question;
        if (this.isConnected) this.showQuestion();
    }
    reportValidity() {
        if (this.question.type == 0) return this.radios[0].reportValidity();
        else if (this.question.type == 1) return this.input.querySelector("input").reportValidity();
    }
    get correct() {
        if (this.question.type == 0) return this.correctOption.checked;
        else if (this.question.type == 1) {
            const isCorrect = this.question.answers.some(el => checkAnswers(el, this.input.querySelector("input").value));
            (this.input.nextElementSibling as HTMLParagraphElement).innerText = isCorrect ? "Correct!" : `Incorrect -> ${normalizeAnswer(this.question.answers[0])}`;
            (this.input.nextElementSibling as HTMLParagraphElement).hidden = false;
            return isCorrect;
        } else return false;
    }
    set disabled(value: boolean) {
        if (this.question.type == 0) this.radios.forEach(el => el.disabled = value);
        else if (this.question.type == 1) this.input.querySelector("input").disabled = value;
    }
    createMCInput(answer: string) {
        const optionId = `_${crypto.randomUUID()}`;
        const radioButton = this.appendChild(createElement("div", ["field"], {}, [
            createElement("input", ["is-checkradio"], {id: optionId, required: true, type: "radio", name: this.questionId}),
            createElement("label", [], {htmlFor: optionId, innerHTML: styleAndSanitize(answer, true)})
        ]));
        return radioButton.firstElementChild as HTMLInputElement;
    }
    createSAInput() {
        const input = createTextFieldWithHelper("Answer", "howdy", { required: true });
        this.append(input.textField, input.helperLine);
        input.helperLine.hidden = true;
        return input.textField;
    }
    showQuestion() {
        this.appendChild(createElement("p", ["is-size-5"], { innerHTML: styleAndSanitize(`**${this.question.question}**`, true) }));
        if (this.question.type == 0) {
            const shuffledOptions = [...this.question.answers];
            shuffle(shuffledOptions);
            const correctIndex = shuffledOptions.indexOf(this.question.answers[0]);
            this.radios = shuffledOptions.map(option => this.createMCInput(option));
            this.correctOption = this.radios[correctIndex];
        } else if (this.question.type == 1)
            this.input = this.createSAInput();
    }
    connectedCallback() {
        this.textContent = "";
        this.classList.add("is-block", "mb-4");
        if (this.question) this.showQuestion();
    }
}
window.customElements.define("quiz-question", QuizQuestion);

const auth = initializeAuth(async user => {
    if (!initialized) initialize(user);
    if (user) {
        const socialDoc = Social.fromSingle(await Firestore.getDocument(`${VocabSet.collectionKey}/${setId}/${Social.collectionKey}`, user.uid));
        showLikeStatus(socialDoc?.like);
    } else showLikeStatus(false);
});

const [, setId] = decodeURIComponent(location.pathname).match(/\/guide\/([\w ]+)\/view\/?/) || (location.pathname = "/");

/**
 * @type {{name: string, visibility: number|string[], terms: {term: string, definition: string}[], uid: string}?}
 */
let currentSet: VocabSet<(StudyGuideQuiz|StudyGuideReading)[]> = null;
let initialized = false;

const pages = {
    setOverview: {
        el: document.getElementById("home"),
        name: document.querySelector<HTMLHeadingElement>("#home .field-name"),
        description: document.querySelector("#home .field-description"),
        numTerms: document.querySelector<HTMLSpanElement>("#home .field-num-terms"),
        terms: document.querySelector<HTMLUListElement>("#home .tabs-content ul"),
        termNav: document.querySelector("#home .tabs ul"),
        btnLike: document.querySelector("#home .btn-like"),
    },
    comment: {
        quickview: document.querySelector<HTMLDivElement>("#home .quickview"),
        container: document.querySelector<HTMLDivElement>("#home .quickview-body .list"),
        inputComment: document.querySelector<HTMLInputElement>("#input-user-comment"),
        btnSaveComment: document.querySelector<HTMLButtonElement>("#home .quickview-footer button"),
        btnShowComments: document.querySelector<HTMLButtonElement>("#home .btn-show-comments")
    }
};

function showLikeStatus(likeStatus?: boolean) {
    pages.setOverview.btnLike.querySelector("i").classList.toggle("is-filled", Boolean(likeStatus));
}

function createItem(item: StudyGuideQuiz | StudyGuideReading, index: number) {
    const navBtn = pages.setOverview.termNav.appendChild(createElement("li", [], {}, [
        createElement("a", ["is-relative", "has-text-dark"], { role: "button" }, [
            createElement("span", ["icon"], {}, [
                createElement("i", ["material-symbols-rounded"], { innerText: item.type ? "checklist" : "text_snippet" })
            ]),
            createElement("span", [], { innerText: item.title })
        ])
    ]));
    if (index === 0) navBtn.classList.add("is-active");
    if (item.type === 0) {
        const cardEl = createElement("li", ["guide-item"], {}, [
            createElement("h2", ["title", "is-4"], { innerHTML: styleAndSanitize("# " + item.title) }),
            createElement("div", ["content"], { innerHTML: styleAndSanitize(item.body) })
        ]);
        if (index === 0) cardEl.classList.add("is-active");
        return pages.setOverview.terms.appendChild(cardEl);
    } else if (item.type === 1) {
        const questionEls = item.questions.map(question => createElement("quiz-question", [], { question }));
        const btnCheck = createElement("div", ["mt-4"], {}, [createElement("button", ["button", "is-primary"], {innerText: "Check"})]);
        const cardEl = createElement("li", ["guide-item"], {}, [
            createElement("h2", ["title", "is-4"], { innerHTML: styleAndSanitize("# " + item.title) }),
            createElement("div", [], {}, [...questionEls, btnCheck])
        ]);
        btnCheck.firstElementChild.addEventListener("click", () => {
            if (btnCheck.innerText === "Check") {
                if (questionEls.every(el => el.reportValidity())) {
                    questionEls.forEach(el => {
                        el.classList.add(el.correct ? "correct" : "incorrect");
                        el.correctOption?.classList.add("option-correct");
                        el.disabled = true;
                    });
                    const numCorrect = cardEl.querySelectorAll(".correct").length;
                    (btnCheck.firstElementChild as HTMLSpanElement).innerText = `${Math.round(numCorrect * 100 / questionEls.length)}% - Restart`;
                }
            } else {
                (btnCheck.firstElementChild as HTMLSpanElement).innerText = "Check";
                questionEls.forEach(el => {
                    el.classList.remove("correct", "incorrect");
                    el.connectedCallback()
                });
            }
        });
        if (index === 0) cardEl.classList.add("is-active");
        return pages.setOverview.terms.appendChild(cardEl);
    }
}

async function initialize(user: User) {
    initialized = true;
    try {
        currentSet = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, setId, [], user?.token.access)) as VocabSet<(StudyGuideQuiz|StudyGuideReading)[]>;
        if (!currentSet) return location.replace("/404/");
        document.title = `${currentSet.name} - Vocabustudy`;
        currentSet.terms.filter(el => el.type === 0).forEach((term: StudyGuideReading) => {
            term.title = term.title.replace(/[\u2018\u2019]/g, "'");
            term.body = term.body.replace(/[\u2018\u2019]/g, "'");
        });
        // Events
        pages.setOverview.name.innerText = currentSet.name;
        pages.setOverview.description.innerHTML = styleAndSanitize(currentSet.description || "");
        pages.setOverview.numTerms.innerText = currentSet.terms.length.toString();
        for (const [i, term] of currentSet.terms.entries()) createItem(term, i);
        new Tabs(document.querySelector("#home .tabs-wrapper")).tabs();
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
        initQuickview(pages.comment.quickview, pages.comment.btnShowComments);
        document.querySelector<HTMLDivElement>(".page-loader").hidden = true;
    } catch (err) {
        if (err.message.includes("Forbidden") || err.message === "PERMISSION_DENIED") {
            console.error(err);
            if (await getCurrentUser()) await setCurrentUser(auth, null);
            navigateLoginSaveState();
            return;
        } else throw err;
    }
}
