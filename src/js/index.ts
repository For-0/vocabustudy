// @ts-ignore
import Alert from "@vizuaalog/bulmajs/src/plugins/alert";
// @ts-ignore
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore
import Tabs from "@vizuaalog/bulmajs/src/plugins/tabs"; 
// @ts-ignore
import Dropdown from "@vizuaalog/bulmajs/src/plugins/dropdown";
/* eslint-enable @typescript-eslint/no-unused-vars */
import { toast } from "bulma-toast";
import { getCurrentUser, getUpToDateIdToken, initializeAuth, refreshCurrentUser } from "./firebase-rest-api/auth";
import { CustomCollection, Firestore, QueryBuilder,  VocabSet } from "./firebase-rest-api/firestore";
import { getRemoteConfig } from "./firebase-rest-api/remote-config";
import type { CollectionJsonList, RemoteConfigAnnouncement, StructuredQuery } from "./types";
import { bulmaModalPromise, cardSlideInAnimation, createElement, createSetCard, createSetCardOwner, createTextFieldWithHelper, getLocalDb, getWords, initBulmaModals, navigateLoginSaveState, optionalAnimate, paginateQueries, parseCollections, showCollections, styleAndSanitize, zoomOutRemove } from "./utils";

Tabs;
Dropdown;

declare global {
    interface Window {
        setHue: (hue: number) => void;
    }
}

const restrictedUrls = ["#mysets", "#editor", "#admin"];

const auth = initializeAuth(async user => {
    if (user) {
        if (location.hash === "#saved-sets") showLikedSets();
        else if (location.hash === "#mysets") {
            showMySets();
            showMyCollections();
        }
    } else {
        if (restrictedUrls.includes(location.hash)) navigateLoginSaveState();
    }
});

getRemoteConfig().then(async remoteConfig => {
    if ("featuredSets" in remoteConfig) {
        const featuredSets = JSON.parse(remoteConfig.featuredSets as string);
        pages.search.sets[0].textContent = "";
        for (const set of featuredSets) {
            const els = await createSetCard(set);
            pages.search.sets[0].appendChild(els.card);
        }
    } else pages.search.sets[0].textContent = "Failed to load featured sets";

    if ("announcements" in remoteConfig) {
        const announcements: RemoteConfigAnnouncement[] = JSON.parse(remoteConfig.announcements as string);
        const localDb = await getLocalDb(); // We don't need to check if IDB is supported because the existence of the announcements config implies that it is
        const seenAnnouncements = await localDb.get("general", "seen-announcements") || [];
        announcements.filter(({ id }) => !seenAnnouncements.includes(id)).forEach(a => {
            const deleteButton = createElement("button", ["delete"]);
            const announcement = document.querySelector(".announcements-container")!.appendChild(createElement("article", ["message", `is-${a.type}`, "announcement"], {}, [
                createElement("div", ["message-header"], {}, [
                    createElement("p", [], {innerText: a.title}),
                    deleteButton
                ]),
                createElement("div", ["message-body"], {innerHTML: styleAndSanitize(a.message)})
            ]));
            deleteButton.addEventListener("click", async () => {
                zoomOutRemove(announcement);
                const existingSeen = await localDb.get("general", "seen-announcements") || [];
                existingSeen.push(a.id);
                await localDb.put("general", existingSeen, "seen-announcements");
            })
        });
    }
});

