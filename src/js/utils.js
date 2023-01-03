import { sanitize } from "dompurify";
import { documentId, getDocs, limit, orderBy, query, startAfter } from "firebase/firestore/lite";
import { marked } from "marked";

const ignoredCharsRE = /[*_.]/g;
const mdLinkRE = /!?\[[^\]]*\]\([^)]*\)/g;
export const SET_VISIBILITIES = [
    {title: "Private", color: "warning"},
    {title: "Unlisted", color: "info"},
    {title: "Public", color: "success"},
    {title: "Shared", color: "link"}
];
/** @type {[Keyframe[], KeyframeAnimationOptions]} */
export const cardSlideInAnimation = [
    [
        {opacity: 0, transform: "translateY(20px)"},
        {opacity: 1, transform: "translateY(0)"},
    ],
    {easing: "ease", duration: 400}
];
const zoomOutAnimation = [
    [
        {transform: "scale(1)", opacity: 1, transformOrigin: "center"},
        {transform: "scale(0)", opacity: 0},
        {width: 0, minWidth: 0, transform: "scale(0)", opacity: 0, padding: 0,  margin: 0, height: 0, minHeight: 0}
    ],
    {easing: "ease", duration: 700}
];
/**
 * Remove ignored characters and markdown links from a string, and trim it
 * @param {string} answer The answer to normalize
 * @returns {string} The normalized answer
 */
export function normalizeAnswer(answer) {
    return answer.replace(ignoredCharsRE, "").replace(mdLinkRE, "").trim();
}
export function checkAnswers(answer, correct) {
    let cleanAnswer = normalizeAnswer(answer).toUpperCase();
    let possibleCorrect = [correct, correct.split(","), correct.split("/")].flat().map(el => el = normalizeAnswer(el).toUpperCase());
    return possibleCorrect.includes(cleanAnswer);
}
export function toLocaleDate(dateData) {
    switch (typeof dateData) {
        case "number": return new Date(dateData * 1000).toLocaleString();
        default: return new Date(Date.parse(dateData)).toLocaleString();
    }
}
/**
 * Apply markdown styling 
 * @param {string} text 
 * @param {boolean} inline 
 * @returns {string} The styled text, which can safely be applied to inner HTML
 */
export function styleAndSanitize(text, inline=false) {
    return sanitize(marked[inline ? "parseInline" : "parse"](text), { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] });
}
/**
 * Make the content of a node only break on spaces
 * @param {Node} node 
 */
export function preventBreaking(node) {
    for (let childNode of [...node.childNodes]) {
        if (childNode.nodeType === Node.ELEMENT_NODE) preventBreaking(childNode);
        else if (childNode.nodeType === Node.TEXT_NODE) {
            let nodesFragment = document.createDocumentFragment();
            for (let textSegment of childNode.textContent.split(" ")) {
                if (textSegment !== "") nodesFragment.appendChild(createElement("span", [], {innerText: textSegment, style: {whiteSpace: "nowrap"}}));
                nodesFragment.appendChild(document.createTextNode(" "));
            }
            if (nodesFragment.childNodes.length > 1) nodesFragment.lastChild.remove();
            node.replaceChild(nodesFragment, childNode);
        }
    }
}
/**
 * Creates an element
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T|[T, string]} type The node type
 * @param {String[]} classes Classes to apply to the element
 * @param {HTMLElementTagNameMap[T]} attrs Attributes on the element to apply
 * @param {HTMLElement[]} children Children of the element
 * @returns {HTMLElementTagNameMap[T]} The created element
 */
export function createElement(type, classes = [], attrs = {}, children = []) {
    let el = document.createElement(...(typeof type === "string") ? [type] : [type[0], {is: type[1]}]); // if it's a string, just pass it in. if it's not, assume it's a custom element
    if (classes.length) el.classList.add(...classes);
    Object.keys(attrs).forEach(key => ["style", "dataset"].includes(key) ? Object.keys(attrs[key]).forEach(subkey => el[key][subkey] = attrs[key][subkey]) : el[key] = attrs[key]);
    for (let child of children) el.appendChild(child);
    return el;
}
/**
 * Animate an element only if the user does not prefer reduced motion
 * @param {Animatable} element 
 * @param {Keyframe[] | PropertyIndexedKeyframes | null} keyframes 
 * @param {number | KeyframeAnimationOptions | undefined} options
 * @returns {Animation?} The resulting animation, if it was applied
 */
