import { MDCDialog } from "@material/dialog/index";
import { MDCRipple } from "@material/ripple/index";
import { MDCSwitch } from "@material/switch/index";
import { MDCTextField } from "@material/textfield/index";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement, getBlooketSet, getWords, showCollections } from "./utils.js";

const setId = decodeURIComponent(location.pathname).match(/\/set\/([\w ]+)\/edit\/?/)[1] || (location.pathname = "/");
let creator = null;
const blooketDashboardRe = /https:\/\/dashboard\.blooket\.com\/set\/(\w+)\/?/;
const blooketHwRe = /https:\/\/play\.blooket\.com\/play\?hwId=(\w+)/;
const {db, auth} = initialize(async user => {
    if (!user) location.href = location.protocol + "//" + location.host + "/#login";
    else if (setId === "new") {
        document.title = "New Set - Vocabustudy";
        document.querySelector("h1").innerText = "New Set";
        fields.terms.textContent = "";
        fields.public.selected = false;
        fields.collections.querySelectorAll("input:checked").forEach(el => el.checked = false);
        creator = user.displayName;
    } else {
        let setSnap = await getDoc(doc(db, "sets", setId));
        let setMetaSnap = await getDoc(doc(db, "meta_sets", setId));
        if (!setSnap.exists() || !setMetaSnap.exists()) location.href = "/";
        let userIdToken = await user.getIdTokenResult();
        let isAdmin = userIdToken.claims.admin;
        const currentSet = setSnap.data();
        const currentSetMeta = setMetaSnap.data();
        if (!isAdmin && currentSet.uid !== user.uid) location.pathname = location.protocol + "//" + location.host + "/#login";;
        document.title = `Edit ${currentSet.name} - Vocabustudy`;
        fields.setName.value = currentSet.name;
        if (currentSet.description)
            fields.setDescription.value = currentSet.description;
        fields.public.selected = currentSet.public;
        fields.terms.textContent = "";
        fields.collections.querySelectorAll("input").forEach(el => el.checked = currentSetMeta.collections.includes(el.value));
        for (let term of currentSet.terms) createTermInput(term);
        creator = (currentSet.uid === user.uid) ? user.displayName : currentSetMeta.creator;
    }
});
const fields = {
    setName: new MDCTextField(document.querySelector(".field-name")),
    setDescription: new MDCTextField(document.querySelector(".field-description")),
    public: new MDCSwitch(document.getElementById("field-public")),
    terms: document.querySelector(".field-terms-edit"),
    btnCancel: document.querySelector(".btn-cancel"),
    btnAddTerm: document.querySelector(".btn-add-term"),
    btnImportTerms: document.querySelector(".btn-import-terms"),
    formEdit: document.querySelector("form"),
    importDialog: new MDCDialog(document.querySelector("#dialog-import-terms")),
    importDialogInput: new MDCTextField(document.querySelector("#dialog-import-terms .mdc-text-field--textarea")),
    collections: document.querySelector(".field-collections"),
    btnImportBlooket: document.querySelector(".btn-import-blooket"),
    fieldImportBlooket: new MDCTextField(document.querySelector(".field-import-blooket"))
};
let changesSaved = true;
function createTermInput({term, definition}) {
    let termInput = createElement("div", [], {}, [
        createElement("label", ["mdc-text-field", "mdc-text-field--outlined"], {}, [
            createElement("span", ["mdc-notched-outline"], {}, [
                createElement("span", ["mdc-notched-outline__leading"]),
                createElement("span", ["mdc-notched-outline__notch"], {}, [
                    createElement("span", ["mdc-floating-label"], {innerText: "Term"})
                ]),
                createElement("span", ["mdc-notched-outline__trailing"]),
            ]),
            createElement("input", ["mdc-text-field__input"], {"aria-label": "Term", type: "text", required: true}),
        ]),
        createElement("label", ["mdc-text-field", "mdc-text-field--outlined"], {}, [
            createElement("span", ["mdc-notched-outline"], {}, [
                createElement("span", ["mdc-notched-outline__leading"]),
                createElement("span", ["mdc-notched-outline__notch"], {}, [
                    createElement("span", ["mdc-floating-label"], {innerText: "Definition"})
                ]),
                createElement("span", ["mdc-notched-outline__trailing"]),
            ]),
            createElement("input", ["mdc-text-field__input"], {"aria-label": "Definition", type: "text", required: true}),
        ]),
        createElement("button", ["mdc-icon-button"], {type: "button"}, [
            createElement("div", ["mdc-icon-button__ripple"]),
            createElement("span", ["mdc-icon-button__focus-ring"]),
            createElement("i", ["material-icons-round"], {innerText: "delete"})
        ])
    ]);
    let termField = new MDCTextField(termInput.children[0]);
    let definitionField = new MDCTextField(termInput.children[1]);
    MDCRipple.attachTo(termInput.children[2]).unbounded = true;
    termField.value = term;
    definitionField.value = definition;
    termInput.children[2].addEventListener("click", () => termInput.remove());
    fields.terms.appendChild(termInput);
}
document.addEventListener("change", () => changesSaved = false);
function goBack() {
    changesSaved = true;
    history.length > 1 ? history.back() : location.href = location.protocol + "//" + location.host + "/#mysets";
}
fields.btnCancel.addEventListener("click", goBack);
fields.btnAddTerm.addEventListener("click", () => createTermInput({term: "", definition: ""}));
fields.btnImportTerms.addEventListener("click", () => importTerms());
fields.formEdit.addEventListener("submit", async e => {
    e.preventDefault();
    let terms = [...fields.terms.querySelectorAll(":scope > div")].map(el => {
        let inputs = el.querySelectorAll("input");
        return {term: inputs[0].value, definition: inputs[1].value};
    });
    if (terms.length < 4) return alert("You must have at least 4 terms in a set");
    let setName = fields.setName.value;
    let description = fields.setDescription.value;
    let nameWords = getWords(setName);
    let sPublic = fields.public.selected;
    let batch = writeBatch(db);
    let collections = [...fields.collections.querySelectorAll("input:checked")].map(el => el.value).filter(el => el);
    await auth.currentUser.reload();
    if (setId === "new") {
        let setRef = doc(collection(db, "sets"));
        let setMetaRef = doc(db, "meta_sets", setRef.id);
        batch.set(setMetaRef, {numTerms: terms.length, public: sPublic, name: setName, nameWords, creator: creator || auth.currentUser.displayName, uid: auth.currentUser.uid, collections});
        batch.set(setRef, {terms, public: sPublic, name: setName, uid: auth.currentUser.uid, description});
    } else {
        let setRef = doc(db, "sets", setId);
        let setMetaRef = doc(db, "meta_sets", setId);
        batch.update(setMetaRef, {numTerms: terms.length, public: sPublic, name: setName, nameWords, collections, creator: creator || auth.currentUser.displayName});
        batch.update(setRef, {terms, public: sPublic, name: setName, description});
    }
    await batch.commit();
    goBack();
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