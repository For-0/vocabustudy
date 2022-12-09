import { MDCRipple } from "@material/ripple/index";
import { MDCTextField } from "@material/textfield/index";
import { documentId, getDocs, limit, orderBy, query, startAfter } from "firebase/firestore/lite";

const ignoredCharsRE = /[*_.]/g;
const mdLinkRE = /!?\[[^\]]*\]\([^)]*\)/g;
/**
 * Remove ignored characters and markdown links from a string, and trim it
 * @param {string} answer The answer to normalize
 * @returns {string} The normalized answer
 */
export function normalizeAnswer(answer) {
    return answer.replace(ignoredCharsRE, "").replace(mdLinkRE, "").trim();
}
export function toLocaleDate(dateData) {
    switch (typeof dateData) {
        case "number": return new Date(dateData * 1000).toLocaleString();
        default: return new Date(Date.parse(dateData)).toLocaleString();
    }
}
/**
 * Creates an element
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} type The node type
 * @param {String[]} classes Classes to apply to the element
 * @param {HTMLElementTagNameMap[T]} attrs Attributes on the element to apply
 * @param {HTMLElement[]} children Children of the element
 * @returns {HTMLElementTagNameMap[T]} The created element
 */
export function createElement(type, classes = [], attrs = {}, children = []) {
    let el = document.createElement(type);
    if (classes.length) el.classList.add(...classes);
    Object.keys(attrs).forEach(key => el[key] = attrs[key]);
    for (let child of children) el.appendChild(child);
    return el;
}
/**
 * Get a list of all alphanumeric words in a string
 * @param {String} string The string to get words from
 * @returns {String[]}
 */
export function getWords(string) {
    let alphaNum = string.replace(/\W/g, " ").toLowerCase();
    return alphaNum.split(" ").map(el => el.trim()).filter(el => el);
}

/**
 * Loads the collections, from cache if possible otherwise from network
 * @returns {Promise<{c: (String|{n: String, s: String[], o: String[]?})[]}>}
 */
export async function loadCollections() {
    let possibleCachedItem = localStorage.getItem("collections_cache");
    let currentTime = Date.now();
    if (possibleCachedItem) {
        let cachedItem = JSON.parse(possibleCachedItem);
        if (cachedItem.expiration && cachedItem.data && cachedItem.expiration > currentTime) return cachedItem.data;
    }
    let newCollections = await import("../collections.json");
    let newExpiration = currentTime + 604800000; // number of milliseconds in a week
    localStorage.setItem("collections_cache", JSON.stringify({ data: newCollections, expiration: newExpiration }));
    return newCollections;
}
export async function showCollections(listEl) {
    let { c } = await loadCollections();
    for (let [i, collection] of c.entries()) {
        if (typeof collection === "string") listEl.appendChild(createCollectionListItem(collection, i));
        else if (typeof collection === "object") {
            let groupEl = createCollectionParentListItem(collection.n);
            listEl.appendChild(groupEl.listItem);
            groupEl.childList.appendChild(createCollectionListItem("General", i));
            if (collection.o) for (let [j, subCollection] of collection.s.entries()) {
                let subEl = createCollectionParentListItem(subCollection);
                groupEl.childList.appendChild(subEl.listItem);
                subEl.childList.appendChild(createCollectionListItem("General", `${i}:${j}`));
                for (let [k, option] of collection.o.entries()) subEl.childList.appendChild(createCollectionListItem(option, `${i}:${j}:${k}`));
            } else for (let [j, subCollection] of collection.s.entries()) groupEl.childList.appendChild(createCollectionListItem(subCollection, `${i}:${j}`));
        }
    }
    return c;
}
/**
 * Creates a collection list item for putting in a multiselect list
 * @param {String} name Collection name
 * @param {String} i Collection id
 * @returns {HTMLElement} the list item
 */