const hashTitles = {
    "#mysets": "My Sets",
    "#saved-sets": "Saved Sets",
    "#search": "Browse Sets",
    "#social":"Social",
    "#support-us": "Support Us",
    "#credits": "Credits"
};
const pages = {
    home: {
        el: document.getElementById("page-home")!,
        btnShowFeatures: document.querySelector<HTMLButtonElement>(".btn-show-features")!
    },
    mySets: {
        sets: document.querySelector('#mysets .set-container')!,
        collections: document.querySelector("#mysets .collection-container")!,
        btnCreateCollection: document.querySelector<HTMLButtonElement>("#mysets .btn-create-collection")!
    },
    search: {
        sets: document.querySelectorAll("#search .set-container")!,
        btnSearchGo: document.querySelector<HTMLButtonElement>("#search .btn-search-go")!,
        btnCollectionsMenu: document.querySelector<HTMLButtonElement>("#search .btn-collections-menu")!,
        btnClearFilters: document.querySelector<HTMLButtonElement>("#search .btn-clear-filters")!,
        searchInput: document.querySelector<HTMLInputElement>("#search .field-search")!,
        searchInputCollections: document.querySelector("#search .field-search-collections-list")!
    },
    savedSets: {
        likedSets: document.querySelector("#saved-sets .liked-container")!,
    },
    modals: {
        filterCollection: new Modal("#modal-filter-collection").modal(),
        filterCollectionList: document.querySelector<HTMLUListElement>("#modal-filter-collection .menu > ul")!,
        changeHue: new Modal("#modal-change-hue").modal(),
        contributers: [...document.querySelectorAll(".modal.is-credit")].map(el => new Modal(el).modal({style: "image"})),
        changeHueInput: document.querySelector<HTMLInputElement>("#modal-change-hue input")!,
        changeCollectionName: new Modal("#modal-change-collection-name").modal(),
        changeCollectionNameInput: document.querySelector<HTMLInputElement>("#modal-change-collection-name input")!,
    }
};

