import { createElement, createTextFieldWithHelper, getWords, showCollections, bulmaModalPromise, initBulmaModals, optionalAnimate, cardSlideInAnimation, zoomOutRemove, switchElements, getLocalDb, navigateLoginSaveState, generateDocumentId } from "./utils";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
import { toast } from "bulma-toast";
import BulmaTagsInput from "@creativebulma/bulma-tagsinput";
import { getCurrentUser, initializeAuth, refreshCurrentUser, setCurrentUser } from "./firebase-rest-api/auth";
import { SetTerms, StudyGuideQuiz, StudyGuideQuizQuestion, StudyGuideReading, TermDefinition, User } from "./types";
import { BatchWriter, Firestore, VocabSet } from "./firebase-rest-api/firestore";
import { detectAvailability, FirefoxAddonMessager, getQuizletSet } from "./converters/quizlet";

declare global {
    interface Window {
        BulmaTagsInput: typeof BulmaTagsInput;
    }
    interface HTMLElementTagNameMap {
        "quiz-editor-question": QuizQuestion
    }
}

window.BulmaTagsInput = BulmaTagsInput; // prevent parcel from tree shaking proper

class QuizQuestion extends HTMLElement {
    initialQuestion: StudyGuideQuizQuestion;
    questionInput: HTMLDivElement;
    contentContainer: HTMLDivElement;
    deleteButton: HTMLButtonElement;
    constructor() {
        super();
    }
    initialized = false;
    /**
     * Initialize the quiz question and create the elements if connected
     * @param question The initial data for the quiz question
     */
    initialize(question: StudyGuideQuizQuestion) {
        this.initialQuestion = question;
        if (this.isConnected) this.showQuestion();
    }
    get question(): StudyGuideQuizQuestion {
        let answers = [...this.querySelectorAll<HTMLInputElement>(".answer-input input")].map(el => el.value.trim()).filter(el => el);
        if (answers.length < 1) answers = ["True", "False"];
        return {
            question: this.questionInput.querySelector("input").value,
            answers,
            type: parseInt(this.querySelector<HTMLInputElement>("input[type=radio]:checked").value) as 0|1
        }
    }
    createAnswerInput(answer: string) {
        const input = createTextFieldWithHelper("Answer", null, {maxLength: 500, value: answer}).textField;
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
            this.appendChild(createElement("div", ["list-item-controls", "is-align-items-baseline"], {}, [createElement("div", ["buttons", "is-pulled-right"], {}, [this.deleteButton])]))
                .querySelector<HTMLDivElement>(".buttons").style.marginTop = "1.15em";
            this.deleteButton.addEventListener("click", () => this.remove());
            const questionId = `_${crypto.randomUUID()}`;
            const answerTypes = createElement("div", ["field"], {}, [
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
customElements.define("quiz-editor-question", QuizQuestion);

const [, isQuizlet, setId] = decodeURIComponent(location.pathname).match(/\/(set|quizlet)\/([\w- ]+)\/edit\/?/) || (location.pathname = "/");
let setType: 0 | 1 | 2 = 0;
let creator: string = null;
const auth = initializeAuth(async user => {
    if (!user) navigateLoginSaveState();
    else if (setId.match(/^new(-\w+)?$/) || isQuizlet === "quizlet") {
        switch(isQuizlet === "quizlet" ? "new" : setId) {
            case "new":
                document.title = "New Set - Vocabustudy";
                document.querySelector("h1").innerText = "New Set";
                document.querySelector("h2").innerText = "Vocabulary Words";
                fields.terms.classList.remove("columns");
                setType = 0;
                fields.btnAddQuiz.hidden = true;
                if (isQuizlet === "quizlet") {
                    const firefoxAddonMessager = new FirefoxAddonMessager();
                    if (await detectAvailability(firefoxAddonMessager)) {
                        const quizletSet = await getQuizletSet(setId, firefoxAddonMessager);
                        if (!quizletSet) return location.replace("/404/");
                        else {
                            // Override the uid (which was the ID of the quizlet user) so that the set appears as created by the logged in VUS user
                            quizletSet.uid = user.uid;
                            displayExistingSet(user, quizletSet);
                        }
                    } else fields.warningQuizletNotSupported.hidden = false;
                }
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
        if (isQuizlet !== "quizlet") {
            fields.terms.textContent = "";
            selectDropdownItem(fields.visibilityOptions[0]); // sets imported from quizlet are public by default
        }
        fields.shareDialogInput.removeAll();
        fields.collections.querySelectorAll<HTMLInputElement>("input:checked").forEach(el => el.checked = false);
        creator = user.displayName;
        await showAutosaveToast();
    } else {
        const currentSet = VocabSet.fromSingle(await Firestore.getDocument("sets", setId, null, user.token.access));
        if (!currentSet) return location.replace("/404/");
        if (!user.customAttributes.admin && currentSet.uid !== user.uid) {
            await setCurrentUser(auth, null);
            navigateLoginSaveState();
        }
        try {
            await showAutosaveToast();
        } catch { /* empty */ }
        displayExistingSet(user, currentSet);
    }
});

const savingFunctions = {
    0: (el: HTMLElement): TermDefinition => {
        const inputs = el.querySelectorAll("input");
        return { term: inputs[0].value, definition: inputs[1].value };
    },
    1: (el: HTMLElement): TermDefinition => {
        const inputs = [...el.querySelectorAll("input")].map(el => el.value.trim());
        return { term: `${inputs.shift()}\x00${inputs.shift()}`, definition: inputs.filter(el => el).join("\x00") };
    },
    2: (el: HTMLElement): StudyGuideQuiz | StudyGuideReading => {
        switch(el.dataset.type) {
            case "0": {
                const inputs = [...el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea")].map(inp => inp.value.trim());
                return { title: inputs[0], type: 0, body: inputs[1] };
            } case "1": {
                const title = el.querySelector("input").value.trim();
                const questions = [...el.querySelectorAll("quiz-editor-question")].map(inp => inp.question);
                return { title, type: 1, questions };
            } default: {
                return { title: "", type: 0, body: "" };
            }
        }
    }
};
const fields = {
    setName: document.querySelector<HTMLInputElement>(".field-name"),
    setDescription: document.querySelector<HTMLInputElement>(".field-description"),
    visibilityDropdown: document.querySelector(".field-visibility"),
    visibilityButton: document.querySelector(".field-visibility button"),
    visibilityOptions: document.querySelectorAll<HTMLAnchorElement>(".field-visibility a"),
    terms: document.querySelector(".field-terms-edit"),
    btnCancel: document.querySelector<HTMLButtonElement>(".btn-cancel"),
    btnAddTerm: document.querySelector<HTMLButtonElement>(".btn-add-term"),
    btnAddQuiz: document.querySelector<HTMLButtonElement>(".btn-add-quiz"),
    btnImportTerms: document.querySelector<HTMLButtonElement>(".btn-import-terms"),
    formEdit: document.querySelector("form"),
    importDialog: new Modal("#dialog-import-terms").modal(),
    importDialogInput: document.querySelector<HTMLTextAreaElement>("#dialog-import-terms textarea"),
    shareDialog: new Modal("#dialog-configure-shared").modal(),
    shareDialogInput: new BulmaTagsInput("#dialog-configure-shared input[type=text]", {delimiter: " ", minChars: 3, tagClass: "is-link is-light is-family-code", selectable: false}),
    collections: document.querySelector<HTMLUListElement>(".field-collections"),
    warningDuplicateTerms: document.querySelector<HTMLDivElement>(".warning-duplicate"),
    warningQuizletNotSupported: document.querySelector<HTMLDivElement>(".warning-quizlet-not-supported")
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
function selectDropdownItem(dropdownItem: HTMLElement) {
    document.querySelector(".field-visibility a.is-active").classList.remove("is-active");
    dropdownItem.classList.add("is-active");
    fields.visibilityButton.querySelector("span").innerText = dropdownItem.innerText;
}
function checkInputDuplicates() {
    let terms = [];
    let definitions = [];
    fields.terms.querySelectorAll(":scope > div").forEach(el => {
        const inps = el.querySelectorAll("input");
        terms.push(inps[0].value);
        definitions.push(inps[1].value);
    });
    terms = terms.filter(el => el);
    definitions = definitions.filter(el => el);
    const isDup = terms.some((item, index) => terms.indexOf(item) != index) || definitions.some((item, index) => definitions.indexOf(item) != index);
    fields.warningDuplicateTerms.hidden = !isDup;
}
function createTimelineDetail(detailContent: string) {
    const detailInput = createTextFieldWithHelper("Detail", null, {maxLength: 500, value: detailContent, required: true});
    detailInput.textField.style.width = "90%";
    const listItem = createElement("div", ["list-item"], {}, [
        createElement("div", ["list-item-content"], {}, [detailInput.textField]),
        createElement("div", ["list-item-controls"], {}, [
            createElement("div", ["buttons", "is-right"], {}, [
                createElement("button", ["delete"], {type: "button"})
            ])
        ])
    ]);
    listItem.style.width = "100%";
    listItem.querySelector("button").addEventListener("click", () => listItem.remove());
    listItem.querySelector<HTMLDivElement>(".buttons").style.marginTop = "1.15em";
    return listItem;
}
function displayExistingSet(user: User, currentSet: VocabSet) {
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
    // Show the correct fields for the set type, based on the collections it's in
    if (currentSet.collections.includes("-:0")) {
        setType = 1;
        document.querySelector("h1").innerText = "Edit Timeline";
        document.querySelector("h2").innerText = "Timeline Items";
        fields.terms.classList.add("columns");
        fields.btnAddQuiz.hidden = true;
    } else if (currentSet.collections.includes("-:1")) {
        setType = 2;
        document.querySelector("h1").innerText = "Edit Study Guide";
        document.querySelector("h2").innerText = "Guide Items"
        fields.terms.classList.add("columns");
        fields.btnAddQuiz.hidden = false;
    } else if (isQuizlet !== "quizlet") {
        setType = 0;
        document.querySelector("h1").innerText = "Edit Set";
        document.querySelector("h2").innerText = "Vocabulary Words";
        fields.terms.classList.remove("columns");
        fields.btnAddQuiz.hidden = true;
    }
    fields.collections.querySelectorAll("input").forEach(el => el.checked = currentSet.collections.includes(el.value));
    for (const term of currentSet.terms) createTermInput(term);
    creator = (currentSet.uid === user.uid) ? user.displayName : currentSet.creator;
}
/** Show a dialog asking the user whether they want to restore or delete a previous autosave of the set, from IDB */
async function showAutosaveToast() {
    const localDb = await getLocalDb();
    const existingAutosave = await localDb.get("autosave-backups", setId)
    if (existingAutosave) {
        const restoreBackupBtn = createElement("button", ["button", "is-success"], {type: "button", innerText: "Restore"});
        const deleteBackupBtn = createElement("button", ["button", "is-danger", "is-outlined"], {type: "button", innerText: "Delete"});
        deleteBackupBtn.addEventListener("click", () => localDb.delete("autosave-backups", setId));
        restoreBackupBtn.addEventListener("click", async () => {
            displayExistingSet(await getCurrentUser(), existingAutosave.set);
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
/** Generate the JSON for a set based on the input fields */
function serializeSet() {
    const terms = [...fields.terms.querySelectorAll<HTMLDivElement>(":scope > div")].map<SetTerms[number]>(savingFunctions[setType]);
    const setName = fields.setName.value.normalize("NFD");
    const description = fields.setDescription.value;
    const nameWords = getWords(setName.replace(/\p{Diacritic}/gu, ""));
    let visibility = [...fields.visibilityOptions].findIndex(el => el.classList.contains("is-active"));
    if (visibility === 2) visibility = fields.shareDialogInput.items;
    else if (visibility === 3) visibility--;
    const collections = [...fields.collections.querySelectorAll<HTMLInputElement>("input:checked")].map(el => el.value).filter(el => el);
    if (setType === 1) collections.unshift("-:0");
    else if (setType === 2) collections.unshift("-:1");
    return { numTerms: terms.length, visibility, name: setName, nameWords, collections, terms, description };
}
function createTermInput(term: SetTerms[number]) {
    let termInput: HTMLDivElement;
    if (setType === 0) {
        term = term as TermDefinition;
        // Create a row with a term and a definition
        const termField = createTextFieldWithHelper("Term", null, {required: true, maxLength: 500});
        const definitionField = createTextFieldWithHelper("Definition", null, {required: true, maxLength: 500});
        termField.textField.style.width = "";
        definitionField.textField.style.width = "";
        const deleteButton = createElement("button", ["button", "btn-delete", "is-danger", "is-inverted"], {type: "button"}, [
            createElement("span", ["icon"], {}, [
                createElement("i", ["material-symbols-rounded", "is-filled"], {innerText: "delete"})
            ])
        ]);
        const deleteButtonMobile = deleteButton.cloneNode(true);
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

        // Event listeners
        termInput.addEventListener("change", () => checkInputDuplicates());
        deleteButton.addEventListener("click", () => zoomOutRemove(termInput));
        deleteButtonMobile.addEventListener("click", () => zoomOutRemove(termInput));
    } else if (setType === 1) { // timeline
        term = term as TermDefinition;
        // Create a card with the timeline point name, date, and rows for events
        const [name, date] = term.term.split("\x00");
        const inputName = createTextFieldWithHelper("Event", null, {required: true, maxLength: 500, value: name || ""});
        const inputDate = createTextFieldWithHelper("Date", null, {required: true, maxLength: 500, value: date || ""});
        const details = term.definition.split("\x00");
        const detailInputs = details.map(createTimelineDetail);
        const deleteButton = createElement("button", ["delete"], {type: "button"});
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
                    // Management buttons for moving and adding details
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

        // Event listeners
        const actionButtons = [...termInput.querySelectorAll<HTMLButtonElement>('.panel-block > button')];
        actionButtons[0].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[2].disabled = true;
            if (termInput.previousElementSibling) {
                termInput.previousElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.previousElementSibling as HTMLElement);
                termInput.nextElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = false);
            }
            actionButtons[0].disabled = actionButtons[2].disabled = false;
        });
        actionButtons[1].addEventListener("click", () => {
            termInput.querySelector(".details-container").insertBefore(createTimelineDetail(""), termInput.querySelector(".details-container").lastElementChild);
        });
        actionButtons[2].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[2].disabled = true;
            if (termInput.nextElementSibling) {
                termInput.nextElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.nextElementSibling as HTMLElement);
                termInput.previousElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = false);
            }
            actionButtons[0].disabled = actionButtons[2].disabled = false;
        });
    } else if (setType === 2) { // study guides
        const studyGuideItem = term as StudyGuideQuiz | StudyGuideReading;
        const inputName = createTextFieldWithHelper("Title", null, {required: true, maxLength: 500, value: studyGuideItem.title || ""});
        let bodyInput: HTMLElement;
        const deleteButton = createElement("button", ["delete"], {type: "button"});
        deleteButton.addEventListener("click", () => zoomOutRemove(termInput));
        const actionButtons = [
            createElement("button", ["button", "btn-move"], {title: "Move Left", type: "button"}, [
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "navigate_before"})])
            ]),
            createElement("button", ["button", "btn-move"], {title: "Move Right", type: "button"}, [
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "navigate_next"})])
            ])
        ];
        if (studyGuideItem.type === 0) {
            bodyInput = createElement("div", ["field", "is-flex", "is-flex-direction-column"], {}, [
                createElement("label", ["label"], {innerText: "Item Body:"}),
                createElement("div", ["control", "is-flex-grow-1"], {}, [
                    createElement("textarea", ["textarea"], {required: true, cols: 40, rows:4, value: studyGuideItem.body || ""})
                ])
            ]);
            bodyInput.style.height = "100%";
            bodyInput.querySelector("textarea").style.height = "100%";
        } else if (studyGuideItem.type === 1) {
            bodyInput = createElement("div", ["list"], {}, [
                ...studyGuideItem.questions.map(el => createElement("quiz-editor-question", [], {initialQuestion: el})),
                createElement("p", ["has-text-centered", "has-workaround"], {innerText: "MC: First is correct, SA: All are correct"})
            ]);
            actionButtons.splice(1, 0, createElement("button", ["button"], {title: "Add Question", type: "button"}, [
                createElement("span", ["icon"], {}, [createElement("i", ["material-symbols-rounded"], {innerText: "add"})]),
                createElement("span", [], {innerText: "Question"})
            ]));
            actionButtons[1].addEventListener("click", () => bodyInput.insertBefore(createElement("quiz-editor-question", [], {initialQuestion: {question: "", answers: [], type: 0}}), bodyInput.lastElementChild));
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
            actionButtons[0].disabled = actionButtons[1 + studyGuideItem.type].disabled = true;
            if (termInput.previousElementSibling) {
                termInput.previousElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.previousElementSibling as HTMLElement);
                termInput.nextElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = false); // they've been switched so use nextElementSibling
            }
            actionButtons[0].disabled = actionButtons[1 + studyGuideItem.type].disabled = false;
        });
        actionButtons[1 + studyGuideItem.type].addEventListener("click", async () => {
            actionButtons[0].disabled = actionButtons[1 + studyGuideItem.type].disabled = true;
            if (termInput.nextElementSibling) {
                termInput.nextElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = true);
                await switchElements(termInput, termInput.nextElementSibling as HTMLElement);
                termInput.previousElementSibling.querySelectorAll<HTMLButtonElement>(".btn-move").forEach(el => el.disabled = false);
            }
            actionButtons[0].disabled = actionButtons[1 + studyGuideItem.type].disabled = false;
        });
        termInput.dataset.type = studyGuideItem.type.toString();
    }
    if (termInput) optionalAnimate(fields.terms.appendChild(termInput), ...cardSlideInAnimation);
}
document.addEventListener("change", async () => {
    const localDb = await getLocalDb();
    await localDb.put("autosave-backups", { setId, ...serializeSet(), timestamp: new Date() });
    changesSaved = false;
});
async function goBack() {
    changesSaved = true;
    const localDb = await getLocalDb();
    await localDb.delete("autosave-backups", setId)
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#mysets";
}
fields.btnCancel.addEventListener("click", goBack);
fields.btnAddTerm.addEventListener("click", () => createTermInput({term: "", definition: "", type: 0} as TermDefinition));
fields.btnAddQuiz.addEventListener("click", () => createTermInput({title: "", questions: [{question: "", answers: [], type: 0}], type: 1}));
fields.btnImportTerms.addEventListener("click", () => importTerms());
fields.formEdit.addEventListener("submit", async e => {
    e.preventDefault();
    if (!ratelimit.canDoAction()) return;
    if (!fields.formEdit.reportValidity()) return fields.formEdit.classList.add("has-validated-inputs");
    const setData = serializeSet();
    if (setData.numTerms < 4 && setType !== 2) return toast({message: "You must have at least 4 terms in a set", type: "is-warning", dismissible: true, position: "bottom-center"});
    const currentUser = await refreshCurrentUser(auth);
    if (!currentUser) return toast({message: "You must be logged in to save a set", type: "is-warning" });
    
    const batchWriter = new BatchWriter();
    if (setId === "new" || setId === "new-timeline" || setId === "new-guide") {
        const documentId = generateDocumentId();
        batchWriter.update<VocabSet>(
            ["sets", documentId],
            { ...setData, creator: creator || currentUser.displayName, uid: currentUser.uid, likes: 0 },
            [{ fieldPath: "creationTime", setToServerValue: "REQUEST_TIME" }]
        );
    } else
        batchWriter.update<VocabSet>(
            ["sets", setId],
            { ...setData, creator: creator || currentUser.displayName }
        );
    try {
        await batchWriter.commit(currentUser.token.access);
        await goBack();
    } catch {
        toast({message: "We weren't able to save your set. This may be caused by a recent Display Name change.", type: "is-danger", dismissible: true, position: "bottom-center"})
    }
});
async function importTerms() {
    fields.importDialogInput.value = "";
    const result = await bulmaModalPromise(fields.importDialog)
    if (result) {
        const terms = fields.importDialogInput.value.split("\n").filter(el => el).map(el => {
            const splitted = el.split("  ");
            return {term: splitted.shift().trim().substring(0, 500), definition: splitted.join("  ").trim().substring(0, 500)};
        });
        for (const term of terms) createTermInput(term);
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