function createCollectionListItem(name, i) {
    let inputId = `_${crypto.randomUUID()}`;
    let listItem = createElement("li", [], {}, [
        createElement("a", ["field"], {}, [
            createElement("input", ["is-checkradio"], {id: inputId, type: "checkbox", value: i}),
            createElement("label", [], {htmlFor: inputId, innerText: name})
        ])
    ]);
    return listItem;
}
/**
 * Creates a collection parent list item for putting in a multiselect list
 * @param {String} name Collection name
 * @returns the list item and the child list
 */
function createCollectionParentListItem(name) {
    let childList = createElement("ul");
    let listText = createElement("a", [], {innerText: name}, [
        createElement("span", ["icon", "is-pulled-right"], {}, [
            createElement("i", ["material-symbols-rounded"], {innerText: "expand_more"})
        ])
    ]);
    let listItem = createElement("li", [], {}, [listText, childList]);
    listText.addEventListener("click", () => listText.classList.toggle("is-active"));
    return {listItem, childList};
}

export function getBlooketSet(setId, setType) {
    return new Promise(resolve => {
        let setUrl = new URL("https://script.google.com/macros/s/AKfycbzL3cHHAG_HxXH_n_3gDsM0GWPpUvKi1LldczWV3y5YFHssbelIJtDNncNB_n-utv8/exec");
        setUrl.search = new URLSearchParams({type: "blooket", bType: setType, callback: "resolveBlooket", set: setId}).toString();
        let el = document.createElement("script");
        window.resolveBlooket = e => {el.remove(); resolve(e);}
        el.src = setUrl;
        document.body.appendChild(el);
    });
}
export async function parseCollections(collections, allCollections=null) {
    let {c} = allCollections || await loadCollections();
    let parsedCollections = collections.map(el => el.split(":").map(el => parseInt(el)));
    let collectionNames = parsedCollections.map(el => {
        try {
            if (isNaN(el[0])) {
                if (el[1] == "0") return "Study Guide : Timeline";
                else if (el[1] == "1") return "Study Guide : Notes";
            }
            let collectionName = c[el[0]];
            if (typeof collectionName === "string") return collectionName;
            else {
                if (el.length === 1) return collectionName.n;
                else if (el.length === 2) return `${collectionName.n} : ${collectionName.s[el[1]]}`;
                else return `${collectionName.n} : ${collectionName.s[el[1]]} : ${collectionName.o[el[2]]}`;
            }
        } catch {
            return "Unknown Collection";
        }
    });
    return collectionNames.map(el => createElement("span", ["tag", "is-primary", "mr-2"], {innerText: el || "Unknown Collection"}));
}
/**
 * Create a text field with an optional helper
 * @param {String} innerText Label text
 * @param {String?} helperText Helper text
 * @param {HTMLInputElement} extraProperties Properties for the input el
 * @returns {{textField: HTMLLabelElement, helperLine: HTMLDivElement?, obj: MDCTextField}}
 */
