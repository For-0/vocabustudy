import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, createTextFieldWithHelper, normalizeAnswer, checkAnswers, initQuickview, styleAndSanitize } from "./utils.js";
import { toast } from "bulma-toast";
import Tabs from "@vizuaalog/bulmajs/src/plugins/tabs";

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
        if (this.question.type == 0) return this.radios[0].reportValidity();
        else if (this.question.type == 1) return this.input.querySelector("input").reportValidity();
    }
    get correct() {
        if (this.question.type == 0) return this.correctOption.checked;
        else if (this.question.type == 1) {
            let isCorrect = this.question.answers.some(el => checkAnswers(el, this.input.querySelector("input").value));
            this.input.nextElementSibling.innerText = isCorrect ? "Correct!" : `Incorrect -> ${normalizeAnswer(this.question.answers[0])}`;
            this.input.nextElementSibling.hidden = false;
            return isCorrect;
        } else return false;
    }
    /**
     * @param {boolean} value
     */
    set disabled(value) {
        if (this.question.type == 0) this.radios.forEach(el => el.disabled = value);
        else if (this.question.type == 1) this.input.querySelector("input").disabled = value;
    }
    createMCInput(answer) {
        let optionId = `_${crypto.randomUUID()}`;
        let radioButton = this.appendChild(createElement("div", ["field"], {}, [
            createElement("input", ["is-checkradio"], {id: optionId, required: true, type: "radio", name: this.questionId}),
            createElement("label", [], {htmlFor: optionId, innerHTML: styleAndSanitize(answer, true)})
        ]));
        return radioButton.firstElementChild;
    }
    createSAInput() {
        let input = createTextFieldWithHelper("Answer", "howdy", { required: true });
        this.append(input.textField, input.helperLine);
        input.helperLine.hidden = true;
        return input.textField;
    }
    showQuestion() {
        this.appendChild(createElement("p", ["is-size-5"], { innerHTML: styleAndSanitize(`**${this.question.question}**`, true) }));
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
        this.classList.add("is-block", "mb-4");
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
/** @type {import("firebase/firestore/lite").DocumentReference<import("firebase/firestore/lite").DocumentData>?} */
let socialRef = null;
/**
 * @type {{name: string, visibility: number|string[], terms: {term: string, definition: string}[], uid: string}?}
 */
let currentSet = null;

const pages = {
    setOverview: {
        el: document.getElementById("home"),
        name: document.querySelector("#home .field-name"),
        description: document.querySelector("#home .field-description"),
        numTerms: document.querySelector("#home .field-num-terms"),
        terms: document.querySelector("#home .tabs-content ul"),
        termNav: document.querySelector("#home .tabs ul"),
        btnLike: document.querySelector("#home .btn-like"),
    },
    comment: {
        quickview: document.querySelector("#home .quickview"),
        container: document.querySelector("#home .quickview-body .list"),
        inputComment: document.getElementById("input-user-comment"),
        btnSaveComment: document.querySelector("#home .quickview-footer button"),
        btnShowComments: document.querySelector("#home .btn-show-comments")
    }
};

function showLikeStatus(likeStatus) {
    pages.setOverview.btnLike.querySelector("i").classList.toggle("is-filled", likeStatus);
}

function createItem(item, index) {
    let navBtn = pages.setOverview.termNav.appendChild(createElement("li", [], {}, [
        createElement("a", ["is-relative", "has-text-dark"], { role: "button" }, [
            createElement("span", ["icon"], {}, [
                createElement("i", ["material-symbols-rounded"], { innerText: item.type ? "checklist" : "text_snippet" })
            ]),
            createElement("span", [], { innerText: item.title })
        ])
    ]));
    if (index === 0) navBtn.classList.add("is-active");
    if (item.type === 0) {
        let cardEl = createElement("li", ["guide-item"], {}, [
            createElement("h2", ["title", "is-4"], { innerHTML: styleAndSanitize("# " + item.title) }),
            createElement("div", ["content"], { innerHTML: styleAndSanitize(item.body) })
        ]);
        if (index === 0) cardEl.classList.add("is-active");
        return pages.setOverview.terms.appendChild(cardEl);
    } else if (item.type === 1) {
        let questionEls = item.questions.map(question => createElement("quiz-question", [], { question }));
        let btnCheck = createElement("div", ["mt-4"], {}, [createElement("button", ["button", "is-primary"], {innerText: "Check"})]);
        let cardEl = createElement("li", ["guide-item"], {}, [
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
                    let numCorrect = cardEl.querySelectorAll(".correct").length;
                    btnCheck.firstElementChild.innerText = `${(numCorrect/questionEls.length).toFixed(2) * 100}% - Restart`;
                }
            } else {
                btnCheck.firstElementChild.innerText = "Check";
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
function shuffle(arr) {
    let currentIndex = arr.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
}

addEventListener("DOMContentLoaded", async () => {
    try {
        let setSnap = await getDoc(setRef);
        if (!setSnap.exists()) return location.href = "/404";
        currentSet = setSnap.data();
        document.title = `${currentSet.name} - Vocabustudy`;
        currentSet.terms.filter(el => el.type === 0).forEach(term => {
            term.title = term.title.replace(/[\u2018\u2019]/g, "'");
            term.body = term.body.replace(/[\u2018\u2019]/g, "'");
        });

        // Events
        pages.setOverview.name.innerText = currentSet.name;
        pages.setOverview.description.innerHTML = styleAndSanitize(currentSet.description || "");
        pages.setOverview.numTerms.innerText = currentSet.terms.length;
        for (let [i, term] of currentSet.terms.entries()) createItem(term, i);
        new Tabs(document.querySelector("#home .tabs-wrapper")).tabs();
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
        initQuickview(pages.comment.quickview, pages.comment.btnShowComments);
        document.querySelector(".page-loader").hidden = true;
    } catch (err) {
        console.error(err);
        if (err.message.includes("Forbidden") || err.code === "permission-denied") {
            localStorage.setItem("redirect_after_login", location.href);
            if (auth.currentUser) await auth.signOut();
            location.href = "/#login";
            return;
        } else window.sentryCaptureException?.call(globalThis, err)
    }
});