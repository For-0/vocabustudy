import { sanitize } from "dompurify";
import { marked } from "marked";
import { openDB } from "idb";
import type { CollectionJsonList, ParsedRestDocument, RecursivePartial, StructuredQuery } from "./types";
import { Firestore, QueryBuilder, Social, VocabSet } from "./firebase-rest-api/firestore";
import personIcon from "bundle-text:~/node_modules/@material-symbols/svg-400/rounded/person-fill.svg";
import expandMoreIcon from "bundle-text:~/node_modules/@material-symbols/svg-400/rounded/expand_more.svg";

const ignoredCharsRE = /[*_.]/g;
const mdLinkRE = /!?\[[^\]]*\]\([^)]*\)/g;
const markdownBulmaTag = /^:([^\n]+):([^:\n]*):(?:\n|$)/;
marked.use({extensions: [{
    name: "bulma-tag",
    level: "inline",
    start(src: string) { return src.match(/:/)?.index },
    tokenizer(src: string) {
        const match = markdownBulmaTag.exec(src);
        if (match)
            return {
                type: "bulma-tag",
                raw: match[0],
                modifierClasses: match[1].trim().split(",").map(a => `is-${a}`),
                content: this.lexer.inlineTokens(match[2].trim())
            };
    },
    renderer(token: marked.Tokens.Generic ) {
        return `<span class="tag ${token.modifierClasses.join(" ")}">${this.parser.parseInline(token.content)}</span>`;
    },
    childTokens: ["span"]
}]});
export const SET_VISIBILITIES = [
    {title: "Private", color: "warning"},
    {title: "Unlisted", color: "info"},
    {title: "Public", color: "success"},
    {title: "Shared", color: "link"}
];

export const cardSlideInAnimation: [Keyframe[], KeyframeAnimationOptions] = [
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
 * @param answer The answer to normalize
 * @returns The normalized answer
 */
export function normalizeAnswer(answer: string): string {
    return answer.replace(ignoredCharsRE, "").replace(mdLinkRE, "").trim();
}
export function checkAnswers(answer: string, correct: string) {
    const cleanAnswer = normalizeAnswer(answer).toUpperCase();
    const possibleCorrect = [correct, correct.split(","), correct.split("/")].flat().map(el => el = normalizeAnswer(el).toUpperCase());
    return possibleCorrect.includes(cleanAnswer);
}
/**
 * Apply markdown styling 
 * @returns The styled text, which can safely be applied to inner HTML
 */
export function styleAndSanitize(text: string, inline=false): string {
    return sanitize(marked[inline ? "parseInline" : "parse"](text), { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] });
}
/**
 * Make the content of a node only break on spaces
 */
export function preventBreaking(node: Node) {
    for (const childNode of [...node.childNodes]) {
        if (childNode.nodeType === Node.ELEMENT_NODE) preventBreaking(childNode);
        else if (childNode.nodeType === Node.TEXT_NODE) {
            const nodesFragment = document.createDocumentFragment();
            for (const textSegment of childNode.textContent?.split(" ") || []) {
                if (textSegment !== "") nodesFragment.appendChild(createElement("span", [], {innerText: textSegment, style: {whiteSpace: "nowrap"}}));
                nodesFragment.appendChild(document.createTextNode(" "));
            }
            if (nodesFragment.childNodes.length > 1) nodesFragment.lastChild?.remove();
            node.replaceChild(nodesFragment, childNode);
        }
    }
}
export function navigateLoginSaveState() {
    const url = new URL("/login/", location.href);
    url.searchParams.set("next", location.pathname);
    location.href = url.href;
}
/**
 * Creates an element
 * @param type The node type
 * @param classes Classes to apply to the element
 * @param attrs Attributes on the element to apply
 * @param children Children of the element
 * @returns The created element
 */