export function createTextFieldWithHelper(innerText, helperText=null, extraProperties={pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"}) {
    let textField = createElement("label", ["mdc-text-field", "mdc-text-field--outlined"], {}, [
        createElement("span", ["mdc-notched-outline"], {}, [
            createElement("span", ["mdc-notched-outline__leading"]),
            createElement("span", ["mdc-notched-outline__notch"], {}, [
                createElement("span", ["mdc-floating-label"], {innerText})
            ]),
            createElement("span", ["mdc-notched-outline__trailing"]),
        ]),
        createElement("input", ["mdc-text-field__input"], {ariaLabel: innerText, type: "text", ...extraProperties})
    ]);
    textField.style.width = "100%";
    let helperLine = null;
    if (helperText) {
        let helperId = `_${crypto.randomUUID()}`;
        textField.querySelector("input").setAttribute("aria-controls", helperId);
        textField.querySelector("input").setAttribute("aria-describedby", helperId);
        helperLine = createElement("div", ["mdc-text-field-helper-line"], {}, [
            createElement("div", ['mdc-text-field-helper-text'], {ariaHidden: true, innerText: helperText, id: helperId})
        ]);
    }
    let textFieldC = new MDCTextField(textField);
    return {textField, helperLine, obj: textFieldC}
}

export async function createSetCardOwner(set, id, linkCreator=false) {
    let collectionLabels = await parseCollections(set.collections);
    let setType = set.collections.includes("-:0") ? "timeline" : (set.collections.includes("-:1") ? "guide" : "set");
    let buttons = [
        createElement("a", ["card-footer-item", "has-text-primary"], {href: `/${setType}/${id}/view/`, innerText: "View"}),
        createElement("a", ["card-footer-item", "has-text-primary"], {href: `/set/${id}/edit/`, innerText: "Edit"}),
        createElement("button", ["card-footer-item", "has-text-danger"], {innerText: "Delete"})
    ];
    buttons.forEach(el => MDCRipple.attachTo(el));
    if (linkCreator) buttons.push(createElement("a", ["card-footer-item", "has-text-primary"], {href: `/user/${uid}/`, innerText: "More by User"}));
    let likeText = set.public ? ` - ${set.likes || "0"} likes` : "";
    let cardEl = createElement("div", ["card"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], { innerText: name }),
            createElement("span", ["card-header-icon"], {}, [
                createElement("span", ["tag", set.public ? "is-success" : "is-warning"], {innerText: set.public ? "Public" : "Private"})
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content"], {innerText: `${numTerms} terms - ${likeText}`}, [
                createElement("br"),
                createElement("span", [], {innerText: `Created by ${set.creator}`}),
                ...collectionLabels
            ])
        ]),
        createElement("footer", ["card-footer"], {}, buttons)
    ]);
    return { card: cardEl, buttons };
}
/**
* Create a set card for view in the browse set area
* @param {Object} obj The Set
* @param {string} obj.name
* @param {string} obj.creator
* @param {number} obj.numTerms
* @param {string[]} obj.collections
* @param {string} id ID of the set
* @param {float} relevance Relevance, from 0 to 1
* @returns The card and primary action
*/
export async function createSetCard({ name, creator, numTerms, collections, likes, uid }, id, relevance=null) {
    let collectionLabels = await parseCollections(collections);
    let textEls = [];
    if (relevance !== null) {
        textEls.push(createElement("p", ["m-0", "has-text-weight-bold"], { innerText: `Created by ${creator}`}));
        textEls.push(createElement("p", ["m-0"], {innerText: `Confidence: ${Math.floor(relevance * 100)}%`}))
    } else textEls.push(createElement("div", ["has-text-weight-bold"], { innerText: `Created by ${creator}` }));
    let setType = collections.includes("-:0") ? "timeline" : (collections.includes("-:1") ? "guide" : "set");
    let cardEl = createElement("div", ["card"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], { innerText: name }),
            createElement("a", ["card-header-icon", "has-tooltip-arrow", "link-user"], {href: `/user/${uid}/`}, [
                createElement("span", ["icon"], {}, [
                    createElement("i", ["is-filled", "material-symbols-rounded"], {innerText: "person"})
                ])
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content"], {innerText: `${numTerms} terms - ${likes || "0"} likes`}, [
                createElement("br"),
                ...textEls,
                ...collectionLabels
            ])
        ]),
        createElement("footer", ["card-footer"], {}, [
            createElement("a", ["card-footer-item", "has-text-primary"], {href: `/${setType}/${id}/view/`, innerText: "View"}),
            createElement("a", ["card-footer-item", "has-text-primary", "link-user"], {href: `/user/${uid}/`, innerText: "More By User"})
        ])
    ]);
    if (!uid) cardEl.querySelectorAll(".link-user").forEach(el => el.remove());
    else cardEl.querySelector("a.has-tooltip-arrow").dataset.tooltip = `Created by ${creator}`;
    cardEl.querySelector("footer").style.whiteSpace = "nowrap";
    return { card: cardEl };
}
export function createCustomCollectionCard(collection, id) {
    let buttons = [
        createElement("a", ["button", "mdc-card__action", "mdc-card__action--button"], {href: `/collection/${id}/`}, [
            createElement('div', ["button__ripple"]),
            createElement("div", ["button__label"], {innerText: "View"})
        ]),
        createElement("button", ["button", "mdc-card__action", "mdc-card__action--button"], {}, [
            createElement('div', ["button__ripple"]),
            createElement("div", ["button__label"], {innerText: "Add Set"})
        ]),
        createElement("button", ["button", "mdc-card__action", "mdc-card__action--button"], {disabled: true}, [
            createElement('div', ["button__ripple"]),
            createElement("div", ["button__label"], {innerText: "Save"})
        ]),
        createElement("button", ["button", "mdc-card__action", "mdc-card__action--button"], {}, [
            createElement('div', ["button__ripple"]),
            createElement("div", ["button__label"], {innerText: "Delete"})
        ])
    ];
    /** @type {MDCTextField[]} */
    let textFields = [];
    let textEls = collection.sets.flatMap(setId => {
        let {textField, helperLine, obj} = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/");
        obj.value = setId;
        textFields.push(obj);
        return [textField, helperLine];
    })
    buttons.forEach(el => MDCRipple.attachTo(el));
    let cardEl = createElement("div", ["mdc-card"], {}, [
        createElement("div", ["card-content"], {}, [
            createElement("div", ["title.is-size-5", "fw-bold"], { innerText: collection.name }),
            createElement("div", [], { innerText: `${collection.sets.length} sets` })
        ]),
        createElement("div", ["card-content", "collection-sets"], {}, [...textEls]),
        createElement("div", ["mdc-card__actions"], {}, buttons)
    ]);
    return { card: cardEl, buttons, textFields };
}

