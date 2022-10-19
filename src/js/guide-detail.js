import { MDCRipple } from "@material/ripple/index";
import { MDCTextField } from "@material/textfield/index";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore/lite";
import initialize from "./general.js";
import { createElement } from "./utils.js";
import {sanitize} from "dompurify";
import { marked } from "marked";

const {db, auth} = initialize(async user => {
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
        btnLike: document.querySelector("#home .btn-like"),
        commentsContainer: document.querySelector(".comments-container"),
        fieldComment: document.querySelector("#home .field-comment"),
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

function createItem({ title, body }) {
    let cardEl = createElement("div", ["mdc-card", "mdc-card--outlined"], {}, [
        createElement("div", ["mdc-card-wrapper__text-section"], {}, [
            createElement("div", ["mdc-typography--headline6"], {innerHTML: sanitize(marked.parse("# " + title))}),
            createElement("div", [], {innerHTML: sanitize(marked.parse(body))})
        ])
    ]);
    return pages.setOverview.terms.appendChild(cardEl);
}
function createCommentCard({ name, comment, like }, id) {
    let isMyComment = auth.currentUser?.uid === id;
    let cardEl = createElement("div", ["mdc-card"]);
    let cardHeading = cardEl.appendChild(createElement("div", ["mdc-card-wrapper__text-section"]));
    let cardTitle = cardHeading.appendChild(createElement("div", ["mdc-typography--headline6"], {innerText: name}));
    cardTitle.style.fontWeight = "600";
    let cardText = cardHeading.appendChild(document.createElement("div"));
    if (isMyComment) {
        cardText.appendChild(pages.setOverview.fieldComment).hidden = false;
        pages.setOverview.fieldComment.input.value = comment;
    } else {
        cardText.innerHTML = sanitize(marked.parseInline(comment));
        cardText.style.overflowWrap = "break-word";
        if (like) cardText.appendChild(createElement("span", ["likes-badge"], {innerText: `${name} likes this set`}));
    }
    return pages.setOverview.commentsContainer.appendChild(cardEl);
}

addEventListener("DOMContentLoaded", async () => {
    pages.setOverview.fieldComment.input = new MDCTextField(pages.setOverview.fieldComment.querySelector("label"));
    pages.setOverview.fieldComment.button = new MDCRipple(pages.setOverview.fieldComment.querySelector("button")).root;
    try {
        let setSnap = await getDoc(setRef);
        currentSet = setSnap.data();
        document.title = `${currentSet.name} - Vocabustudy`;
        currentSet.terms.forEach(term => {
            term.title = term.title.replace(/[\u2018\u2019]/g, "'");
            term.body = term.body.replace(/[\u2018\u2019]/g, "'");
        });

        // MDC Instantiation and Events
        pages.setOverview.name.innerText = currentSet.name;
        pages.setOverview.description.innerHTML = sanitize(marked.parse(currentSet.description || ""))
        pages.setOverview.numTerms.innerText = currentSet.terms.length;
        for (let term of currentSet.terms) createItem(term);
        pages.setOverview.btnLike.addEventListener("click", async () =>  {
            if (!auth.currentUser) location.href = "/#login";
            else if (socialRef) {
                let currentLikeStatus = pages.setOverview.btnLike.querySelector(".mdc-button__icon").innerText === "favorite";
                await setDoc(socialRef, {like: !currentLikeStatus, name: auth.currentUser.displayName}, {merge: true});
                showLikeStatus(!currentLikeStatus);
            }
        });
        pages.setOverview.commentsContainer.parentElement.addEventListener("toggle", async () => { // TODO modularize
            let comments = await getDocs(query(collection(setRef, "social"), orderBy("comment")));
            if (comments.size) comments.forEach(comment => createCommentCard(comment.data(), comment.id));
            else pages.setOverview.commentsContainer.innerText = "No Comments. Post one!";
            if (auth.currentUser && !pages.setOverview.commentsContainer.querySelector(".mdc-text-field")) {
                createCommentCard({name: auth.currentUser.displayName, comment: ""}, auth.currentUser.uid);
                pages.setOverview.fieldComment.input.valid = true;
            }
        }, {once: true});
        pages.setOverview.fieldComment.input.listen("change", () => pages.setOverview.fieldComment.button.disabled = false);
        pages.setOverview.fieldComment.button.addEventListener("click", async () => {
            if (auth.currentUser && (pages.setOverview.fieldComment.input.valid = pages.setOverview.fieldComment.input.valid)) {
                await setDoc(socialRef, {comment: pages.setOverview.fieldComment.input.value, name: auth.currentUser.displayName}, {merge: true});
                pages.setOverview.fieldComment.button.disabled = true;
            }
        });
    } catch (err) {
        if (process.env.NODE_ENV !== "production") console.log(err);
        else location.replace("/404.html");
    }
});

addEventListener("hashchange", () => navigate());