export function createElement<T extends keyof HTMLElementTagNameMap>(type: T | [T, string], classes: string[] = [], attrs: RecursivePartial<HTMLElementTagNameMap[T]> = {}, children: Node[] = []): HTMLElementTagNameMap[T] {
    let el: HTMLElementTagNameMap[T];
    if (typeof type === "string") el = document.createElement(type);// if it's a string, just pass it in. if it's not, assume it's a custom element
    else el = document.createElement(type[0], {is: type[1]});
    if (classes.length) el.classList.add(...classes);
    Object.keys(attrs).forEach(key => ["style", "dataset"].includes(key) ? Object.keys(attrs[key]).forEach(subkey => el[key][subkey] = attrs[key][subkey]) : el[key] = attrs[key]);
    for (const child of children) el.appendChild(child);
    return el;
}

export function createIcon(iconSvgContent: string, extraIconClasses: string[]) {
    const iconEl = createElement("span", ["icon", ...extraIconClasses], { innerHTML: iconSvgContent });
    iconEl.querySelector("svg")?.setAttribute("fill", "currentcolor");
    return iconEl;
}

/**
 * Animate an element only if the user does not prefer reduced motion
 * @returns The resulting animation, if it was applied
 */
export function optionalAnimate(element: Animatable, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options: number | KeyframeAnimationOptions | undefined): Animation | null {
    if (matchMedia("not (prefers-reduced-motion)").matches) return element.animate(keyframes, options);
    else return null;
}
/**
 * Make an element zoom out and then remove it.
 * Skips animation if the user prefers reduced motion
 */
export async function zoomOutRemove(element: HTMLElement) {
    element.style.minHeight = element.style.height = `${element.clientHeight}px`;
    element.style.minWidth = element.style.width = `${element.clientWidth}px`;
    element.style.whiteSpace = "nowrap";
    // @ts-ignore
    await optionalAnimate(element, ...zoomOutAnimation)?.finished;
    element.remove();
}
/**
 * Animate two elements to switch positions
 */