/**
 * Callback when results are available
 * @callback resultsAvailableCallback
 * @param {import("firebase/firestore/lite").QueryDocumentSnapshot<import("firebase/firestore/lite").DocumentData>[]} docs Documents fetched
 */
/**
 * Paginate a single query
 * @param {import("firebase/firestore/lite").Query[]} queries Initial query
 * @param {HTMLButtonElement} btnMore Button that will load more
 * @param {resultsAvailableCallback} onResults Callback to execute when results are available
 * @param {import("firebase/firestore/lite").DocumentSnapshot[] | number[]} startAfterN Document to start after
 */
export async function paginateQueries(queries, btnMore, onResults, startAfterN = [0], orderByField=[documentId()]) {
    let querySnapshots = await Promise.all(queries.map((el, i) => getDocs(startAfterN[i] ? query(el, orderBy(...orderByField), startAfter(startAfterN[i]), limit(10)): query(el, orderBy(...orderByField), limit(10)))));
    onResults(querySnapshots.flatMap(el => el.docs));
    btnMore.hidden = true;
    btnMore.onclick = () => {};
    let nextQueries = querySnapshots.map((el, i) => ({snap: el, origQ: queries[i]})).filter(el => el.snap.size >= 10);
    if (nextQueries.length) {
        btnMore.hidden = false;
        btnMore.onclick = () => paginateQueries(nextQueries.map(el => el.origQ), btnMore, onResults, nextQueries.map(el => el.snap.docs[el.snap.size - 1]), orderByField);
    }
}

export async function initBulmaModals(modals) {
    modals.forEach(modal => {
        // If a modal is close-only (there is no accept/deny and it will not be used with bulmaModalPromise) then do this
        if (modal.onclose) modal.root.querySelectorAll(".action-close").forEach(el => el.addEventListener("click", () => modal.close()));
        modal.on("close", () => modal.onclose && modal.onclose())
    });
}
/**
 * Wait for a BulmaJS Modal to close, whether by button press or other close method
 */
export async function bulmaModalPromise(modal) {
    return new Promise(resolve => {
        modal.open();
        modal.onclose = () => resolve(false);
        modal.root.querySelector("footer button").onclick = async () => {
            if (!modal.validateInput || await modal.validateInput()) {
                modal.onclose = null;
                modal.close();
                resolve(true);
            }
        }
    });
}