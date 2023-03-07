import { collection, doc, getDoc, writeBatch } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, createTextFieldWithHelper, getWords, showCollections, bulmaModalPromise, initBulmaModals, optionalAnimate, cardSlideInAnimation, zoomOutRemove, switchElements, getLocalDb, navigateLoginSaveState } from "./utils.js";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
import { toast } from "bulma-toast";
import BulmaTagsInput from "@creativebulma/bulma-tagsinput";

window.BulmaTagsInput = BulmaTagsInput; // prevent parcel from tree shaking proper

class QuizQuestion extends HTMLElement {
    constructor() {
        super();
    }
    initialized = false;
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
            question: this.questionInput.querySelector("input").value,
            answers,
            type: parseInt(this.querySelector("input[type=radio]:checked").value)
        }
    }
    createAnswerInput(answer) {
        let input = createTextFieldWithHelper("Answer", null, {maxLength: 500, value: answer}).textField;
        this.contentContainer.appendChild(input);
        input.classList.add("answer-input");
        input.addEventListener("input", () => {
            if (!input.nextElementSibling?.classList?.contains("answer-input")) this.createAnswerInput("");
            else if (input.querySelector("input").value === "" && input.nextElementSibling?.classList?.contains("answer-input") && input.nextElementSibling.querySelector("input").value === "") input.nextElementSibling.remove();
        });
        return input;
    }
    showQuestion() {
        if (!this.initialized) {
            this.textContent = "";
            this.contentContainer = this.appendChild(createElement("div", ["list-item-content"]));
            this.questionInput = createTextFieldWithHelper("Question", null, {required: true, maxLength: 500, value: this.initialQuestion.question}).textField;
            this.contentContainer.appendChild(this.questionInput);
            this.deleteButton = createElement("button", ["delete"], {type: "button"});
            this.appendChild(createElement("div", ["list-item-controls", "is-align-items-baseline"], {}, [createElement("div", ["buttons", "is-pulled-right"], {}, [this.deleteButton])])).querySelector(".buttons").style.marginTop = "1.15em";
            this.deleteButton.addEventListener("click", () => this.remove());
            let questionId = `_${crypto.randomUUID()}`;
            let answerTypes = createElement("div", ["field"], {}, [
                createElement("input", ["is-checkradio", "is-info"], {type: "radio", name: questionId, value: "0", checked: this.initialQuestion.type === 0, id: `${questionId}-0`}),
                createElement("label", [], {htmlFor: `${questionId}-0`, innerText: "Multiple Choice"}),
                createElement("input", ["is-checkradio", "is-info"], {type: "radio", name: questionId, value: "1", checked: this.initialQuestion.type === 1, id: `${questionId}-1`}),
                createElement("label", [], {htmlFor: `${questionId}-1`, innerText: "Short Answer"}),
            ]);
            this.contentContainer.appendChild(answerTypes);
            this.initialQuestion.answers.push("");
            this.initialQuestion.answers.map(el => this.createAnswerInput(el));
            this.classList.add("list-item");
            this.initialized = true;
        }
    }
    connectedCallback() {
        if (this.initialQuestion) this.showQuestion();
    }
}
customElements.define("quiz-question", QuizQuestion);