export async function switchElements(element1: HTMLElement, element2: HTMLElement, duration=700) {
    if (!element1.parentElement || !element2.parentElement) throw new Error("Elements must have a parent element");
    element1.parentElement.style.maxHeight = `${element1.parentElement.clientHeight}px`;
    const distanceHorizontal = element1.getBoundingClientRect().left - element2.getBoundingClientRect().left;
    const distanceVertical = element1.getBoundingClientRect().top - element2.getBoundingClientRect().top;
    await Promise.all([
        optionalAnimate(element1, [{top: 0, left: 0, height: `${element1.clientHeight}px`}, {top: `${-distanceVertical}px`, left: `${-distanceHorizontal}px`, height: `${element2.clientHeight}px`}], {easing: "ease", duration})?.finished,
        optionalAnimate(element2, [{top: 0, left: 0, height: `${element2.clientHeight}px`}, {top: `${distanceVertical}px`, left: `${distanceHorizontal}px`, height: `${element1.clientHeight}px`}], {easing: "ease", duration})?.finished,
    ]); // visually animate elements to new position
    const parentNode = element1.parentElement;
    const nextElement = element1.nextElementSibling;
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
 * @param string The string to get words from
 */
export function getWords(string: string): string[] {
    const alphaNum = string.replace(/\W/g, " ").toLowerCase();
    return alphaNum.split(" ").map(el => el.trim()).filter(el => el);
}



/**
 * Loads the collections, from cache if possible otherwise from network
 */
export async function loadCollections(): Promise<CollectionJsonList> {
    const possibleCachedItem = localStorage.getItem("collections_cache");
    const currentTime = Date.now();
    if (possibleCachedItem) {
        const cachedItem = JSON.parse(possibleCachedItem);
        if (cachedItem.expiration && cachedItem.data && cachedItem.expiration > currentTime) return cachedItem.data;
    }
    const { c } = await import("../collections.json");
    const newExpiration = currentTime + 604800000; // number of milliseconds in a week
    localStorage.setItem("collections_cache", JSON.stringify({ data: { c }, expiration: newExpiration }));
    return { c };
}
export async function showCollections(listEl: HTMLUListElement) {
    const { c } = await loadCollections();
    for (const [i, collection] of c.entries()) {
        if (typeof collection === "string") listEl.appendChild(createCollectionListItem(collection, i.toString()));
        else if (typeof collection === "object") {
            const groupEl = createCollectionParentListItem(collection.n);
            listEl.appendChild(groupEl.listItem);
            groupEl.childList.appendChild(createCollectionListItem("General", i.toString()));
            if (collection.o) for (const [j, subCollection] of collection.s.entries()) {
                const subEl = createCollectionParentListItem(subCollection);
                groupEl.childList.appendChild(subEl.listItem);
                subEl.childList.appendChild(createCollectionListItem("General", `${i}:${j}`));
                for (const [k, option] of collection.o.entries()) subEl.childList.appendChild(createCollectionListItem(option, `${i}:${j}:${k}`));
            } else for (const [j, subCollection] of collection.s.entries()) groupEl.childList.appendChild(createCollectionListItem(subCollection, `${i}:${j}`));
        }
    }
    return c;
}
/**
 * Creates a collection list item for putting in a multiselect list
 * @param name Collection name
 * @param i Collection id
 * @returns the list item
 */
function createCollectionListItem(name: string, i: string): HTMLElement {
    const inputId = `_${crypto.randomUUID()}`;
    const listItem = createElement("li", [], {}, [
        createElement("a", ["field"], {}, [
            createElement("input", ["is-checkradio"], {id: inputId, type: "checkbox", value: i}),
            createElement("label", [], {htmlFor: inputId, innerText: name})
        ])
    ]);
    return listItem;
}
/**
 * Creates a collection parent list item for putting in a multiselect list
 * @param name Collection name
 * @returns the list item and the child list
 */
function createCollectionParentListItem(name: string) {
    const childList = createElement("ul");
    const listText = createElement("a", [], {innerText: name}, [
        createIcon(expandMoreIcon, ["is-pulled-right"])
    ]);
    const listItem = createElement("li", [], {}, [listText, childList]);
    listText.addEventListener("click", () => listText.classList.toggle("is-active"));
    return {listItem, childList};
}

export async function parseCollections(collections: string[], allCollections: CollectionJsonList | null = null) {
    const { c } = allCollections || await loadCollections();
    const parsedCollections = collections.map(el => el.split(":").map(el => parseInt(el)));
    const collectionNames = parsedCollections.map(el => {
        try {
            if (isNaN(el[0])) {
                if (el[1] == 0) return "Study Guide : Timeline";
                else if (el[1] == 1) return "Study Guide : Notes";
            }
            const collectionName = c[el[0]];
            if (typeof collectionName === "string") return collectionName;
            else {
                if (el.length === 1) return collectionName.n;
                else if (el.length === 2) return `${collectionName.n} : ${collectionName.s[el[1]]}`;
                else if (collectionName.o) return `${collectionName.n} : ${collectionName.s[el[1]]} : ${collectionName.o[el[2]]}`;
            }
        } catch {
            return "Unknown Collection";
        }
    });
    return collectionNames.map(el => createElement("span", ["tag", "is-primary", "mr-2"], {innerText: el || "Unknown Collection"}));
}
/**
 * Create a text field with an optional helper
 * @param innerText Label text
 * @param helperText Helper text
 * @param extraProperties Properties for the input el
 */
export function createTextFieldWithHelper(innerText: string, helperText: string | null = null, extraProperties: RecursivePartial<HTMLInputElement>={}) {
    const textField = createElement("div", ["field"], {}, [
        createElement("label", ["label"], {innerText}),
        createElement("div", ["control", "help-not-persistent"], {}, [
            createElement("input", ["input"], {type: "text", ...extraProperties}),
        ])
    ]);
    textField.style.width = "100%";
    const helperLine = helperText ? createElement("p", ["help"], {innerText: helperText}) : null;
    return {textField, helperLine}
}

export async function createSetCardOwner({ collections, likes, visibility, name, numTerms, creator, id }: VocabSet) {
    const collectionLabels = await parseCollections(collections);
    const setType = collections.includes("-:0") ? "timeline" : (collections.includes("-:1") ? "guide" : "set");
    const buttons = [
        createElement("a", ["card-footer-item", "has-text-primary"], {href: `/${setType}/${id}/view/`, innerText: "View"}),
        createElement("a", ["card-footer-item", "has-text-warning-dark"], {href: `/set/${id}/edit/`, innerText: "Edit"}),
        createElement("a", ["card-footer-item", "has-text-danger"], {href: "#", innerText: "Delete"})
    ];
    buttons[2].addEventListener("click", e => e.preventDefault());
    const likeText = visibility !== 0 ? ` - ${likes || "0"} likes` : "";
    const visibilityData = SET_VISIBILITIES[Array.isArray(visibility) ? 3 : visibility];
    const cardEl = createElement("div", ["card", "has-spreaded-content"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], { innerText: name, style: { overflowWrap: "anywhere" } }),
            createElement("span", ["card-header-icon"], {}, [
                createElement("span", ["tag", `is-${visibilityData.color}`], {innerText: visibilityData.title})
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content"], {innerText: `${numTerms} terms ${likeText}`}, [
                createElement("br"),
                createElement("span", [], {innerText: `Created by ${creator}`}),
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
* @param {float} relevance Relevance, from 0 to 1
* @returns The card and primary action
*/
export async function createSetCard({ name, creator, numTerms, collections, likes, uid, id }: VocabSet, relevance: number | null = null) {
    const collectionLabels = await parseCollections(collections);
    const textEls: HTMLElement[] = [];
    if (relevance) {
        textEls.push(createElement("p", ["m-0", "has-text-weight-bold"], { innerText: `Created by ${creator}`}));
        textEls.push(createElement("p", ["mt-0", "mb-1"], {innerText: `Confidence: ${Math.floor(relevance * 100)}%`})); // Display the relevance as a percent
    } else textEls.push(createElement("p", ["has-text-weight-bold", "mt-0", "mb-1"], { innerText: `Created by ${creator}` })); // Display the creator no matter what

    // Determine the set type using the existance of the special collections -:0 and -:1
    const setType = collections.includes("-:0") ? "timeline" : (collections.includes("-:1") ? "guide" : "set");

    const cardEl = createElement("div", ["card", "has-spreaded-content"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], { innerText: name, style: { overflowWrap: "anywhere" } }),
            // A gold person icon that links to the user's profile
            createElement("a", ["card-header-icon", "has-tooltip-arrow", "link-user"], {href: `/user/${uid}/`}, [
                createIcon(personIcon, ["has-text-gold"])
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content"], {innerText: `${numTerms} terms - ${likes || "0"} likes`}, [
                createElement("br"),
                ...textEls, // The creator and relevance
                ...collectionLabels
            ])
        ]),
        createElement("footer", ["card-footer"], {}, [
            createElement("a", ["card-footer-item", "has-text-primary"], {href: `/${setType}/${id}/view/`, innerText: "View"}),
            createElement("a", ["card-footer-item", "has-text-primary", "link-user"], {href: `/user/${uid}/`, innerText: "More By User"})
        ])
    ]);
    // If the UID was not provided, remove the user link
    if (!uid) cardEl.querySelectorAll(".link-user").forEach(el => el.remove());
    else {
        const tooltipEl = cardEl.querySelector<HTMLAnchorElement>("a.has-tooltip-arrow");
        if (tooltipEl) tooltipEl.dataset.tooltip = `Created by ${creator}`;
    }
    // Make the footer items not wrap
    if (cardEl.lastElementChild) (cardEl.lastElementChild as HTMLElement).style.whiteSpace = "nowrap";
    optionalAnimate(cardEl, ...cardSlideInAnimation);
    return { card: cardEl };
}

