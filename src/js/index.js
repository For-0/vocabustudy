import { toast } from "bulma-toast";
import Alert from "@vizuaalog/bulmajs/src/plugins/alert";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Tabs from "@vizuaalog/bulmajs/src/plugins/tabs";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Dropdown from "@vizuaalog/bulmajs/src/plugins/dropdown";
import { collection, collectionGroup, deleteDoc, doc, documentId, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore/lite";
import { getValue } from "firebase/remote-config";
import initialize from "./general";
import { getWords, createSetCard, createSetCardOwner, showCollections, paginateQueries, createCustomCollectionCard, createTextFieldWithHelper, parseCollections, initBulmaModals, bulmaModalPromise, createElement, zoomOutRemove, styleAndSanitize, navigateLoginSaveState } from "./utils";
import { getCurrentUser } from "./firebase-rest-api/auth";

const restrictedUrls = ["#mysets", "#editor", "#admin"];

const { db } = initialize(async user => {
    if (user) {
        if (location.hash === "#saved-sets") showLikedSets();
        else if (location.hash === "#mysets") {
            showMySets();
            showMyCollections();
        }
        verifyAdmin();
    } else {
        if (restrictedUrls.includes(location.hash)) navigateLoginSaveState();
    }
}, async remoteConfig => {
    if (remoteConfig) {
        let featuredSets = JSON.parse(getValue(remoteConfig, "featuredSets").asString());
        pages.search.sets[0].textContent = "";
        for (let set of featuredSets) {
            let els = await createSetCard(set, set.id);
            pages.search.sets[0].appendChild(els.card);
        }
        let announcements = JSON.parse(getValue(remoteConfig, "announcements").asString());
        let seenAnnouncements = JSON.parse(localStorage.getItem("seen_announcements")) || [];
        announcements.filter(a => !seenAnnouncements.includes(a.id)).forEach(a => {
            let deleteButton = createElement("button", ["delete"]);
            let announcement = document.querySelector(".announcements-container").appendChild(createElement("article", ["message", `is-${a.type}`, "announcement"], {}, [
                createElement("div", ["message-header"], {}, [
                    createElement("p", [], {innerText: a.title}),
                    deleteButton
                ]),
                createElement("div", ["message-body"], {innerHTML: styleAndSanitize(a.message)})
            ]));
            deleteButton.addEventListener("click", () => {
                zoomOutRemove(announcement);
                let s = JSON.parse(localStorage.getItem("seen_announcements")) || [];
                s.push(a.id);
                localStorage.setItem("seen_announcements", JSON.stringify(s));
            })
        });
    } else pages.search.sets[0].textContent = "Failed to load featured sets";
});
const hashTitles = {
    "#mysets": "My Sets",
    "#saved-sets": "Saved Sets",
    "#admin": "Admin Portal",
    "#search": "Browse Sets",
    "#social":"Social",
    "#support-us": "Support Us",
    "#credits": "Credits"
};
const pages = {
    home: {
        el: document.getElementById("page-home"),
        btnShowFeatures: document.querySelector(".btn-show-features")
    },
    mySets: {
        sets: document.querySelector('#mysets .set-container'),
        collections: document.querySelector("#mysets .collection-container"),
        btnCreateCollection: document.querySelector("#mysets .btn-create-collection")
    },
    search: {
        sets: document.querySelectorAll("#search .set-container"),
        btnSearchGo: document.querySelector("#search .btn-search-go"),
        btnCollectionsMenu: document.querySelector("#search .btn-collections-menu"),
        btnClearFilters: document.querySelector("#search .btn-clear-filters"),
        searchInput: document.querySelector("#search .field-search"),
        searchInputCollections: document.querySelector("#search .field-search-collections-list")
    },
    savedSets: {
        likedSets: document.querySelector("#saved-sets .liked-container"),
    },
    modals: {
        filterCollection: new Modal("#modal-filter-collection").modal(),
        filterCollectionList: document.querySelector("#modal-filter-collection .menu > ul"),
        changeHue: new Modal("#modal-change-hue").modal(),
        contributers: [...document.querySelectorAll(".modal.is-credit")].map(el => new Modal(el).modal({style: "image"})),
        changeHueInput: (/** @type {HTMLInputElement} */ (document.querySelector("#modal-change-hue input")))
    },
    admin: {
        btn: document.querySelector("#admin .btn-get-all"),
        sets: document.querySelector('#admin .set-container'),
    }
};

async function showMySets(el = pages.mySets.sets, showAll = false) {
    el.textContent = "Loading sets...";
    let currentUser = await getCurrentUser();
    let mQuery = showAll ? query(collection(db, "meta_sets")) : query(collection(db, "meta_sets"), where("uid", "==", currentUser.uid));
    let extraParams = showAll ? [] : [[0], ["likes", "desc"]];
    await paginateQueries([mQuery], el.nextElementSibling, docs => {
        docs.forEach(async docSnap => {
            let els = await createSetCardOwner(docSnap.data(), docSnap.id, showAll);
            el.appendChild(els.card);
            els.buttons[2].addEventListener("click", () => {
                new Alert().alert({
                    type: "danger",
                    title: "Delete Set",
                    body: "Are you sure you would like to delete this set? This action cannot be undone.",
                    confirm: {
                        label: "OK",
                        onClick: async () => {
                            await deleteDoc(docSnap.ref);
                            await deleteDoc(doc(db, "sets", docSnap.id));
                            els.card.remove();
                        }
                    },
                    cancel: {
                        label: "Cancel"
                    }
                });
            });
        });
    }, ...extraParams)
    el.textContent = "";
}
function registerCustomCollectionCard(docSnap) {
    let els = createCustomCollectionCard(docSnap.data(), docSnap.id);
    pages.mySets.collections.appendChild(els.card);
    els.card.addEventListener("change", () => els.buttons[2].removeAttribute("disabled"));
    els.buttons[1].addEventListener("click", () => {
        if (els.card.querySelectorAll(".collection-sets > label").length >= 10) return alert("You can have at most 10 sets in a collection.");
        let cEls = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/", {pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"});
        els.card.querySelector(".collection-sets").append(cEls.textField, cEls.helperLine);
    });
    els.buttons[2].addEventListener("click", async () => {
        els.buttons[2].setAttribute("disabled", "");
        els.card.querySelectorAll(".collection-sets > label").forEach(el => {
            if (!el.querySelector("input").value) {
                el.nextElementSibling.remove();
                el.remove();
            }
        });
        [...els.card.querySelectorAll(".collection-sets > .field")].filter((el, i, self) => (i !== self.findIndex(t => t.querySelector("input").value === el.querySelector("input").value)) && (el.nextElementSibling.remove() || el.remove()));
        if ([...els.card.querySelectorAll(".collection-sets input.input")].every(el => el.reportValidity())) {
            let sets = [...els.card.querySelectorAll(".collection-sets input.input")].map(el => el.value);
            await updateDoc(docSnap.ref, { sets });
            els.card.querySelector(".tag").innerText = `${sets.length} sets`;
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
                    await deleteDoc(docSnap.ref);
                    els.card.remove();
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
    let currentUser = await getCurrentUser();
    let docs = await getDocs(query(collection(db, "collections"), where("uid", "==", currentUser.uid)));
    pages.mySets.collections.textContent = "";
    docs.forEach(docSnap => registerCustomCollectionCard(docSnap));
}
function loadPreviousSearch(collections) {
    let previousSearch = JSON.parse(localStorage.getItem("previous_search"));
    if (!previousSearch) return;
    pages.search.searchInput.value = previousSearch.search;
    pages.modals.filterCollectionList.querySelectorAll("input").forEach(el => el.checked = previousSearch.collections.includes(el.value));
    listPreviewCollections(previousSearch.collections, collections);
}
function saveSearch() {
    let search = {search: pages.search.searchInput.value, collections: [...pages.modals.filterCollectionList.querySelectorAll("input:checked")].map(el => el.value).filter(el => el)};
    localStorage.setItem("previous_search", JSON.stringify(search));
    return search.collections;
}
async function listPreviewCollections(collections, allCollections=null) {
    let collectionEls = await parseCollections(collections, (allCollections ? {c: allCollections} : null));
    pages.search.searchInputCollections.textContent = "";
    pages.search.searchInputCollections.append(...collectionEls);
}
async function search() {
    let searchTerm = pages.search.searchInput.value;
    let selectedFilters = saveSearch().slice(0, 10);
    let words = [];
    let queries = [];
    if (searchTerm) {
        words = getWords(searchTerm).slice(0, 10);
        queries.push(query(collection(db, "meta_sets"), where("visibility", "==", 2), where("nameWords", "array-contains-any", words)));
    }
    if (selectedFilters.length > 0)
        queries.push(query(collection(db, "meta_sets"), where("visibility", "==", 2), where("collections", "array-contains-any", selectedFilters)));
    if (!searchTerm && selectedFilters.length <= 0)
        queries.push(query(collection(db, "meta_sets"), where("visibility", "==", 2)));
    pages.search.sets[1].textContent = "Loading Sets...";
    await paginateQueries(queries, pages.search.sets[1].nextElementSibling, results => {
        let data = results.filter((val, index, self) => index === self.findIndex(t => t.id === val.id)).map(el => {
            let data = el.data();
            let relevance = 1;
            if (words.length > 0) relevance *= words.filter(val => data.nameWords.includes(val)).length / words.length;
            if (selectedFilters.length > 0) relevance *= selectedFilters.filter(val => data.collections.includes(val)).length / selectedFilters.length;
            return { id: el.id, data, relevance };
        }).filter(el => el.relevance);
        data.sort((a, b) => b.relevance - a.relevance);
        data.forEach(async docSnap => {
            let els = await createSetCard(docSnap.data, docSnap.id, docSnap.relevance);
            pages.search.sets[1].appendChild(els.card);
        });
    }, [0, 0], ["likes", "desc"]);
    pages.search.sets[1].textContent = "";
}
async function showLikedSets() {
    let currentUser = await getCurrentUser();
    if (currentUser) {
        pages.savedSets.likedSets.textContent = "Loading sets...";
        let mQuery = query(collectionGroup(db, "social"), where("uid", "==", currentUser.uid), where("like", "==", true));
        await paginateQueries([mQuery], pages.savedSets.likedSets.nextElementSibling, async docs => {
            let setIds = docs.map(el => el.ref.parent.parent.id);
            if (setIds.length < 1) return;
            let sets = await getDocs(query(collection(db, "meta_sets"), where(documentId(), "in", setIds), where("visibility", "==", 2)));
            sets.forEach(async docSnap => {
                let els = await createSetCard(docSnap.data(), docSnap.id);
                pages.savedSets.likedSets.appendChild(els.card);
            });
        })
        pages.savedSets.likedSets.textContent = "";
    }
}
async function verifyAdmin() {
    let currentUser = await getCurrentUser()
    if (!currentUser?.customAttributes.admin && location.hash === "#admin") location.hash = "#";
    return currentUser?.customAttributes.admin;
}

addEventListener("DOMContentLoaded", () => {
    pages.modals.filterCollection.onclose = () => {
        let collections = [...pages.modals.filterCollectionList.querySelectorAll("input:checked")].map(el => el.value).filter(el => el);
        if (collections.length > 10) toast({message: "Warning: You can only choose up to 10 collections!", type: "is-warning", dismissible: true, position: "bottom-center"})
        listPreviewCollections(collections);
    };
    pages.modals.changeHue.onclose = () => {};
    initBulmaModals([pages.modals.filterCollection, pages.modals.changeHue, ...pages.modals.contributers]);
    pages.modals.changeHue.on("open", () => pages.modals.changeHueInput.value = localStorage.getItem("theme_hue") || 0);
    pages.modals.changeHueInput.addEventListener("change", () => {
        localStorage.setItem("theme_hue", pages.modals.changeHueInput.value);
        setHue(pages.modals.changeHueInput.valueAsNumber);
    });
    pages.search.btnSearchGo.addEventListener("click", () => search());
    pages.search.searchInput.addEventListener("keyup", e => {
        if (e.key === "Enter") search();
    })
    pages.search.btnCollectionsMenu.addEventListener("click", () => pages.modals.filterCollection.open());
    pages.search.btnClearFilters.addEventListener("click", () => {
        pages.modals.filterCollectionList.querySelectorAll("input:checked").forEach(el => el.checked = false);
        listPreviewCollections([]);
    });
    pages.home.btnShowFeatures.addEventListener("click", () => document.querySelector(".home-features").scrollIntoView({ behavior: "smooth" }));
    pages.admin.btn.addEventListener("click", async () => {
        if (await verifyAdmin()) showMySets(pages.admin.sets, true);
    });
    pages.mySets.btnCreateCollection.addEventListener("click", async () => {
        pages.modals.changeNameInput.value = "";
        let result = await bulmaModalPromise(pages.modals.changeName);
        if (result) {
            let docRef = doc(collection(db, "collections"));
            let { uid } = await getCurrentUser();
            await setDoc(docRef, {name: pages.modals.changeNameInput.value, sets: [], uid});
            let docSnap = await getDoc(docRef);
            registerCustomCollectionCard(docSnap);
        }
    });
    
    document.querySelector(".btn-change-hue").addEventListener("click", () => pages.modals.changeHue.open());
    document.querySelector(".btn-change-hue").hidden = false;
    document.querySelectorAll(".button.is-credit").forEach((el, i) => el.addEventListener("click", () => pages.modals.contributers[i].open()))
    showCollections(pages.modals.filterCollectionList).then(collections => location.hash === "#search" && loadPreviousSearch(collections));
});
window.addEventListener("hashchange", async () => {
    let currentUser = await getCurrentUser();
    if (!currentUser && restrictedUrls.includes(location.hash)) return navigateLoginSaveState();
    switch (location.hash) {
        case "#mysets":
            showMySets();
            showMyCollections();
            break;
        case "#saved-sets":
            showLikedSets();
            break;
        case "#admin":
            verifyAdmin();
            break;
        case "#search":
            loadPreviousSearch();
            break;
    }
    document.title = `${hashTitles[location.hash] || "Home"} - Vocabustudy`;
});
document.title = `${hashTitles[location.hash] || "Home"} - Vocabustudy`;