const setId = decodeURIComponent(location.pathname).match(/\/set\/([\w- ]+)\/edit\/?/)[1] || (location.pathname = "/");
let setType = 0;
let creator = null;
const {db, auth} = initialize(async user => {
    if (!user) navigateLoginSaveState();
    else if (setId.match(/^new(-\w+)?$/)) {
        switch(setId) {
            case "new":
                document.title = "New Set - Vocabustudy";
                document.querySelector("h1").innerText = "New Set";
                document.querySelector("h2").innerText = "Vocabulary Words";
                fields.terms.classList.remove("columns");
                setType = 0;
                fields.btnAddQuiz.hidden = true;
                break;
            case "new-timeline":
                document.title = "New Timeline - Vocabustudy";
                document.querySelector("h1").innerText = "New Timeline";
                document.querySelector("h2").innerText = "Timeline Items";
                fields.terms.classList.add("columns");
                fields.btnAddQuiz.hidden = true;
                setType = 1;
                break;
            case "new-guide":
                document.title = "New Guide - Vocabustudy";
                document.querySelector("h1").innerText = "New Study Guide";
                document.querySelector("h2").innerText = "Guide Items";
                fields.terms.classList.add("columns");
                setType = 2;
                fields.btnAddQuiz.hidden = false;
                break;
            default:
                await goBack();
        }
        fields.terms.textContent = "";
        selectDropdownItem(fields.visibilityOptions[0]);
        fields.shareDialogInput.removeAll();
        fields.collections.querySelectorAll("input:checked").forEach(el => el.checked = false);
        creator = user.displayName;
        await showAutosaveToast();
    } else {
        let setSnap = await getDoc(doc(db, "sets", setId));
        let setMetaSnap = await getDoc(doc(db, "meta_sets", setId));
        if (!setSnap.exists() || !setMetaSnap.exists()) return location.href = "/404";
        let userIdToken = await user.getIdTokenResult();
        let isAdmin = userIdToken.claims.admin;
        const currentSet = setSnap.data();
        const currentSetMeta = setMetaSnap.data();
        if (!isAdmin && currentSet.uid !== user.uid) {
            await auth.signOut();
            navigateLoginSaveState();
        }
        await showAutosaveToast();
        displayExistingSet(user, currentSet, currentSetMeta);
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
            case "0": {
                let inputs = [...el.querySelectorAll("input,textarea")].map(inp => inp.value.trim());
                return {title: inputs[0], type: 0, body: inputs[1]};
            } case "1": {
                let title = el.querySelector("input").value.trim();
                let questions = [...el.querySelectorAll("quiz-question")].map(inp => inp.question);
                return {title, type: 1, questions};
            }
        }
    }
};
const fields = {
    setName: document.querySelector(".field-name"),
    setDescription: document.querySelector(".field-description"),
    visibilityDropdown: document.querySelector(".field-visibility"),
    visibilityButton: document.querySelector(".field-visibility button"),
    visibilityOptions: document.querySelectorAll(".field-visibility a"),
    terms: document.querySelector(".field-terms-edit"),
    btnCancel: document.querySelector(".btn-cancel"),
    btnAddTerm: document.querySelector(".btn-add-term"),
    btnAddQuiz: document.querySelector(".btn-add-quiz"),
    btnImportTerms: document.querySelector(".btn-import-terms"),
    formEdit: document.querySelector("form"),
    importDialog: new Modal("#dialog-import-terms").modal(),
    importDialogInput: document.querySelector("#dialog-import-terms textarea"),
    shareDialog: new Modal("#dialog-configure-shared").modal(),
    shareDialogInput: new BulmaTagsInput("#dialog-configure-shared input[type=text]", {delimiter: " ", minChars: 3, tagClass: "is-link is-light is-family-code", selectable: false}),
    collections: document.querySelector(".field-collections"),
    warningDuplicateTerms: document.querySelector(".warning-duplicate"),
};
const ratelimit = {
    remaining: 5,
    timeout: 0,
    toastIsShowing: false,
    setTimeout() {
        window.clearTimeout(this.timeout);
        this.timeout = window.setTimeout(() => this.remaining = 5,  5000);
    },
    canDoAction() {
        if (this.remaining > 0) {
            this.setTimeout();
            this.remaining--;
            return true;
        } else {
            if (!this.toastIsShowing) {
                toast({message: "Ratelimit exceeded", type: "is-warning", dismissible: true, position: "bottom-center"});
                this.toastIsShowing = true;
                window.setTimeout(() => this.toastIsShowing = false, 2000);
            }
            return false;
        }
    }
};
let changesSaved = true;
function selectDropdownItem(dropdownItem) {
    document.querySelector(".field-visibility a.is-active").classList.remove("is-active");
    dropdownItem.classList.add("is-active");
    fields.visibilityButton.querySelector("span").innerText = dropdownItem.innerText;
}
function checkInputDuplicates() {
    let terms = [];
    let definitions = [];
    fields.terms.querySelectorAll(":scope > div").forEach(el => {
        let inps = el.querySelectorAll("input");
        terms.push(inps[0].value);
        definitions.push(inps[1].value);
    });
    terms = terms.filter(el => el);
    definitions = definitions.filter(el => el);
    let isDup = terms.some((item, index) => terms.indexOf(item) != index) || definitions.some((item, index) => definitions.indexOf(item) != index);
    fields.warningDuplicateTerms.hidden = !isDup;
}
function createTimelineDetail(detailContent) {
    let detailInput = createTextFieldWithHelper("Detail", null, {maxLength: 500, value: detailContent, required: true});
    detailInput.textField.style.width = "90%";
    let listItem = createElement("div", ["list-item"], {}, [
        createElement("div", ["list-item-content"], {}, [detailInput.textField]),
        createElement("div", ["list-item-controls"], {}, [
            createElement("div", ["buttons", "is-right"], {}, [
                createElement("button", ["delete"], {type: "button"})
            ])
        ])
    ]);
    listItem.style.width = "100%";
    listItem.querySelector("button").addEventListener("click", () => listItem.remove());
    listItem.querySelector(".buttons").style.marginTop = "1.15em";
    return listItem;
}
function displayExistingSet(user, currentSet, currentSetMeta) {
    document.title = `Edit ${currentSet.name} - Vocabustudy`;
    fields.setName.value = currentSet.name;
    if (currentSet.description)
        fields.setDescription.value = currentSet.description;
    // if visibility is array, select the 2nd (shared) visibility option. If it equals 2, select the 3rd (public). Otherwise, if it equals 0 or 1, select the 0th or 1st visibility option.
    selectDropdownItem(fields.visibilityOptions[Array.isArray(currentSet.visibility) ? 2 : currentSet.visibility === 2 ? 3 : currentSet.visibility]);
    if (Array.isArray(currentSet.visibility)) {
        fields.shareDialogInput.removeAll();
        fields.shareDialogInput.add(currentSet.visibility);
    }
    fields.terms.textContent = "";
    if (currentSetMeta.collections.includes("-:0")) {
        setType = 1;
        document.querySelector("h1").innerText = "Edit Timeline";
        document.querySelector("h2").innerText = "Timeline Items";
        fields.terms.classList.add("columns");
        fields.btnAddQuiz.hidden = true;
    } else if (currentSetMeta.collections.includes("-:1")) {
        setType = 2;
        document.querySelector("h1").innerText = "Edit Study Guide";
        document.querySelector("h2").innerText = "Guide Items"
        fields.terms.classList.add("columns");
        fields.btnAddQuiz.hidden = false;
    } else {
        setType = 0;
        document.querySelector("h1").innerText = "Edit Set";
        document.querySelector("h2").innerText = "Vocabulary Words";
        fields.terms.classList.remove("columns");
        fields.btnAddQuiz.hidden = true;
    }
    fields.collections.querySelectorAll("input").forEach(el => el.checked = currentSetMeta.collections.includes(el.value));
    for (let term of currentSet.terms) createTermInput(term);
    creator = (currentSet.uid === user.uid) ? user.displayName : currentSetMeta.creator;
}
async function showAutosaveToast() {
    let localDb = await getLocalDb();
    let existingAutosave = await localDb.get("autosave-backups", setId)
    if (existingAutosave) {
        let restoreBackupBtn = createElement("button", ["button", "is-success"], {type: "button", innerText: "Restore"});
        let deleteBackupBtn = createElement("button", ["button", "is-danger", "is-outlined"], {type: "button", innerText: "Delete"});
        deleteBackupBtn.addEventListener("click", () => localDb.delete("autosave-backups", setId));
        restoreBackupBtn.addEventListener("click", async () => {
            displayExistingSet(auth.currentUser, existingAutosave.set, existingAutosave.meta);
            await localDb.delete("autosave-backups", setId);
        })
        toast({message: createElement("div", [], {}, [
            createElement("p", ["has-text-left"], {}, [
                document.createTextNode("We found an unsaved backup of this set from "),
                createElement("br"),
                createElement("strong", [], {innerText: existingAutosave.timestamp.toLocaleString()}),
                createElement("br"),
                document.createTextNode("Would you like to restore this backup?")
            ]),
            createElement("div", ["buttons", "mt-3"], {}, [
                restoreBackupBtn,
                deleteBackupBtn
            ])
        ]), dismissible: true, duration: 15000});
    }
}
function serializeSet() {
    let terms = [...fields.terms.querySelectorAll(":scope > div")].map(savingFunctions[setType]);
    let setName = fields.setName.value.normalize("NFD");
    let description = fields.setDescription.value;
    let nameWords = getWords(setName.replace(/\p{Diacritic}/gu, ""));
    let visibility = [...fields.visibilityOptions].findIndex(el => el.classList.contains("is-active"));
    if (visibility === 2) visibility = fields.shareDialogInput.items;
    else if (visibility === 3) visibility--;
    let collections = [...fields.collections.querySelectorAll("input:checked")].map(el => el.value).filter(el => el);
    if (setType === 1) collections.unshift("-:0");
    else if (setType === 2) collections.unshift("-:1");
    return { meta: { numTerms: terms.length, visibility, name: setName, nameWords, collections }, set: { terms, visibility, name: setName, description } };
}
function createTermInput(term) {
    /** @type {HTMLDivElement?} */
    let termInput;
    if (setType === 0) {
        let termField = createTextFieldWithHelper("Term", null, {required: true, maxLength: 500});
        let definitionField = createTextFieldWithHelper("Definition", null, {required: true, maxLength: 500});
        termField.textField.style.width = "";
        definitionField.textField.style.width = "";
        let deleteButton = createElement("button", ["button", "btn-delete", "is-danger", "is-inverted"], {type: "button"}, [
            createElement("span", ["icon"], {}, [
                createElement("i", ["material-symbols-rounded", "is-filled"], {innerText: "delete"})
            ])
        ]);
        let deleteButtonMobile = deleteButton.cloneNode(true);
        termInput = createElement("div", ["editor-term", "columns"], {}, [
            createElement("div", ["column", "is-one-third"], {}, [
                createElement("div", ["columns", "is-mobile"], {}, [
                    createElement("div", ["column"], {}, [termField.textField]),
                    createElement("div", ["column", "is-narrow", "is-hidden-tablet", "is-align-self-flex-end"], {}, [deleteButtonMobile])
                ]),
            ]),
            createElement("div", ["column"], {}, [definitionField.textField]),
            createElement("div", ["column", "is-narrow", "is-align-self-flex-end", "is-hidden-mobile"], {}, [deleteButton])
        ]);
        termField.textField.querySelector("input").value = term.term;
        definitionField.textField.querySelector("input").value = term.definition;
        termInput.addEventListener("change", () => checkInputDuplicates());
        deleteButton.addEventListener("click", () => zoomOutRemove(termInput));
        deleteButtonMobile.addEventListener("click", () => zoomOutRemove(termInput));
    } else if (setType === 1) {
        let [name, date] = term.term.split("\x00");
        let inputName = createTextFieldWithHelper("Event", null, {required: true, maxLength: 500, value: name || ""});
        let inputDate = createTextFieldWithHelper("Date", null, {required: true, maxLength: 500, value: date || ""});
        let details = term.definition.split("\x00");
        let detailInputs = details.map(createTimelineDetail);
        let deleteButton = createElement("button", ["delete"], {type: "button"});
        deleteButton.addEventListener("click", () => zoomOutRemove(termInput));
        termInput = createElement("div", ["is-one-quarter-desktop", "is-half-tablet", "column", "is-relative"], {}, [
            createElement("div", ["panel", "editor-timeline-piece", "has-background-white"], {}, [
                createElement("p", ["panel-heading"], {}, [
                    createElement("div", ["columns"], {}, [
                        createElement("div", ["column", "is-two-thirds"], {}, [inputName.textField]),
                        createElement("div", ["column", "is-one-third"], {}, [inputDate.textField])
                    ])
                ]),
                createElement("div", ["panel-block", "list", "details-container"], {}, detailInputs),
                createElement("div", ["panel-block", "is-flex", "is-justify-content-space-between"], {}, [
                    createElement("button", ["button", "btn-move"], {title: "Move Left", type: "button"}, [
                        createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "navigate_before"})])
                    ]),
                    createElement("button", ["button"], {title: "Add Detail", type: "button"}, [
                        createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "add"})]),
                        createElement("span", [], {innerText: "Detail"})
                    ]),
                    createElement("button", ["button", "btn-move"], {title: "Move Right", type: "button"}, [
                        createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "navigate_next"})])
                    ])
                ]),
                deleteButton
            ])
        ]);
        let actionButtons = [...termInput.querySelectorAll('.panel-block > button')];
        actionButtons[0].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[2].disabled = true;
            if (termInput.previousElementSibling) {
                termInput.previousElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.previousElementSibling);
                termInput.nextElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = false);
            }
            actionButtons[0].disabled = actionButtons[2].disabled = false;
        });
        actionButtons[1].addEventListener("click", () => {
            termInput.querySelector(".details-container").insertBefore(createTimelineDetail(""), termInput.querySelector(".details-container").lastElementChild);
        });
        actionButtons[2].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[2].disabled = true;
            if (termInput.nextElementSibling) {
                termInput.nextElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.nextElementSibling);
                termInput.previousElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = false);
            }
            actionButtons[0].disabled = actionButtons[2].disabled = false;
        });
    } else if (setType === 2) {
        let inputName = createTextFieldWithHelper("Title", null, {required: true, maxLength: 500, value: term.title || ""});
        /** @type {HTMLElement} */
        let bodyInput;
        let deleteButton = createElement("button", ["delete"], {type: "button"});
        deleteButton.addEventListener("click", () => zoomOutRemove(termInput));
        let actionButtons = [
            createElement("button", ["button", "btn-move"], {title: "Move Left", type: "button"}, [
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "navigate_before"})])
            ]),
            createElement("button", ["button", "btn-move"], {title: "Move Right", type: "button"}, [
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "navigate_next"})])
            ])
        ];
        if (term.type === 0) {
            bodyInput = createElement("div", ["field", "is-flex", "is-flex-direction-column"], {}, [
                createElement("label", ["label"], {innerText: "Item Body:"}),
                createElement("div", ["control", "is-flex-grow-1"], {}, [
                    createElement("textarea", ["textarea"], {required: true, cols: 40, rows:4, value: term.body || ""})
                ])
            ]);
            bodyInput.style.height = "100%";
            bodyInput.querySelector("textarea").style.height = "100%";
        } else if (term.type === 1) {
            bodyInput = createElement("div", ["list"], {}, [
                ...term.questions.map(el => createElement("quiz-question", [], {initialQuestion: el})),
                createElement("p", ["has-text-centered", "has-workaround"], {innerText: "MC: First is correct, SA: All are correct"})
            ]);
            actionButtons.splice(1, 0, createElement("button", ["button"], {title: "Add Question", type: "button"}, [
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "add"})]),
                createElement("span", [], {innerText: "Question"})
            ]));
            actionButtons[1].addEventListener("click", () => bodyInput.insertBefore(createElement("quiz-question", [], {initialQuestion: {question: "", answers: [], type: 0}}), bodyInput.lastElementChild));
        } else return;
        bodyInput.style.width = "100%";
        termInput = createElement("div", ["is-one-quarter-desktop", "is-half-tablet", "column", "is-relative"], {}, [
            createElement("div", ["panel", "editor-study-piece", "has-background-white"], {}, [
                createElement("p", ["panel-heading"], {}, [inputName.textField]),
                createElement("div", ["panel-block", "details-container", "is-flex-grow-1"], {}, [bodyInput]),
                createElement("div", ["panel-block", "is-flex", "is-justify-content-space-between"], {}, actionButtons),
                deleteButton
            ])
        ]);
        actionButtons[0].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[1 + term.type].disabled = true;
            if (termInput.previousElementSibling) {
                termInput.previousElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.previousElementSibling);
                termInput.nextElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = false); // they've been switched so use nextElementSibling
            }
            actionButtons[0].disabled = actionButtons[1 + term.type].disabled = false;
        });
        actionButtons[1 + term.type].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[1 + term.type].disabled = true;
            if (termInput.nextElementSibling) {
                termInput.nextElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.nextElementSibling);
                termInput.previousElementSibling.querySelectorAll(".btn-move").forEach(el => el.disabled = false);
            }
            actionButtons[0].disabled = actionButtons[1 + term.type].disabled = false;
        });
        termInput.dataset.type = term.type;
    }
    if (termInput) optionalAnimate(fields.terms.appendChild(termInput), ...cardSlideInAnimation);
}
document.addEventListener("change", async () => {
    let localDb = await getLocalDb();
    await localDb.put("autosave-backups", { setId, ...serializeSet(), timestamp: new Date() });
    changesSaved = false;
});
async function goBack() {
    changesSaved = true;
    let localDb = await getLocalDb();
    await localDb.delete("autosave-backups", setId)
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#mysets";
}
fields.btnCancel.addEventListener("click", goBack);
fields.btnAddTerm.addEventListener("click", () => createTermInput({term: "", definition: "", type: 0}));
fields.btnAddQuiz.addEventListener("click", () => createTermInput({title: "", questions: [{question: "", answers: [], type: 0}], type: 1}));
fields.btnImportTerms.addEventListener("click", () => importTerms());
fields.formEdit.addEventListener("submit", async e => {
    e.preventDefault();
    if (!ratelimit.canDoAction()) return;
    if (!fields.formEdit.reportValidity()) return fields.formEdit.classList.add("has-validated-inputs");
    let setData = serializeSet();
    if (setData.meta.numTerms < 4 && setType !== 2) return toast({message: "You must have at least 4 terms in a set", type: "is-warning", dismissible: true, position: "bottom-center"});
    let batch = writeBatch(db);
    await auth.currentUser.reload();
    if (setId === "new" || setId === "new-timeline" || setId === "new-guide") {
        let setRef = doc(collection(db, "sets"));
        let setMetaRef = doc(db, "meta_sets", setRef.id);
        batch.set(setMetaRef, { ...setData.meta, creator: creator || auth.currentUser.displayName, uid: auth.currentUser.uid, likes: 0});
        batch.set(setRef, { ...setData.set,  uid: auth.currentUser.uid });
    } else {
        let setRef = doc(db, "sets", setId);
        let setMetaRef = doc(db, "meta_sets", setId);
        batch.update(setMetaRef, { ...setData.meta, creator: creator || auth.currentUser.displayName });
        batch.update(setRef, setData.set);
    }
    try {
        await batch.commit();
        await goBack();
    } catch {
        toast({message: "We weren't able to save your set. This may be caused by a recent Display Name change.", type: "is-danger", dismissible: true, position: "bottom-center"})
    }
});
async function importTerms() {
    fields.importDialogInput.value = "";
    let result = await bulmaModalPromise(fields.importDialog)
    if (result) {
        let terms = fields.importDialogInput.value.split("\n").filter(el => el).map(el => {
            let splitted = el.split("  ");
            return {term: splitted.shift().trim().substring(0, 500), definition: splitted.join("  ").trim().substring(0, 500)};
        });
        for (let term of terms) createTermInput(term);
    }
}
onbeforeunload = () => {
    if (!changesSaved) return " ";
};
fields.importDialog.validateInput = () => fields.importDialogInput.reportValidity();
fields.shareDialog.onclose = () => {};
fields.visibilityButton.addEventListener("click", e => {
    e.stopPropagation();
    fields.visibilityDropdown.classList.add("is-active");
});
document.addEventListener("click", () => fields.visibilityDropdown.classList.remove("is-active"));
fields.visibilityOptions.forEach((el, i) => el.addEventListener("click", () => {
    selectDropdownItem(el);
    if (i === 2) {
        fields.shareDialog.open();
        fields.shareDialogInput.focus();
    }
}));
fields.shareDialogInput.input.parentElement.addEventListener("focusout", () => {
    if (fields.shareDialogInput.input.value) {
        fields.shareDialogInput.add(fields.shareDialogInput.input.value);
        fields.shareDialogInput.input.value = "";
    }
}, true);
showCollections(fields.collections);
initBulmaModals([fields.importDialog, fields.shareDialog]);