/**
 * Render a comment card. If isMyComment is true, the card will be rendered with an input field for editing the comment.
 */
function createCommentCard({ inputComment, container }: { inputComment: HTMLInputElement, container: HTMLDivElement }, { name, comment, like }: Social, isMyComment: boolean) {
    if (isMyComment) {
        if (comment) inputComment.value = comment;
    } else
        container.appendChild(createElement("div", ["list-item"], {}, [
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
                createElement("div", ["list-item-description"], {innerHTML: styleAndSanitize(comment as string, true)}) // We know comment is not null because otherwise the function wouldn't be called
            ])
        ]));
}

/**
 * Add a click listener to the button that will show comments
 */
export function addShowCommentsClickListener({ inputComment, container, btnShowComments }: { inputComment: HTMLInputElement, container: HTMLDivElement, btnShowComments: HTMLButtonElement }, setId: string, userId: string) {
    btnShowComments.addEventListener("click", async () => {
        const comments = Social.fromMultiple(await Firestore.getDocuments(new QueryBuilder().from(Social.collectionKey).orderBy(["comment"], "ASCENDING").build(), undefined, `/${VocabSet.collectionKey}/${setId}`));
        comments.forEach(comment => createCommentCard({ inputComment, container }, comment, userId === comment.uid));
    }, { once: true });
}