async function showMySets() {
    pages.mySets.sets.textContent = "Loading sets...";
    const currentUser = await refreshCurrentUser(auth);
    if (!currentUser) return;
    const query = new QueryBuilder()
        .select("collections", "likes", "visibility", "name", "numTerms", "creator")
        .orderBy(["likes", "__name__"], "DESCENDING")
        .where("uid", "EQUAL", currentUser.uid)
        .from(VocabSet.collectionKey);

    pages.mySets.sets.textContent = "";
    await paginateQueries([query.build()], pages.mySets.sets.nextElementSibling as HTMLButtonElement, docs => {
        VocabSet.fromMultiple(docs).forEach(async doc => {
            const els = await createSetCardOwner(doc);
            pages.mySets.sets.appendChild(els.card);
            els.buttons[2].addEventListener("click", () => {
                new Alert().alert({
                    type: "danger",
                    title: "Delete Set",
                    body: "Are you sure you would like to delete this set? This action cannot be undone.",
                    confirm: {
                        label: "OK",
                        onClick: async () => {
                            const idToken = await getUpToDateIdToken(auth);
                            if (idToken) {
                                await Firestore.deleteDocument(VocabSet.collectionKey, doc.id, idToken);
                                els.card.remove();
                            }
                            // Fail silently in the "else" case because it will already be redirecting the user to the login page
                        }
                    },
                    cancel: {
                        label: "Cancel"
                    }
                });
            });
        });
    }, currentUser.token.access);
}
function createCustomCollectionCard({ sets, name, id }: Pick<CustomCollection, "sets" | "name" | "id">) {
    // CRUD buttons for the collection
    const buttons = [
        createElement("a", ["card-footer-item", "has-text-primary"], {href: `/collection/${id}/`, innerText: "View"}),
        createElement("a", ["card-footer-item", "has-text-primary"], {href: "#", innerText: "Add Set"}),
        createElement("a", ["card-footer-item", "has-text-primary"], {href: "#", innerText: "Save"}),
        createElement("a", ["card-footer-item", "has-text-danger"], {href: "#", innerText: "Delete"})
    ];
    buttons[1].style.minWidth = "calc(60px + 1.5rem)"; // Ensure "Add Set" doesn't wrap
    buttons[2].setAttribute("disabled", ""); // Disable the save button until the user makes a change
    buttons.slice(1).forEach(el => el.addEventListener("click", e => e.preventDefault())); // Prevent the buttons (except the first) from using their hrefs
    const textEls = sets.flatMap(setId => {
        const { textField, helperLine } = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/", {pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"});
        const input = textField.querySelector("input");
        if (input) input.value = setId;
        return [textField, helperLine!];
    })
    const cardEl = createElement("div", ["card", "has-spreaded-content", "has-validated-inputs"], {}, [
        createElement("header", ["card-header"], {}, [
            createElement("p", ["card-header-title"], {innerText: name, style: {overflowWrap: "anywhere"}}),
            // A tag that displays the number of sets in the collection
            createElement("span", ["card-header-icon"], {}, [
                createElement("span", ["tag", "is-light"], {innerText: `${sets.length} sets`})
            ])
        ]),
        createElement("div", ["card-content"], {}, [
            createElement("div", ["content", "collection-sets"], {}, [...textEls]) // List of input fields for the set IDs
        ]),
        createElement("footer", ["card-footer"], {}, buttons)
    ]);
    optionalAnimate(cardEl, ...cardSlideInAnimation);
    return { card: cardEl, buttons };
}
function registerCustomCollectionCard({ id, name, sets }: CustomCollection) {
    const els = createCustomCollectionCard({ id, name, sets })
    pages.mySets.collections.appendChild(els.card);

    // Enable the save button when the user makes a change
    els.card.addEventListener("change", () => els.buttons[2].removeAttribute("disabled"));

    // Add set button
    els.buttons[1].addEventListener("click", () => {
        const cEls = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/", {pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"});
        els.card.querySelector(".collection-sets")!.append(cEls.textField, cEls.helperLine!);
    });
    // Save button
    els.buttons[2].addEventListener("click", async () => {
        els.buttons[2].setAttribute("disabled", "");
        // Remove empty fields
        els.card.querySelectorAll(".collection-sets > label").forEach(el => {
            if (!el.querySelector("input")?.value) {
                el.nextElementSibling?.remove(); // Remove the helper line
                el.remove();
            }
        });

        // Remove duplicate fields
        [...els.card.querySelectorAll(".collection-sets > .field")].filter((el, i, self) => {
            if (i !== self.findIndex(t => t.querySelector("input")?.value === el.querySelector("input")?.value)) {
                el.nextElementSibling?.remove(); // Remove the helper line
                el.remove();
            }
        });
        
        // If all the fields match the regex, the save the collection
        const allInputs = [...els.card.querySelectorAll<HTMLInputElement>(".collection-sets input.input")];
        if (allInputs.every(el => el.reportValidity())) {
            const newSets = allInputs.map(el => el.value);
            const idToken = await getUpToDateIdToken(auth);
            if (idToken) {
                await Firestore.updateDocument(CustomCollection.collectionKey, id, { sets: newSets }, idToken, true, true);
                els.card.querySelector<HTMLSpanElement>(".tag")!.innerText = `${sets.length} sets`;
                toast({ message: "Collection saved successfully", type: "is-success" });
            }
        }
    });
    els.buttons[3].addEventListener("click", () => {
        new Alert().alert({
            type: "danger",
            title: "Delete Collection",
            body: "Are you sure you would like to delete this collection? This action cannot be undone.",
            confirm: {
                label: "OK",
                onClick: async () => {
                    const idToken = await getUpToDateIdToken(auth);
                    if (idToken) {
                        await Firestore.deleteDocument(CustomCollection.collectionKey, id, idToken);
                        els.card.remove();
                    }
                }
            },
            cancel: {
                label: "Cancel"
            }
        });
    });
}
async function showMyCollections() {
    pages.mySets.collections.textContent = "Loading collections...";
    const currentUser = await refreshCurrentUser(auth);
    if (!currentUser) return;
    const query = new QueryBuilder()
        .select("name", "sets")
        .where("uid", "EQUAL", currentUser.uid)
        .from("collections");
    const docs = CustomCollection.fromMultiple(await Firestore.getDocuments(query.build(), currentUser.token.access));
    pages.mySets.collections.textContent = "";
    docs.forEach(doc => registerCustomCollectionCard(doc));
}
function loadPreviousSearch(collections?: CollectionJsonList["c"]) {
    const previousSearch: { search: string, collections: string[] } = JSON.parse(localStorage.getItem("previous_search") || "null");
    if (!previousSearch) return;
    pages.search.searchInput.value = previousSearch.search;
    pages.modals.filterCollectionList.querySelectorAll("input").forEach(el => el.checked = previousSearch.collections.includes(el.value));
    listPreviewCollections(previousSearch.collections, collections);
}
function saveSearch() {
    const allCheckedCollections = [...pages.modals.filterCollectionList.querySelectorAll<HTMLInputElement>("input:checked")];
    const search = {
        search: pages.search.searchInput.value,
        collections: allCheckedCollections.map(el => el.value).filter(el => el)
    };
    localStorage.setItem("previous_search", JSON.stringify(search));
    return search.collections;
}
/** Show a preview of the selected collections below the search input */
async function listPreviewCollections(collections: string[], allCollections: CollectionJsonList["c"] | null = null) {
    // parseCollections will fetch the collections if they are not passed to it
    const collectionEls = await parseCollections(collections, (allCollections ? { c: allCollections } : null));
    pages.search.searchInputCollections.textContent = "";
    pages.search.searchInputCollections.append(...collectionEls);
}
// TODO: migrate to algolia
async function search() {
    const searchTerm = pages.search.searchInput.value;
    const selectedFilters = saveSearch().slice(0, 10); // max of 10 collections
    let words: string[] = [];
    const queries: StructuredQuery[] = [];
    const baseQuery = new QueryBuilder()
        .select("name", "creator", "numTerms", "collections", "likes", "uid", "nameWords")
        .from(VocabSet.collectionKey)
        .where("visibility", "EQUAL", 2)
        .orderBy(["likes", "__name__"], "DESCENDING")
        .build();

    if (searchTerm) {
        words = getWords(searchTerm).slice(0, 10);
        if (words.length > 0)
            queries.push(new QueryBuilder(JSON.parse(JSON.stringify(baseQuery))).where("nameWords", "ARRAY_CONTAINS_ANY", words).build());
    }

    if (selectedFilters.length > 0)
        queries.push(new QueryBuilder(JSON.parse(JSON.stringify(baseQuery))).where("collections", "ARRAY_CONTAINS_ANY", selectedFilters).build());
    
    if (!searchTerm && selectedFilters.length <= 0)
        queries.push(baseQuery);
    
    pages.search.sets[1].textContent = "Loading Sets...";
    pages.search.btnSearchGo.classList.add("is-loading");
    pages.search.btnSearchGo.disabled = true;
    await paginateQueries(queries, pages.search.sets[1].nextElementSibling as HTMLButtonElement, results => {
        // Remove duplicates from the combined queries
        const data = VocabSet.fromMultiple(results).filter((val, index, self) => index === self.findIndex(t => t.id === val.id)).map(doc => {
            let relevance = 1;
            if (words.length > 0) relevance *= words.filter(val => doc.nameWords.includes(val)).length / words.length;

            if (selectedFilters.length > 0) relevance *= selectedFilters.filter(val => doc.collections.includes(val)).length / selectedFilters.length;

            return {doc, relevance };
        }).filter(el => el.relevance);
        
        data.sort((a, b) => b.relevance - a.relevance);
        data.forEach(async ({ doc, relevance }) => {
            const els = await createSetCard(doc, relevance);
            pages.search.sets[1].appendChild(els.card);
        });
    });
    pages.search.btnSearchGo.classList.remove("is-loading");
    pages.search.btnSearchGo.disabled = false;
    pages.search.sets[1].textContent = "";
}
async function showLikedSets() {
    const currentUser = await refreshCurrentUser(auth);
    if (currentUser) {
        pages.savedSets.likedSets.textContent = "Loading sets...";
        const query = new QueryBuilder()
            .select("uid")
            .from("social", true)
            .orderBy(["__name__"], "DESCENDING")
            .where("uid", "EQUAL", currentUser.uid)
            .where("like", "EQUAL", true);
    
        await paginateQueries([query.build()], pages.savedSets.likedSets.nextElementSibling as HTMLButtonElement, async docs => {
            const setIds = docs.map(el => el.pathParts[el.pathParts.length - 3]);
            if (setIds.length < 1) return;
            const sets = VocabSet.fromMultiple(await Firestore.getDocumentsForIds(VocabSet.collectionKey, setIds, ["name", "creator", "numTerms", "collections", "likes", "uid"], currentUser.token.access));
            sets.forEach(async doc => {
                const els = await createSetCard(doc);
                pages.savedSets.likedSets.appendChild(els.card);
            });
        }, currentUser.token.access)
        pages.savedSets.likedSets.textContent = "";
    }
}