export function optionalAnimate(element, keyframes, options) {
    if (matchMedia("not (prefers-reduced-motion)").matches) return element.animate(keyframes, options);
    else return null;
}
/**
 * Make an element zoom out and then remove it.
 * Skips animation if the user prefers reduced motion
 * @param {HTMLElement} element 
 */
export async function zoomOutRemove(element) {
    element.style.minHeight = element.style.height = `${element.clientHeight}px`;
    element.style.minWidth = element.style.width = `${element.clientWidth}px`;
    element.style.whiteSpace = "nowrap";
    await optionalAnimate(element, ...zoomOutAnimation)?.finished;
    element.remove();
}
/**
 * Animate two elements to switch positions
 * @param {HTMLElement} element1 
 * @param {HTMLElement} element2 
 */
export async function switchElements(element1, element2, duration=700) {
    element1.parentElement.style.maxHeight = `${element1.parentElement.clientHeight}px`;
    let distanceHorizontal = element1.getBoundingClientRect().left - element2.getBoundingClientRect().left;
    let distanceVertical = element1.getBoundingClientRect().top - element2.getBoundingClientRect().top;
    await Promise.all([
        optionalAnimate(element1, [{top: 0, left: 0, height: `${element1.clientHeight}px`}, {top: `${-distanceVertical}px`, left: `${-distanceHorizontal}px`, height: `${element2.clientHeight}px`}], {easing: "ease", duration})?.finished,
        optionalAnimate(element2, [{top: 0, left: 0, height: `${element2.clientHeight}px`}, {top: `${distanceVertical}px`, left: `${distanceHorizontal}px`, height: `${element1.clientHeight}px`}], {easing: "ease", duration})?.finished,
    ]); // visually animate elements to new position
    let parentNode = element1.parentElement;
    let nextElement = element1.nextElementSibling;
    // Actually switch elements in the DOM. This will automagically clear the animation
    if (element2 === nextElement) parentNode.insertBefore(element2, element1); // if they happen to be siblings, just insert 2 before 1
    else {
        parentNode.insertBefore(element1, element2); // insert 1 before 2
        parentNode.insertBefore(element2, nextElement); // then move 2 to where 1 was. If nextElement is undefined (1 was the last child) then it just puts 2 at the end
    }
    element1.parentElement.style.removeProperty("max-height");
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
 * @returns {{textField: HTMLDivElement, helperLine: HTMLParagraphElement?}}
 */
export function createTextFieldWithHelper(innerText, helperText=null, extraProperties={}) {
    let textField = createElement("div", ["field"], {}, [
        createElement("label", ["label"], {innerText}),
        createElement("div", ["control", "help-not-persistent"], {}, [
            createElement("input", ["input"], {type: "text", ...extraProperties}),
        ])
    ]);
    textField.style.width = "100%";
    let helperLine = helperText ? createElement("p", ["help"], {innerText: helperText}) : null;
    return {textField, helperLine}
}

export async function createSetCardOwner(set, id, linkCreator=false) {
    let collectionLabels = await parseCollections(set.collections);
    let setType = set.collections.includes("-:0") ? "timeline" : (set.collections.includes("-:1") ? "guide" : "set");
    let buttons = [
        createElement("a", ["card-footer-item", "has-text-primary"], {href: `/${setType}/${id}/view/`, innerText: "View"}),
        createElement("a", ["card-footer-item", "has-text-warning-dark"], {href: `/set/${id}/edit/`, innerText: "Edit"}),
        createElement("a", ["card-footer-item", "has-text-danger"], {href: "#", innerText: "Delete"})
    ];
    buttons[2].addEventListener("click", e => e.preventDefault());
    if (linkCreator) buttons.push(createElement("a", ["card-footer-item", "has-text-primary"], {href: `/user/${set.uid}/`, innerText: "More by User"}));
    let likeText = set.visibility !== 0 ? ` - ${set.likes || "0"} likes` : "";
    console.log(id, set.visibility);
    let visibilityData = SET_VISIBILITIES[Array.isArray(set.visibility) ? 3 : set.visibility];
    let cardEl = createElement("div", ["card", "has-spreaded-content"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], { innerText: set.name }),
            createElement("span", ["card-header-icon"], {}, [
                createElement("span", ["tag", `is-${visibilityData.color}`], {innerText: visibilityData.title})
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content"], {innerText: `${set.numTerms} terms ${likeText}`}, [
                createElement("br"),
                createElement("span", [], {innerText: `Created by ${set.creator}`}),
                createElement("br"),
                ...collectionLabels
            ])
        ]),
        createElement("footer", ["card-footer"], {}, buttons)
    ]);
    optionalAnimate(cardEl, ...cardSlideInAnimation);
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
        textEls.push(createElement("p", ["mt-0", "mb-1"], {innerText: `Confidence: ${Math.floor(relevance * 100)}%`}))
    } else textEls.push(createElement("p", ["has-text-weight-bold", "mt-0", "mb-1"], { innerText: `Created by ${creator}` }));
    let setType = collections.includes("-:0") ? "timeline" : (collections.includes("-:1") ? "guide" : "set");
    let cardEl = createElement("div", ["card", "has-spreaded-content"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], { innerText: name }),
            createElement("a", ["card-header-icon", "has-tooltip-arrow", "link-user"], {href: `/user/${uid}/`}, [
                createElement("span", ["icon", "has-text-gold"], {}, [
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
    optionalAnimate(cardEl, ...cardSlideInAnimation);
    return { card: cardEl };
}
export function createCustomCollectionCard(collection, id) {
    let buttons = [
        createElement("a", ["card-footer-item", "has-text-primary"], {href: `/collection/${id}/`, innerText: "View"}),
        createElement("a", ["card-footer-item", "has-text-primary"], {href: "#", innerText: "Add Set"}),
        createElement("a", ["card-footer-item", "has-text-primary"], {href: "#", disabled: true, innerText: "Save"}),
        createElement("a", ["card-footer-item", "has-text-danger"], {href: "#", innerText: "Delete"})
    ];
    buttons[1].style.minWidth = "calc(60px + 1.5rem)";
    buttons.slice(1).forEach(el => el.addEventListener("click", e => e.preventDefault()));
    let textEls = collection.sets.flatMap(setId => {
        let {textField, helperLine,} = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/", {pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"});
        textField.querySelector("input").value = setId;
        return [textField, helperLine];
    })
    let cardEl = createElement("div", ["card", "has-spreaded-content", "has-validated-inputs"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], {innerText: collection.name}),
            createElement("span", ["card-header-icon"], {}, [
                createElement("span", ["tag", "is-light"], {innerText: `${collection.sets.length} sets`})
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content", "collection-sets"], {}, [...textEls])
        ]),
        createElement("footer", ["card-footer"], {}, buttons)
    ]);
    optionalAnimate(cardEl, ...cardSlideInAnimation);
    return { card: cardEl, buttons };
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
        if (modal.onclose || modal.onuserclose) modal.root.querySelectorAll(".action-close").forEach(el => el.addEventListener("click", () => {
            modal.close();
            if (modal.onuserclose) modal.onuserclose(el.dataset.action);
        }));
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
/**
 * Initialize click listeners for a quickview
 * @param {HTMLDivElement} quickview 
 * @param {HTMLButtonElement} toggleButton The button that will toggle the quickview visibility
 */
export function initQuickview(quickview, toggleButton) {
    toggleButton.addEventListener("click", () => quickview.classList.toggle("is-active"));
    quickview.querySelector(".delete").addEventListener("click", () => quickview.classList.remove("is-active"));
}