/**
 * Paginate a single query in groups of 10
 * @param queries Initial query
 * @param  btnMore Button that will load more
 * @param onResults Callback to execute when results are available
 * @param startAfterN Document to start after
 */
export async function paginateQueries(
    queries: StructuredQuery[],
    btnMore: HTMLButtonElement,
    onResults: ((docs: ParsedRestDocument[]) => void),
    idToken?: string,
    startAfterDocs?: string[]
) {
    const querySnapshots = await Promise.all(queries.map(async (el, i) => {
        const query = new QueryBuilder(el).limit(10);
        if (!query.query.orderBy) throw new Error("Cannot paginate a query without an order by");
        if (startAfterDocs && startAfterDocs[i]) query.startAt(query.query.orderBy.map(el => el.field.fieldPath === "__name__" ? startAfterDocs[i] : 0));
        return Firestore.getDocuments(query.build(), idToken);
    }));
    onResults(querySnapshots.flat());
    btnMore.hidden = true;
    btnMore.onclick = () => {}; // Use a no-op function to prevent multiple clicks
    const nextQueries = querySnapshots.filter(el => el.length >= 10).map((el, i) => ({ lastPath: el[el.length - 1].pathParts.join("/"), originalQuery: queries[i]} ));
    if (nextQueries.length) {
        btnMore.hidden = false;
        btnMore.onclick = () => paginateQueries(
            nextQueries.map(el => el.originalQuery), // Pass in the original queries
            btnMore,
            onResults,
            idToken,
            nextQueries.map(el => el.lastPath) // But make sure to start them after their respective last documents
        );
    }
}

export async function initBulmaModals(modals: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any -- HACK BulmaJS types are not available
    modals.forEach(modal => {
        // If a modal is close-only (there is no accept/deny and it will not be used with bulmaModalPromise) then do this
        if (modal.onclose || modal.onuserclose) (modal.root as HTMLDivElement).querySelectorAll<HTMLButtonElement>(".action-close").forEach(el => el.addEventListener("click", () => {
            modal.close();
            if (modal.onuserclose) modal.onuserclose(el.dataset.action);
        }));
        modal.on("close", () => modal.onclose && modal.onclose())
    });
}
/**
 * Wait for a BulmaJS Modal to close, whether by button press or other close method
 */
export async function bulmaModalPromise(modal: any) { // eslint-disable-line @typescript-eslint/no-explicit-any -- HACK BulmaJS types are not available
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
export function initQuickview(quickview: HTMLDivElement, toggleButton: HTMLButtonElement) {
    toggleButton.addEventListener("click", () => quickview.classList.toggle("is-active"));
    quickview.querySelector(".delete")?.addEventListener("click", () => quickview.classList.remove("is-active"));
}
export async function getLocalDb() {
    return await openDB("vocabustudy-database", 2, {
        upgrade(db, oldVersion) {
            if (oldVersion === 0)
                db.createObjectStore("autosave-backups", { keyPath: "setId" });
            db.createObjectStore("general");
        }
    });
}

export function shuffle<T>(arr: T[]) {
    let currentIndex = arr.length, randomIndex: number;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
}

export function generateDocumentId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const targetLength = 20;
    const maxMultiple = 248; // Math.floor(256 / chars.length) * chars.length; - largest multiple of chars.length that is smaller than 256 (largest possible byte value)
    let id = "";
    while (id.length < targetLength) {
        const bytes = new Uint8Array(40);
        window.crypto.getRandomValues(bytes);
        for (let i = 0; i < bytes.length; i++) {
            if (id.length >= targetLength) break;
            if (bytes[i] < maxMultiple) id += chars.charAt(bytes[i] % chars.length);
        }
    }
    return id;
}