addEventListener("DOMContentLoaded", () => {
    pages.modals.filterCollection.onclose = () => {
        const collections = [...pages.modals.filterCollectionList.querySelectorAll<HTMLInputElement>("input:checked")].map(el => el.value).filter(el => el);
        if (collections.length > 10) toast({message: "Warning: You can only choose up to 10 collections!", type: "is-warning", dismissible: true, position: "bottom-center"})
        listPreviewCollections(collections);
    };
    pages.modals.changeHue.onclose = () => {};
    initBulmaModals([pages.modals.filterCollection, pages.modals.changeHue, pages.modals.changeCollectionName, ...pages.modals.contributers]);
    pages.modals.changeHue.on("open", () => pages.modals.changeHueInput.value = localStorage.getItem("theme_hue") || "0");
    pages.modals.changeHueInput.addEventListener("change", () => {
        localStorage.setItem("theme_hue", pages.modals.changeHueInput.value);
        window.setHue(pages.modals.changeHueInput.valueAsNumber);
    });
    pages.modals.changeCollectionName.validateInput = () => pages.modals.changeCollectionNameInput.reportValidity();
    pages.search.btnSearchGo.addEventListener("click", () => search());
    pages.search.searchInput.addEventListener("keyup", e => {
        if (e.key === "Enter") search();
    })
    pages.search.btnCollectionsMenu.addEventListener("click", () => pages.modals.filterCollection.open());
    pages.search.btnClearFilters.addEventListener("click", () => {
        pages.modals.filterCollectionList.querySelectorAll<HTMLInputElement>("input:checked").forEach(el => el.checked = false);
        listPreviewCollections([]);
    });
    pages.home.btnShowFeatures.addEventListener("click", () => document.querySelector(".home-features")!.scrollIntoView({ behavior: "smooth" }));
    pages.mySets.btnCreateCollection.addEventListener("click", async () => {
        pages.modals.changeCollectionNameInput.value = "";
        const result = await bulmaModalPromise(pages.modals.changeCollectionName);
        if (result) {
            const currentUser = await refreshCurrentUser(auth);
            if (currentUser) {
                const newDoc = await Firestore.createDocument("collections", { name: pages.modals.changeCollectionNameInput.value, sets: [], uid: currentUser.uid }, currentUser.token.access);
                registerCustomCollectionCard(CustomCollection.fromSingle(newDoc));
            }
        }
    });
    
    document.querySelector<HTMLButtonElement>(".btn-change-hue")!.addEventListener("click", () => pages.modals.changeHue.open());
    document.querySelector<HTMLButtonElement>(".btn-change-hue")!.hidden = false;
    document.querySelectorAll(".button.is-credit").forEach((el, i) => el.addEventListener("click", () => pages.modals.contributers[i].open()))
    showCollections(pages.modals.filterCollectionList).then(collections => location.hash === "#search" && loadPreviousSearch(collections));
});
window.addEventListener("hashchange", async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser && restrictedUrls.includes(location.hash)) return navigateLoginSaveState();
    switch (location.hash) {
        case "#mysets":
            showMySets(); // TODO: better loading (spinner?)
            showMyCollections();
            break;
        case "#saved-sets":
            showLikedSets();
            break;
        case "#search":
            loadPreviousSearch();
            break;
    }
    document.title = `${location.hash in hashTitles ? hashTitles[location.hash as keyof typeof hashTitles] : "Home"} - Vocabustudy`;
});
document.title = `${location.hash in hashTitles ? hashTitles[location.hash as keyof typeof hashTitles] : "Home"} - Vocabustudy`;
