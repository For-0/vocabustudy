import { FirebaseStorage, ref, getDownloadURL } from "firebase/storage";
import { MDCCheckbox } from "@material/checkbox";
import { MDCList } from "@material/list";
import { MDCRipple } from "@material/ripple";
import { documentId, getDocs, limit, orderBy, query, startAfter } from "firebase/firestore/lite";
import { MDCTextField } from "@material/textfield";
const checkboxBackground = '<svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24"><path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59" /></svg><div class="mdc-checkbox__mixedmark"></div>';
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

async function fetchStorageJson(storage, url) {
    let pathRef = ref(storage, url);
    let downloadUrl = await getDownloadURL(pathRef);
    let res = await fetch(downloadUrl);
    return await res.json();
}
/**
 * Loads the collections, from cache if possible
 * @param {FirebaseStorage} storage The storage instance - will only be used if cache is not available/expired
 * @returns {Promise<{c: (String|{n: String, s: String[], o: String[]?})[]}>}
 */
export async function loadCollections(storage) {
    let possibleCachedItem = localStorage.getItem("collections_cache");
    let currentTime = Date.now();
    if (possibleCachedItem) {
        let cachedItem = JSON.parse(possibleCachedItem);
        if (cachedItem.expiration && cachedItem.data && cachedItem.expiration > currentTime) return cachedItem.data;
    }
    let newCollections = await fetchStorageJson(storage, "collections.json");
    let newExpiration = currentTime + 604800000; // number of milliseconds in a week
    localStorage.setItem("collections_cache", JSON.stringify({ data: newCollections, expiration: newExpiration }));
    return newCollections;
}
/**
 * Loads the leaderboard, from cache if possible
 * @param {FirebaseStorage} storage The storage instance - will only be used if cache is not available/expired
 * @returns {Promise<{c: {p: String, s: String}[]}>}
 */
export async function loadLeaderboard(storage) {
    let possibleCachedItem = localStorage.getItem("leaderboard_cache");
    let currentTime = Date.now();
    if (possibleCachedItem) {
        let cachedItem = JSON.parse(possibleCachedItem);
        if (cachedItem.expiration && cachedItem.data && cachedItem.expiration > currentTime) return cachedItem.data;
    }
    let newLeaderboard = await fetchStorageJson(storage, "leaderboard.json");
    let newExpiration = new Date(currentTime);
    newExpiration.setHours(23);
    newExpiration.setMinutes(59);
    localStorage.setItem("leaderboard_cache", JSON.stringify({ data: newLeaderboard, expiration: Number(newExpiration) }));
    return newLeaderboard;
}
export async function showCollections(listEl, storage) {
    let { c } = await loadCollections(storage);
    for (let [i, collection] of c.entries()) {
        if (typeof collection === "string") listEl.appendChild(createCollectionListItem(collection, i));
        else if (typeof collection === "object") {
            let groupEl = listEl.appendChild(createCollectionParentListItem(collection.n));
            /** @type {HTMLLIElement[]} */
            let subEls = [];
            subEls.push(listEl.appendChild(createCollectionListItem("General", i)));
            groupEl.addEventListener("click", () => subEls.forEach(el => {
                let hidden = el.classList.toggle("width-only");
                if (el.options && hidden) el.options.forEach(el2 => el2.classList.add("width-only"));
            }));
            if (collection.o) for (let [j, subCollection] of collection.s.entries()) {
                let subEl = listEl.appendChild(createCollectionParentListItem(subCollection));
                subEls.push(subEl);
                subEl.options = [];
                subEl.addEventListener("click", () => subEl.options.forEach(el => el.classList.toggle("width-only")));
                subEl.options.push(listEl.appendChild(createCollectionListItem("General", `${i}:${j}`)));
                for (let [k, option] of collection.o.entries()) subEl.options.push(listEl.appendChild(createCollectionListItem(option, `${i}:${j}:${k}`)));
                subEl.options.forEach(el => {
                    el.classList.add("width-only");
                    el.style.marginLeft = "32px";
                });
            } else for (let [j, subCollection] of collection.s.entries()) subEls.push(listEl.appendChild(createCollectionListItem(subCollection, `${i}:${j}`)));
            subEls.forEach(el => {
                el.classList.add("width-only");
                el.style.marginLeft = "16px";
            });
        }
    }
    let list = new MDCList(listEl);
    list.listElements.forEach(el => MDCRipple.attachTo(el));
}
/**
 * Creates a collection list item for putting in a multiselect list
 * @param {String} name Collection name
 * @param {String} i Collection id
 * @returns {HTMLElement} the list item
 */
