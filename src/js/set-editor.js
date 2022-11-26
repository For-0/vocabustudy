import { MDCDialog } from "@material/dialog/index";
import { MDCRipple } from "@material/ripple/index";
import { MDCFormField } from "@material/form-field/index";
import { MDCRadio } from "@material/radio/index";
import { MDCSwitch } from "@material/switch/index";
import { MDCTextField } from "@material/textfield/index";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, createTextFieldWithHelper, getBlooketSet, getWords, showCollections } from "./utils.js";
import { MDCSnackbar } from "@material/snackbar/component.js";

class QuizQuestion extends HTMLElement {
    constructor() {
        super();
    }
    /**
     * Initialize the quiz question and create the elements if connected
     * @param {{question: string, answers: String[], type: 0|1}} question The initial data for the quiz question
     */
    initialize(question) {
        this.initialQuestion = question;
        if (this.isConnected) this.showQuestion();
    }
    get question() {
        let answers = [...this.querySelectorAll(".answer-input input")].map(el => el.value.trim()).filter(el => el);
        if (answers.length < 1) answers = ["True", "False"];
        return {
            question: this.questionInput.value,
            answers,
            type: parseInt(this.querySelector("input[type=radio]:checked").value)
        }
    }
    createAnswerInput(answer) {
        let input = createTextFieldWithHelper("Answer", null, {maxLength: 500}).obj;
        input.value = answer;
        this.appendChild(input.root);
        input.layout();
        input.root.classList.add("answer-input");
        input.listen("input", () => {
            if (input.root.nextElementSibling?.nodeName !== "LABEL") this.createAnswerInput("");
            else if (input.value === "" && input.root.nextElementSibling?.nodeName === "LABEL" && input.root.nextElementSibling.querySelector("input").value === "") input.root.nextElementSibling.remove();
        });
        return input;
    }
    showQuestion() {
        this.questionInput = createTextFieldWithHelper("Question", null, {required: true, maxLength: 500}).obj;
        this.questionInput.root.style.width = "90%";
        this.questionInput.value = this.initialQuestion.question;
        this.appendChild(this.questionInput.root);
        this.deleteButton = createElement("button", ["mdc-icon-button", "btn-delete"], {type: "button"}, [
            createElement("div", ["mdc-icon-button__ripple"]),
            createElement("i", ["material-icons-round"], {innerText: "delete"})
        ]);
        this.appendChild(this.deleteButton);
        MDCRipple.attachTo(this.deleteButton).unbounded = true;
        this.deleteButton.addEventListener("click", () => this.remove());
        let questionId = `_${crypto.randomUUID()}`;
        let answerTypes = createElement("div", [], {}, [
            createElement("div", ["mdc-form-field"], {}, [
                createElement("div", ["mdc-radio", "mdc-radio--touch"], {}, [
                    createElement("input", ["mdc-radio__native-control"], {type: "radio", value: "0", name: questionId, id: `${questionId}-0`}),
                    createElement("div", ["mdc-radio__background"], {}, [
                        createElement("div", ["mdc-radio__outer-circle"]),
                        createElement("div", ["mdc-radio__inner-circle"])
                    ]),
                    createElement("div", ["mdc-radio__ripple"])
                ]),
                createElement("label", [], {innerText: "Multiple Choice", htmlFor: `${questionId}-0`})
            ]),
            createElement("div", ["mdc-form-field"], {}, [
                createElement("div", ["mdc-radio", "mdc-radio--touch"], {}, [
                    createElement("input", ["mdc-radio__native-control"], {type: "radio", value: "1", name: questionId, id: `${questionId}-1`}),
                    createElement("div", ["mdc-radio__background"], {}, [
                        createElement("div", ["mdc-radio__outer-circle"]),
                        createElement("div", ["mdc-radio__inner-circle"])
                    ]),
                    createElement("div", ["mdc-radio__ripple"])
                ]),
                createElement("label", [], {innerText: "Short Answer", htmlFor: `${questionId}-1`})
            ])
        ]);
        let radioObjs = [...answerTypes.querySelectorAll(".mdc-form-field")].map(el => MDCFormField.attachTo(el).input = new MDCRadio(el.firstElementChild));
        radioObjs[this.initialQuestion.type].checked = true;
        this.appendChild(answerTypes);
        this.initialQuestion.answers.push("");
        this.initialQuestion.answers.map(el => this.createAnswerInput(el));
    }
    connectedCallback() {
        this.textContent = "";
        if (this.initialQuestion) this.showQuestion();
    }
}
customElements.define("quiz-question", QuizQuestion);