export function createCollectionListItem(name, i) {
    let checkboxEl = createElement("div", ["mdc-checkbox"], {}, [
        createElement("input", ["mdc-checkbox__native-control"], { type: "checkbox", name: "collections-filter" }),
        createElement("div", ["mdc-checkbox__background"], { innerHTML: checkboxBackground }),
        createElement("div", ["mdc-checkbox__ripple"])
    ]);
    checkboxEl.setAttribute("tabindex", "-1");
    let listItem = createElement("li", ["mdc-list-item", "mdc-list-item--with-leading-checkbox"], {}, [
        createElement("span", ["mdc-list-item__ripple"]),
        createElement("span", ["mdc-list-item__start"], {}, [checkboxEl]),
        createElement("span", ["mdc-list-item__content"], {}, [
            createElement("span", ["mdc-list-item__primary-text"], { innerText: name })
        ])
    ]);
    listItem.setAttribute("tabindex", "-1");
    let checkbox = new MDCCheckbox(checkboxEl);
    checkbox.value = i;
    return listItem;
}
/**
 * Creates a collection parent list item for putting in a multiselect list
 * @param {String} name Collection name
 * @param {String} i Collection id
 * @returns {HTMLElement} the list item
 */
export function createCollectionParentListItem(name) {
    let checkboxEl = createElement("div", ["mdc-checkbox"], {}, [
        createElement("input", ["mdc-checkbox__native-control"], { type: "checkbox", name: "collections-filter", value: "" }),
        createElement("div", ["mdc-checkbox__background"], { innerHTML: checkboxBackground }),
        createElement("div", ["mdc-checkbox__ripple"])
    ]);
    let listItem = createElement("li", ["mdc-list-item", "mdc-list-item--with-trailing-icon", "list-parent-item"], {}, [
        createElement("span", ["mdc-list-item__ripple"]),
        createElement("span", ["mdc-list-item__start"], {}, [checkboxEl]),
        createElement("span", ["mdc-list-item__content"], {}, [
            createElement("span", ["mdc-list-item__primary-text"], { innerText: name })
        ]),
        createElement("span", ["mdc-list-item__end"], {}, [
            createElement("i", ["material-icons-round"], { innerText: "expand_more" })
        ]),
    ]);
    listItem.setAttribute("tabindex", "-1");
    return listItem;
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
async function parseCollections(collections, storage) {
    let {c} = await loadCollections(storage);
    let parsedCollections = collections.map(el => el.split(":").map(el => parseInt(el)));
    let collectionNames = parsedCollections.map(el => {
        try {
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
    return collectionNames.map(el => createElement("span", ["collection-label"], {innerText: el || "Unknown Collection"}));
}
export function createTextFieldWithHelper(innerText, helperText) {
    let helperId = `_${crypto.randomUUID()}`;
    let textField = createElement("label", ["mdc-text-field", "mdc-text-field--outlined"], {}, [
        createElement("span", ["mdc-notched-outline"], {}, [
            createElement("span", ["mdc-notched-outline__leading"]),
            createElement("span", ["mdc-notched-outline__notch"], {}, [
                createElement("span", ["mdc-floating-label"], {innerText})
            ]),
            createElement("span", ["mdc-notched-outline__trailing"]),
        ]),
        createElement("input", ["mdc-text-field__input"], {ariaLabel: innerText, type: "text", pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"})
    ]);
    textField.style.width = "100%";
    textField.querySelector("input").setAttribute("aria-controls", helperId);
    textField.querySelector("input").setAttribute("aria-describedby", helperId);
    let helperLine = createElement("div", ["mdc-text-field-helper-line"], {}, [
        createElement("div", ['mdc-text-field-helper-text'], {ariaHidden: true, innerText: helperText, id: helperId})
    ]);
    let textFieldC = new MDCTextField(textField);
    return {textField, helperLine, obj: textFieldC}
}

export async function createSetCardOwner(set, id, storage) {
    let collectionLabels = await parseCollections(set.collections, storage);
    let buttons = [
        createElement("a", ["mdc-button", "mdc-card__action", "mdc-card__action--button"], {href: `/set/${id}/view/`}, [
            createElement('div', ["mdc-button__ripple"]),
            createElement("div", ["mdc-button__label"], {innerText: "View"})
        ]),
        createElement("a", ["mdc-button", "mdc-card__action", "mdc-card__action--button"], {href: `/set/${id}/edit/`}, [
            createElement('div', ["mdc-button__ripple"]),
            createElement("div", ["mdc-button__label"], {innerText: "Edit"})
        ]),
        createElement("button", ["mdc-button", "mdc-card__action", "mdc-card__action--button"], {}, [
            createElement('div', ["mdc-button__ripple"]),
            createElement("div", ["mdc-button__label"], {innerText: "Delete"})
        ])
    ];
    buttons.forEach(el => MDCRipple.attachTo(el));
    let likeText = set.public ? ` - ${set.likes || "0"} likes` : "";
    let cardEl = createElement("div", ["mdc-card"], {}, [
        createElement("div", ["mdc-card-wrapper__text-section"], {}, [
            createElement("div", ["mdc-typography--headline5", "fw-bold"], { innerText: set.name }),
            createElement("div", [], { innerText: `${set.numTerms} terms${likeText}\nCreated by ${set.creator}` })
        ]),
        createElement("div", ["mdc-card-wrapper__text-section"], {}, [
            createElement("div", [], { innerText: `Visibility: ${set.public ? "Public" : "Private"}` })
        ]),
        createElement("div", ["mdc-card-wrapper__text-section"], {}, collectionLabels),
        createElement("div", ["mdc-card__actions"], {}, buttons)
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
export async function createSetCard({ name, creator, numTerms, collections, likes, uid }, id, storage, relevance=null) {
    let collectionLabels = await parseCollections(collections, storage);
    let textEls = [];
    if (relevance) {
        textEls.push(createElement("a", [], { innerText: `Created by ${creator}`, href: `/user/${uid}/` }));
        textEls.push(createElement("div", [], {innerText: `Confidence: ${Math.floor(relevance * 100)}%`}))
    } else textEls.push(createElement("div", [], { innerText: `Created by ${creator}` }));
    let primaryAction = createElement("a", ["mdc-card__primary-action"], { tabindex: 0, href: `/set/${id}/view/` }, [
        createElement("div", ["mdc-card-wrapper__text-section"], {}, [
            createElement("div", ["mdc-typography--headline5", "fw-bold"], { innerText: name }),
            createElement("div", [], { innerText: `${numTerms} terms - ${likes || "0"} likes` })
        ]),
        createElement("div", ["mdc-card-wrapper__text-section"], {}, textEls),
        createElement("div", ["mdc-card-wrapper__text-section"], {}, collectionLabels),
        createElement("div", ["mdc-card__ripple"])
    ]);
    let cardEl = createElement("div", ["mdc-card"], {}, [primaryAction])
    MDCRipple.attachTo(primaryAction);
    return { card: cardEl, primaryAction };
}
export function createCustomCollectionCard(collection) {
    let buttons = [
        createElement("button", ["mdc-button", "mdc-card__action", "mdc-card__action--button"], {}, [
            createElement('div', ["mdc-button__ripple"]),
            createElement("div", ["mdc-button__label"], {innerText: "Add Set"})
        ]),
        createElement("button", ["mdc-button", "mdc-card__action", "mdc-card__action--button"], {disabled: true}, [
            createElement('div', ["mdc-button__ripple"]),
            createElement("div", ["mdc-button__label"], {innerText: "Save"})
        ]),
        createElement("button", ["mdc-button", "mdc-card__action", "mdc-card__action--button"], {}, [
            createElement('div', ["mdc-button__ripple"]),
            createElement("div", ["mdc-button__label"], {innerText: "Delete"})
        ])
    ];
    /** @type {MDCTextField[]} */
    let textFields = [];
    let textEls = collection.sets.flatMap(setId => {
        let {textField, helperLine, obj} = createTextFieldWithHelper("Set ID", "vocabustudyonline.web.app/set/<SET ID>/view/");
        obj.value = setId;
        textFields.push(obj);
        return [textField, helperLine];
    })
    buttons.forEach(el => MDCRipple.attachTo(el));
    let cardEl = createElement("div", ["mdc-card"], {}, [
        createElement("div", ["mdc-card-wrapper__text-section"], {}, [
            createElement("div", ["mdc-typography--headline5", "fw-bold"], { innerText: collection.name }),
            createElement("div", [], { innerText: `${collection.sets.length} sets` })
        ]),
        createElement("div", ["mdc-card-wrapper__text-section", "collection-sets"], {}, [...textEls]),
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
export async function paginateQueries(queries, btnMore, onResults, startAfterN = [0]) {
    let querySnapshots = await Promise.all(queries.map((el, i) => getDocs(startAfterN[i] ? query(el, orderBy(documentId()), startAfter(startAfterN[i]), limit(10)): query(el, orderBy(documentId()), limit(10)))));
    onResults(querySnapshots.flatMap(el => el.docs));
    btnMore.hidden = true;
    btnMore.onclick = () => {};
    let nextQueries = querySnapshots.map((el, i) => ({snap: el, origQ: queries[i]})).filter(el => el.snap.size >= 10);
    if (nextQueries.length) {
        btnMore.hidden = false;
        btnMore.onclick = () => paginateQueries(nextQueries.map(el => el.origQ), btnMore, onResults, nextQueries.map(el => el.snap.docs[el.snap.size - 1]));
    }
}