const setId = decodeURIComponent(location.pathname).match(/\/set\/([\w- ]+)\/edit\/?/)[1] || (location.pathname = "/");
let setType = 0;
let creator = null;
const blooketDashboardRe = /https:\/\/dashboard\.blooket\.com\/set\/(\w+)\/?/;
const blooketHwRe = /https:\/\/play\.blooket\.com\/play\?hwId=(\w+)/;
const {db, auth} = initialize(async user => {
    if (!user) {
        localStorage.setItem("redirect_after_login", location.href);
        location.href = "/#login";
    } else if (setId.match(/^new(-\w+)?$/)) {
        switch(setId) {
            case "new":
                document.title = "New Set - Vocabustudy";
                document.querySelector("h1").innerText = "New Set";
                document.querySelector("h2").childNodes[0].textContent = "Vocabulary Words";
                setType = 0;
                fields.btnAddQuiz.hidden = true;
                break;
            case "new-timeline":
                document.title = "New Timeline - Vocabustudy";
                document.querySelector("h1").innerText = "New Timeline";
                document.querySelector("h2").childNodes[0].textContent = "Timeline Items";
                fields.btnAddQuiz.hidden = true;
                setType = 1;
                break;
            case "new-guide":
                document.title = "New Guide - Vocabustudy";
                document.querySelector("h1").innerText = "New Study Guide";
                document.querySelector("h2").childNodes[0].textContent = "Guide Items";
                setType = 2;
                fields.btnAddQuiz.hidden = true;
                break;
            default:
                goBack();
        }
        fields.terms.textContent = "";
        fields.public.selected = false;
        fields.collections.querySelectorAll("input:checked").forEach(el => el.checked = false);
        creator = user.displayName;
    } else {
        let setSnap = await getDoc(doc(db, "sets", setId));
        let setMetaSnap = await getDoc(doc(db, "meta_sets", setId));
        if (!setSnap.exists() || !setMetaSnap.exists()) return location.href = "/404";
        let userIdToken = await user.getIdTokenResult();
        let isAdmin = userIdToken.claims.admin;
        const currentSet = setSnap.data();
        const currentSetMeta = setMetaSnap.data();
        if (!isAdmin && currentSet.uid !== user.uid) {
            localStorage.setItem("redirect_after_login", location.href);
            await auth.signOut();
            location.href = "/#login";
        }
        document.title = `Edit ${currentSet.name} - Vocabustudy`;
        fields.setName.value = currentSet.name;
        if (currentSet.description)
            fields.setDescription.value = currentSet.description;
        fields.public.selected = currentSet.public;
        fields.terms.textContent = "";
        if (currentSetMeta.collections.includes("-:0")) {
            setType = 1;
            document.querySelector("h1").innerText = "Edit Timeline";     
            document.querySelector("h2").childNodes[0].textContent = "Timeline Items";
            fields.btnAddQuiz.hidden = true;
        } else if (currentSetMeta.collections.includes("-:1")) {
            setType = 2;
            document.querySelector("h1").innerText = "Edit Study Guide";     
            document.querySelector("h2").childNodes[0].textContent = "Guide Items"
            fields.btnAddQuiz.hidden = false;
        } else {
            setType = 0;
            document.querySelector("h1").innerText = "Edit Set";
            document.querySelector("h2").childNodes[0].textContent = "Vocabulary Words";
            fields.btnAddQuiz.hidden = true;
        }
        fields.collections.querySelectorAll("input").forEach(el => el.checked = currentSetMeta.collections.includes(el.value));
        for (let term of currentSet.terms) createTermInput(term);
        creator = (currentSet.uid === user.uid) ? user.displayName : currentSetMeta.creator;
    }
});
const savingFunctions = {
    0: el => {
        let inputs = el.querySelectorAll("input");
        return {term: inputs[0].value, definition: inputs[1].value};
    },
    1: el => {
        let inputs = [...el.querySelectorAll("input")].map(el => el.value.trim());
        return {term: `${inputs.shift()}\x00${inputs.shift()}`, definition: inputs.filter(el => el).join("\x00")};
    },
    2: el => {
        switch(el.dataset.type) {
            case "0":
                let inputs = [...el.querySelectorAll("input,textarea")].map(el => el.value.trim());
                return {title: inputs[0], type: 0, body: inputs[1]};
            case "1":
                let title = el.querySelector("input").value.trim();
                let questions = [...el.querySelectorAll("quiz-question")].map(el => el.question);
                return {title, type: 1, questions};
        }
    }
};
const fields = {
    setName: new MDCTextField(document.querySelector(".field-name")),
    setDescription: new MDCTextField(document.querySelector(".field-description")),
    public: new MDCSwitch(document.getElementById("field-public")),
    terms: document.querySelector(".field-terms-edit"),
    btnCancel: document.querySelector(".btn-cancel"),
    btnAddTerm: document.querySelector(".btn-add-term"),
    btnAddQuiz: document.querySelector(".btn-add-quiz"),
    btnImportTerms: document.querySelector(".btn-import-terms"),
    formEdit: document.querySelector("form"),
    importDialog: new MDCDialog(document.querySelector("#dialog-import-terms")),
    importDialogInput: new MDCTextField(document.querySelector("#dialog-import-terms .mdc-text-field--textarea")),
    collections: document.querySelector(".field-collections"),
    btnImportBlooket: document.querySelector(".btn-import-blooket"),
    fieldImportBlooket: new MDCTextField(document.querySelector(".field-import-blooket")),
    snackbarCantSave: new MDCSnackbar(document.getElementById("snackbar-cant-save"))
};
let changesSaved = true;
function createTermInput(term) {
    /** @type {HTMLDivElement?} */
    let termInput;
    if (setType === 0) {
        let termField = createTextFieldWithHelper("Term", null, {required: true, maxLength: 500});
        let definitionField = createTextFieldWithHelper("Definition", null, {required: true, maxLength: 500});
        termField.textField.style.width = "";
        definitionField.textField.style.width = "";
        termInput = createElement("div", ["editor-term"], {}, [
            termField.textField,
            definitionField.textField,
            createElement("button", ["mdc-icon-button", "btn-delete"], {type: "button"}, [
                createElement("div", ["mdc-icon-button__ripple"]),
                createElement("span", ["mdc-icon-button__focus-ring"]),
                createElement("i", ["material-icons-round"], {innerText: "delete"})
            ])
        ]);
        MDCRipple.attachTo(termInput.children[2]).unbounded = true;
        termField.obj.value = term.term;
        definitionField.obj.value = term.definition;
        termInput.children[2].addEventListener("click", () => termInput.remove());
    } else if (setType === 1) {
        let inputName = createTextFieldWithHelper("Event", null, {required: true, maxLength: 500});
        let inputDate = createTextFieldWithHelper("Date", null, {required: true, maxLength: 500});
        let [name, date] = term.term.split("\x00");
        let details = term.definition.split("\x00");
        let detailInputs = details.map(el => {
            let detailInput = createTextFieldWithHelper("Detail", null, {maxLength: 500});
            detailInput.obj.value = el;
            return detailInput.textField;
        });
        termInput = createElement("div", ["mdc-card", "editor-timeline-piece"], {}, [
            createElement("div", ["card-content"], {}, [
                inputName.textField,
                inputDate.textField
            ]),
            createElement("div", ["card-content", "details-container"], {}, [...detailInputs, 
                createElement("p", [], {innerText: "Leave a detail blank to delete"})
            ]),
            createElement("div", ["mdc-card__actions"], {}, [
                createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round"], {title: "Move Left", type: "button", innerText: "navigate_before"}),
                createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round"], {title: "Add Detail", type: "button", innerText: "add"}),
                createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round", "btn-delete"], {title: "Delete", type: "button", innerText: "delete"}),
                createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round"], {title: "Move Right", type: "button", innerText: "navigate_next"})
            ])
        ]);
        inputName.obj.value = name || "";
        inputDate.obj.value = date || "";
        let actionButtons = [...termInput.querySelectorAll('.mdc-card__actions > button')].map(el => MDCRipple.attachTo(el).root);
        actionButtons[0].addEventListener("click", () => {
            if (termInput.previousElementSibling) fields.terms.insertBefore(termInput, termInput.previousElementSibling);
        });
        actionButtons[1].addEventListener("click", () => {
            termInput.querySelector(".details-container").insertBefore(createTextFieldWithHelper("Detail", null, {maxLength: 500}).textField, termInput.querySelector(".details-container").lastElementChild);
        });
        actionButtons[2].addEventListener("click", () => termInput.remove());
        actionButtons[3].addEventListener("click", () => {
            if (termInput.nextElementSibling?.nextElementSibling) fields.terms.insertBefore(termInput, termInput.nextElementSibling.nextElementSibling);
            else fields.terms.appendChild(termInput);
        });
    } else if (setType === 2) {
        let inputName = createTextFieldWithHelper("Title", null, {required: true, maxLength: 500});
        /** @type {HTMLElement} */
        let bodyInput;
        let buttons = [
            createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round"], {title: "Move Left", type: "button", innerText: "navigate_before"}),
            createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round", "btn-delete"], {title: "Delete", type: "button", innerText: "delete"}),
            createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round"], {title: "Move Right", type: "button", innerText: "navigate_next"})
        ];
        if (term.type === 0) {
            bodyInput = createElement("label", ["mdc-text-field", "mdc-text-field--outlined", "mdc-text-field--textarea", "mdc-text-field--no-label"], {}, [
                createElement("span", ["mdc-notched-outline"], {}, [
                    createElement("span", ["mdc-notched-outline__leading"]),
                    createElement("span", ["mdc-notched-outline__trailing"])
                ]),
                createElement("span", ["mdc-text-field__resizer"], {}, [
                    createElement("textarea", ["mdc-text-field__input", "custom-scrollbar"], {rows: 8, cols: 40})
                ])
            ]);
            let bodyInputObj = new MDCTextField(bodyInput);
            bodyInputObj.value = term.body || "";
        } else if (term.type === 1) {
            bodyInput = createElement("div", ["questions-container"], {}, [
                ...term.questions.map(el => createElement("quiz-question", [], {initialQuestion: el})),
                createElement("p", [], {innerText: "MC: First is correct, SA: All are correct"})
            ]);
            buttons.splice(1, 0, createElement("button", ["mdc-icon-button", "mdc-card__action", "mdc-card__action--icon", "material-icons-round"], {title: "Add Question", type: "button", innerText: "add"}));
            buttons[1].addEventListener("click", () => bodyInput.insertBefore(createElement("quiz-question", [], {initialQuestion: {question: "", answers: [], type: 0}}), bodyInput.lastElementChild));
        } else return;
        termInput = createElement("div", ["mdc-card", "editor-study-piece"], {}, [
            createElement("div", ["card-content"], {}, [
                inputName.textField
            ]),
            createElement("div", ["card-content", "details-container"], {}, [
                createElement("p", [], {innerText: (term.type === 1) ? "Quiz Questions:" : "Item body:"}),
                bodyInput
            ]),
            createElement("div", ["mdc-card__actions"], {}, buttons)
        ]);
        termInput.dataset.type = term.type;
        inputName.obj.value = term.title || "";
        let actionButtons = [...termInput.querySelectorAll('.mdc-card__actions > button')].map(el => MDCRipple.attachTo(el).root);
        actionButtons[0].addEventListener("click", () => {
            if (termInput.previousElementSibling) fields.terms.insertBefore(termInput, termInput.previousElementSibling);
        });
        actionButtons[1 + term.type].addEventListener("click", () => termInput.remove());
        actionButtons[2 + term.type].addEventListener("click", () => {
            if (termInput.nextElementSibling?.nextElementSibling) fields.terms.insertBefore(termInput, termInput.nextElementSibling.nextElementSibling);
            else fields.terms.appendChild(termInput);
        });
    }
    if (termInput) fields.terms.appendChild(termInput);
}
document.addEventListener("change", () => changesSaved = false);
function goBack() {
    changesSaved = true;
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#mysets";
}
fields.btnCancel.addEventListener("click", goBack);
fields.btnAddTerm.addEventListener("click", () => createTermInput({term: "", definition: "", type: 0}));
fields.btnAddQuiz.addEventListener("click", () => createTermInput({title: "", questions: [{question: "", answers: [], type: 0}], type: 1}));
fields.btnImportTerms.addEventListener("click", () => importTerms());
fields.formEdit.addEventListener("submit", async e => {
    e.preventDefault();
    let terms = [...fields.terms.querySelectorAll(":scope > div")].map(savingFunctions[setType]);
    if (terms.length < 4 && setType !== 2) return alert("You must have at least 4 terms in a set");
    let setName = fields.setName.value;
    let description = fields.setDescription.value;
    let nameWords = getWords(setName.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
    let sPublic = fields.public.selected;
    let batch = writeBatch(db);
    let collections = [...fields.collections.querySelectorAll("input:checked")].map(el => el.value).filter(el => el);
    if (setType === 1) collections.unshift("-:0");
    else if (setType === 2) collections.unshift("-:1");
    await auth.currentUser.reload();
    if (setId === "new" || setId === "new-timeline" || setId === "new-guide") {
        let setRef = doc(collection(db, "sets"));
        let setMetaRef = doc(db, "meta_sets", setRef.id);
        batch.set(setMetaRef, {numTerms: terms.length, public: sPublic, name: setName, nameWords, creator: creator || auth.currentUser.displayName, uid: auth.currentUser.uid, collections, likes: 0});
        batch.set(setRef, {terms, public: sPublic, name: setName, uid: auth.currentUser.uid, description});
    } else {
        let setRef = doc(db, "sets", setId);
        let setMetaRef = doc(db, "meta_sets", setId);
        batch.update(setMetaRef, {numTerms: terms.length, public: sPublic, name: setName, nameWords, collections, creator: creator || auth.currentUser.displayName});
        batch.update(setRef, {terms, public: sPublic, name: setName, description});
    }
    try {
        await batch.commit();
        goBack();
    } catch {
        fields.snackbarCantSave.open();
    }
});
async function importTerms() {
    fields.importDialog.open();
    fields.importDialogInput.value = "";
    fields.importDialogInput.valid = true;
    /** @type {string?} */
    let result = await (() => new Promise(resolve => fields.importDialog.listen("V:Result", e => resolve(e.detail.result), { once: true })))();
    if (result !== null) {
        let terms = result.split("\n").filter(el => el).map(el => {
            let splitted = el.split("  ");
            return {term: splitted.shift().trim(), definition: splitted.join("  ").trim()};
        });
        for (let term of terms) createTermInput(term);
    }
}
onbeforeunload = () => {
    if (!changesSaved) return " ";
};
fields.importDialog.root.querySelector(".btn-submit").addEventListener("click", () => {
    if (fields.importDialogInput.valid = fields.importDialogInput.valid) {
        fields.importDialog.emit("V:Result", { result: fields.importDialogInput.value });
        fields.importDialog.close("success");
    }
});
fields.importDialog.listen("MDCDialog:closing", e => {
    if (e.detail.action === "close") fields.importDialog.emit("V:Result", { result: null });
});
fields.btnImportBlooket.addEventListener("click", async () => {
    if (fields.fieldImportBlooket.root.querySelector("input").reportValidity()) {
        let dashRes = fields.fieldImportBlooket.value.match(blooketDashboardRe);
        let hwRe = fields.fieldImportBlooket.value.match(blooketHwRe);
        if (dashRes) {
            let setId = dashRes[1];
            let data = await getBlooketSet(setId, "set");
            fields.importDialogInput.value += data;
            fields.fieldImportBlooket.value = "";
        } else if (hwRe) {
            let setId = hwRe[1];
            let data = await getBlooketSet(setId, "hw");
            fields.importDialogInput.value += data;
            fields.fieldImportBlooket.value = "";
        }
    }
});
showCollections(fields.collections);