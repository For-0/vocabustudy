// import { MDCDialog } from "@material/dialog/index";
// import { MDCRipple } from "@material/ripple/index";
// import { MDCSlider } from "@material/slider";
// import { MDCSnackbar } from "@material/snackbar/index";
// import { MDCTextField } from "@material/textfield/index";
// import { MDCMenu } from "@material/menu";
import { toast } from "bulma-toast";
import Alert from "@vizuaalog/bulmajs/src/plugins/alert";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
import { deleteUser, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, sendEmailVerification, updatePassword, updateProfile, User } from "firebase/auth";
import { collection, collectionGroup, deleteDoc, doc, documentId, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore/lite";
import { getValue } from "firebase/remote-config";
import * as firebaseui from "firebaseui";
import initialize, { setHue } from "./general";
import { getWords, createSetCard, createSetCardOwner, showCollections, toLocaleDate, paginateQueries, createCustomCollectionCard, createTextFieldWithHelper, parseCollections } from "./utils";
window.Modal = Modal;
const restrictedUrls = ["#account", "#mysets", "#editor", "#admin"];
const { db, auth } = initialize(async user => {
    if (user) {
        if (location.hash === "#login") {
            await showAuthUI();
        } else if (location.hash === "#saved-sets") showLikedSets();
        else if (location.hash === "#mysets") {
            showMySets();
            showMyCollections();
        }
        verifyAdmin();
        showAccountInfo(auth.currentUser);
        if (!user.emailVerified) verifyEmail();
    } else {
        if (restrictedUrls.includes(location.hash)) {
            localStorage.setItem("redirect_after_login", location.href);
            location.hash = "#login";
        }
        showAccountInfo({displayName: "", email: "", emailVerified: true, metadata: { creationTime: "" } });
    }
}, async remoteConfig => {
    let featuredSets = JSON.parse(getValue(remoteConfig, "featuredSets").asString());
    pages.publicsets.sets[0].textContent = "";
    for (let set of featuredSets) {
        let els = await createSetCard(set, set.id);
        pages.publicsets.sets[0].appendChild(els.card);
    }
});
const hashTitles = {
    "#login": "Log In",
    "#mysets": "My Sets",
    "#saved-sets": "Saved Sets",
    "#admin": "Admin Portal",
    "#search": "Browse Sets",
    "#account": "My Account"
};
const pages = {
    home: {
        el: document.getElementById("page-home"),
        btnShowFeatures: document.querySelector(".btn-show-features")
    },
    account: {
        name: document.querySelector("#account .field-name"),
        email: document.querySelector("#account .field-email"),
        created: document.querySelector("#account .field-created"),
        emailVerified: document.querySelector("#account .field-email-verified"),
        emailNotVerified: !document.querySelector("#account .field-email-not-verified"),
        btnVerifyEmail: document.querySelector("#account .btn-verify-email"),
        btnChangePassword: document.querySelector("#account .btn-change-password"),
        btnChangeName: document.querySelector("#account .btn-change-name"),
        btnDeleteAccount: document.querySelector("#account .btn-delete-account")
    },
    mysets: {
        sets: document.querySelector('#mysets .set-container'),
        collections: document.querySelector("#mysets .collection-container"),
        btnCreateCollection: document.querySelector("#mysets .btn-create-collection"),
        btnCreate: document.querySelector("#mysets .btn-create"),
        menuCreate: new MDCMenu(document.querySelector("#mysets .btn-create + .mdc-menu")),
    },
    publicsets: {
        sets: document.querySelectorAll("#search .set-container"),
        btnSearchGo: document.querySelector("#search .btn-search-go"),
        btnCollectionsMenu: document.querySelector("#search .btn-collections-menu"),
        btnClearFilters: document.querySelector("#search .btn-clear-filters"),
        searchInput: new MDCTextField(document.querySelector("#search .field-search"))
    },
    savedSets: {
        likedSets: document.querySelector("#saved-sets .liked-container"),
    },
    modals: {
        reauthenticatePassword: new Modal("#modal-reauthenticate-password"),
        reauthenticatePasswordInput: document.querySelector("#modal-reauthenticate-password input"),
        changePassword: new MDCDialog(document.getElementById("modal-change-password")),
        changePasswordInputs: [...document.querySelectorAll("#modal-change-password input")],
        changeName: new MDCDialog(document.getElementById("modal-change-name")),
        changeNameInput: document.querySelector("#modal-change-name input"),
        filterCollection: new MDCDialog(document.getElementById("modal-filter-collection")),
        filterCollectionList: document.querySelector("#modal-filter-collection .mdc-list"),
        changeHue: new MDCDialog(document.getElementById("modal-change-hue")),
        changeHueInput: document.querySelector("#modal-change-hue input")
    },
    admin: {
        btn: document.querySelector("#admin .btn-get-all"),
        sets: document.querySelector('#admin .set-container'),
    }
};
const authUI = new firebaseui.auth.AuthUI(auth);
async function showAuthUI() {
    if (auth.currentUser) 
        return location.hash = "#account";
    document.getElementById("firebaseui-css").disabled = false;
    authUI.reset();
    authUI.start("#firebaseui-auth-container", {
        signInOptions: [
            {
                provider: GoogleAuthProvider.PROVIDER_ID,
                customParameters: {
                    prompt: "select_account"
                }
            },
            {
                provider: EmailAuthProvider.PROVIDER_ID,
                requireDisplayName: true
            }
        ],
        callbacks: {
            signInSuccessWithAuthResult: () => {
                let afterLogin = localStorage.getItem("redirect_after_login");
                localStorage.removeItem("redirect_after_login");
                location.href = afterLogin || "#account";
                return false;
            },
            uiShown: () => console.log("[FirebaseUI] Auth UI Loaded")
        },
        signInFlow: "popup",
        privacyPolicyUrl: "https://vocabustudy.org/privacy",
        siteName: "Vocabustudy"
    });
}
async function reauthenticateUser() {
    switch (auth.currentUser.providerData[0].providerId) {
        case GoogleAuthProvider.PROVIDER_ID:
            let provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: "consent",
                login_hint: auth.currentUser.email
            })
            await reauthenticateWithPopup(auth.currentUser, provider);
            return true;
        case EmailAuthProvider.PROVIDER_ID:
            pages.modals.reauthenticatePasswordInput.value = "";
            pages.modals.reauthenticatePasswordInput.valid = true;
            pages.modals.reauthenticatePasswordInput.root.querySelector("input").setCustomValidity("");
            pages.modals.reauthenticatePassword.open();
            let result = await (() => new Promise(resolve => pages.modals.reauthenticatePassword.listen("V:AuthResult", e => resolve(e.detail.result), { once: true })))();
            return result;
    }
}
async function changePassword() {
    pages.modals.changePassword.open();
    pages.modals.changePasswordInputs.forEach(el => el.value = "");
    pages.modals.changePasswordInputs.forEach(el => el.valid = true);
    pages.modals.changePasswordInputs.forEach(el => el.root.querySelector("input").setCustomValidity(""));
    let result = await (() => new Promise(resolve => pages.modals.changePassword.listen("V:Result", e => resolve(e.detail.result), { once: true })))();
    if (result !== null) await updatePassword(auth.currentUser, result);
}
async function changeName() {
    pages.modals.changeName.open();
    pages.modals.changeNameInput.value = "";
    pages.modals.changeNameInput.valid = true;
    let result = await (() => new Promise(resolve => pages.modals.changeName.listen("V:Result", e => resolve(e.detail.result), { once: true })))();
    if (result !== null) await updateProfile(auth.currentUser, { displayName: result });
}
/**
 * Show account info
 * @param {User} param0
 */
function showAccountInfo({ displayName, email, emailVerified, metadata: { creationTime } }) {
    pages.account.name.innerText = displayName;
    pages.account.email.innerText = email;
    pages.account.emailVerified.hidden = emailVerified;
    pages.account.emailNotVerified.hidden = !emailVerified;
    pages.account.btnVerifyEmail.hidden = emailVerified;
    if (creationTime) pages.account.created.innerText = toLocaleDate(creationTime);
    else if (auth.currentUser)
        auth.currentUser.reload().then(() => pages.account.created.innerText = toLocaleDate(auth.currentUser.metadata.creationTime));
}

async function showMySets(el = pages.mysets.sets, showAll = false) {
    el.textContent = "Loading sets...";
    let mQuery = showAll ? query(collection(db, "meta_sets")) : query(collection(db, "meta_sets"), where("uid", "==", auth.currentUser.uid));
    let extraParams = showAll ? [] : [[0], ["likes", "desc"]];
    await paginateQueries([mQuery], el.nextElementSibling, docs => {
        docs.forEach(async docSnap => {
            let els = await createSetCardOwner(docSnap.data(), docSnap.id, showAll);
            el.appendChild(els.card);
            els.buttons[2].addEventListener("click", () => {
                new Alert({
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
            })
        });
    }, ...extraParams)
    el.textContent = "";
}
function registerCustomCollectionCard(docSnap) {
    let els = createCustomCollectionCard(docSnap.data(), docSnap.id);
    pages.mysets.collections.appendChild(els.card);
    els.textFields.forEach(t => {
        t.layout();
        t.listen("change", () => els.buttons[2].disabled = false);
    });
    els.buttons[1].addEventListener("click", () => {
        if (els.card.querySelectorAll(".collection-sets > label").length >= 10) return alert("You can have at most 10 sets in a collection.");
        let cEls = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/");
        els.card.querySelector(".collection-sets").append(cEls.textField, cEls.helperLine);
        cEls.obj.layout();
        cEls.obj.listen("change", () => els.buttons[2].disabled = false);
    });
    els.buttons[2].addEventListener("click", async () => {
        els.buttons[2].disabled = true;
        els.card.querySelectorAll(".collection-sets > label").forEach(el => {
            if (!el.querySelector("input").value) {
                el.nextElementSibling.remove();
                el.remove();
            }
        });
        [...els.card.querySelectorAll(".collection-sets > label")].filter((el, i, self) => (i !== self.findIndex(t => t.querySelector("input").value === el.querySelector("input").value)) && (el.nextElementSibling.remove() || el.remove()));
        if ([...els.card.querySelectorAll(".collection-sets > label > input")].every(el => el.reportValidity())) {
            let sets = [...els.card.querySelectorAll(".collection-sets > label input")].map(el => el.value);
            await updateDoc(docSnap.ref, { sets });
            els.card.querySelector(".card-content > div:last-child").innerText = `${sets.length} sets`;
        }
    });
    els.buttons[3].addEventListener("click", () => {
        new Alert({
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
    pages.mysets.collections.textContent = "Loading collections...";
    let docs = await getDocs(query(collection(db, "collections"), where("uid", "==", auth.currentUser.uid)));
    pages.mysets.collections.textContent = "";
    docs.forEach(docSnap => registerCustomCollectionCard(docSnap));
}
function loadPreviousSearch(collections) {
    let previousSearch = JSON.parse(localStorage.getItem("previous_search"));
    if (!previousSearch) return;
    pages.publicsets.searchInput.value = previousSearch.search;
    pages.modals.filterCollectionList.querySelectorAll("input").forEach(el => el.checked = previousSearch.collections.includes(el.value));
    listPreviewCollections(previousSearch.collections, collections);
}
function saveSearch() {
    let search = {search: pages.publicsets.searchInput.value, collections: [...pages.modals.filterCollectionList.querySelectorAll("input:checked")].map(el => el.value).filter(el => el)};
    localStorage.setItem("previous_search", JSON.stringify(search));
    return search.collections;
}
async function listPreviewCollections(collections, allCollections=null) {
    let collectionEls = await parseCollections(collections, (allCollections ? {c: allCollections} : null));
    pages.publicsets.searchInput.helperText.root.querySelector(".list-collections").textContent = "";
    pages.publicsets.searchInput.helperText.root.querySelector(".list-collections").append(...collectionEls)
}
async function search() {
    let searchTerm = pages.publicsets.searchInput.value;
    let selectedFilters = saveSearch().slice(0, 10);
    let words = [];
    let queries = [];
    if (searchTerm) {
        words = getWords(searchTerm).slice(0, 10);
        queries.push(query(collection(db, "meta_sets"), where("public", "==", true), where("nameWords", "array-contains-any", words)));
    }
    if (selectedFilters.length > 0)
        queries.push(query(collection(db, "meta_sets"), where("public", "==", true), where("collections", "array-contains-any", selectedFilters)));
    if (!searchTerm && selectedFilters.length <= 0)
        queries.push(query(collection(db, "meta_sets"), where("public", "==", true)));
    pages.publicsets.sets[1].textContent = "Loading Sets...";
    await paginateQueries(queries, pages.publicsets.sets[1].nextElementSibling, results => {
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
            pages.publicsets.sets[1].appendChild(els.card);
        });
    }, [0, 0], ["likes", "desc"]);
    pages.publicsets.sets[1].textContent = "";
}
async function showLikedSets() {
    if (auth.currentUser) {
        pages.savedSets.likedSets.textContent = "Loading sets...";
        let mQuery = query(collectionGroup(db, "social"), where("uid", "==", auth.currentUser.uid), where("like", "==", true));
        await paginateQueries([mQuery], pages.savedSets.likedSets.nextElementSibling, async docs => {
            let setIds = docs.map(el => el.ref.parent.parent.id);
            if (setIds.length < 1) return;
            let sets = await getDocs(query(collection(db, "meta_sets"), where(documentId(), "in", setIds), where("public", "==", true)));
            sets.forEach(async docSnap => {
                let els = await createSetCard(docSnap.data(), docSnap.id);
                pages.savedSets.likedSets.appendChild(els.card);
            });
        })
        pages.savedSets.likedSets.textContent = "";
    }
}
async function verifyAdmin() {
    let token = await auth.currentUser.getIdTokenResult();
    if (!token.claims.admin && location.hash === "#admin") location.hash = "#";
    return token.claims.admin;
}
function verifyEmail() {
    if (auth.currentUser) {
        new Alert({
            type: "info",
            title: "Verify Email Address",
            body: "You will not be able to use your account if you do not verify your email address.\nPress the button below to verify your email address:\nNote: If it does not work, contact Omkar Patil (Vocabustudy Co-Admin) or Nikhil Gupta (Server Owner + Co-Admin) on Discord in order to get your email verified manually.",
            confirm: {
                label: "Send Verification Email",
                onClick: () => 
                    sendEmailVerification(auth.currentUser).then(() => toast({message: "Verification email sent. Reload once you have verified your email.", type: "is-success", dismissible: true, position: "bottom-center"}))
            },
            cancel: {
                label: "Not Now"
            }
        });
    }
}
addEventListener("DOMContentLoaded", () => {
    // MDC Instantiation and Events
    pages.modals.reauthenticatePassword.listen("MDCDialog:closing", e => {
        if (e.detail.action === "close") pages.modals.reauthenticatePassword.emit("V:AuthResult", { result: false });
    });
    pages.modals.changePassword.listen("MDCDialog:closing", e => {
        if (e.detail.action === "close") pages.modals.changePassword.emit("V:Result", { result: null });
    });
    pages.modals.changeName.listen("MDCDialog:closing", e => {
        if (e.detail.action === "close") pages.modals.changeName.emit("V:Result", { result: null });
    });
    pages.modals.filterCollection.listen("MDCDialog:closing", () => {
        let collections = [...pages.modals.filterCollectionList.querySelectorAll("input:checked")].map(el => el.value).filter(el => el);
        if (collections.length > 10) toast({message: "Warning: You can only choose up to 10 collections!", type: "is-warning", dismissible: true, position: "bottom-center"})
        listPreviewCollections(collections);
    });
    pages.modals.reauthenticatePassword.root.querySelector("button:last-child").addEventListener("click", () => {
        pages.modals.reauthenticatePasswordInput.root.querySelector("input").setCustomValidity("");
        if (pages.modals.reauthenticatePasswordInput.valid = pages.modals.reauthenticatePasswordInput.valid) { // assignment to itself triggers the property setter, therefore triggering validity styles
            let credential = EmailAuthProvider.credential(auth.currentUser.email, pages.modals.reauthenticatePasswordInput.value);
            reauthenticateWithCredential(auth.currentUser, credential).then(() => {
                pages.modals.reauthenticatePassword.emit("V:AuthResult", { result: true });
                pages.modals.reauthenticatePassword.close("success");
            }).catch(_ => {
                pages.modals.reauthenticatePasswordInput.root.querySelector("input").setCustomValidity("Incorrect Password");
                pages.modals.reauthenticatePasswordInput.root.querySelector("input").reportValidity();
            });
        }
    });
    pages.modals.changePassword.root.querySelector("button:last-child").addEventListener("click", () => {
        pages.modals.changePasswordInputs.forEach(el => el.root.querySelector("input").setCustomValidity(""));
        if (pages.modals.changePasswordInputs.every(el => el.valid = el.valid)) { // assignment to itself triggers the property setter, therefore triggering validity styles
            if (pages.modals.changePasswordInputs[0].value === pages.modals.changePasswordInputs[1].value) {
                pages.modals.changePassword.emit("V:Result", { result: pages.modals.changePasswordInputs[0].value });
                pages.modals.changePassword.close("success");
            } else {
                pages.modals.changePasswordInputs[0].root.querySelector("input").setCustomValidity("Passwords do not match");
                pages.modals.changePasswordInputs[0].root.querySelector("input").reportValidity();
            }
        }
    });
    pages.modals.changeName.root.querySelector("button:last-child").addEventListener("click", () => {
        if (pages.modals.changeNameInput.valid = pages.modals.changeNameInput.valid) { // assignment to itself triggers the property setter, therefore triggering validity styles
            pages.modals.changeName.emit("V:Result", { result: pages.modals.changeNameInput.value });
            pages.modals.changeName.close("success");
        }
    });
    pages.modals.changeHue.listen("MDCDialog:opened", () => setTimeout(() => pages.modals.changeHueInput.layout(), 100));
    pages.modals.changeHueInput.listen("MDCSlider:change", () => {
        localStorage.setItem("theme_hue", pages.modals.changeHueInput.getValue());
        setHue(pages.modals.changeHueInput.getValue());
    });
    pages.account.btnVerifyEmail.addEventListener("click", () => auth.currentUser.emailVerified ? location.reload() : verifyEmail());
    pages.account.btnChangePassword.addEventListener("click", async () => {
        let result = await reauthenticateUser();
        if (result) await changePassword();
    });
    pages.account.btnChangeName.addEventListener("click", async () => {
        await changeName();
        showAccountInfo(auth.currentUser);
    });
    pages.account.btnDeleteAccount.addEventListener("click", async () => {
        let result = await reauthenticateUser();
        if (result)
            new Alert({
                type: "danger",
                title: "Delete Account",
                body: "Are you sure you would like to delete your account? Your sets will not be deleted.",
                confirm: {
                    label: "OK",
                    onClick: () => deleteUser(auth.currentUser)
                },
                cancel: {
                    label: "Cancel"
                }
            })
    });
    pages.publicsets.btnSearchGo.addEventListener("click", () => search());
    pages.publicsets.searchInput.listen("keyup", e => {
        if (e.key === "Enter") search();
    })
    pages.publicsets.btnCollectionsMenu.addEventListener("click", () => pages.modals.filterCollection.open());
    pages.publicsets.btnClearFilters.addEventListener("click", () => {
        pages.modals.filterCollectionList.querySelectorAll("input:checked").forEach(el => el.checked = false);
        listPreviewCollections([]);
    });
    pages.home.btnShowFeatures.addEventListener("click", () => document.querySelector(".home-features").scrollIntoView({ behavior: "smooth" }));
    pages.admin.btn.addEventListener("click", async () => {
        if (await verifyAdmin()) showMySets(pages.admin.sets, true);
    });
    pages.mysets.btnCreateCollection.addEventListener("click", async () => {
        let docRef = doc(collection(db, "collections"));
        pages.modals.changeName.open();
        pages.modals.changeNameInput.value = "";
        pages.modals.changeNameInput.valid = true;
        let name = await (() => new Promise(resolve => pages.modals.changeName.listen("V:Result", e => resolve(e.detail.result), { once: true })))();
        if (name !== null) {
            await setDoc(docRef, {name, sets: [], uid: auth.currentUser.uid});
            let docSnap = await getDoc(docRef);
            registerCustomCollectionCard(docSnap);
        }
    });
    pages.mysets.btnCreate.addEventListener("click", () => pages.mysets.menuCreate.open = true);
    MDCRipple.attachTo(pages.account.btnVerifyEmail);
    MDCRipple.attachTo(pages.account.btnChangePassword);
    MDCRipple.attachTo(pages.account.btnDeleteAccount);
    MDCRipple.attachTo(pages.home.btnShowFeatures).unbounded = true;
    MDCRipple.attachTo(pages.account.btnChangeName);
    MDCRipple.attachTo(pages.mysets.btnCreateCollection);
    MDCRipple.attachTo(pages.mysets.btnCreate);
    MDCRipple.attachTo(pages.publicsets.btnCollectionsMenu);
    MDCRipple.attachTo(pages.publicsets.btnClearFilters);
    MDCRipple.attachTo(pages.publicsets.btnSearchGo);
    MDCRipple.attachTo(pages.admin.btn);
    MDCRipple.attachTo(document.querySelector(".btn-change-hue")).listen("click", () => pages.modals.changeHue.open());
    showCollections(pages.modals.filterCollectionList).then(collections => location.hash === "#search" && loadPreviousSearch(collections));
    if (location.hash === "#login") showAuthUI();
});
addEventListener("load", () => pages.publicsets.searchInput.value = pages.publicsets.searchInput.root.querySelector("input").value);
window.addEventListener("hashchange", () => {
    if (!auth.currentUser && restrictedUrls.includes(location.hash)) {
        localStorage.setItem("redirect_after_login", location.href);
        location.hash = "#login";
        return;
    }
    switch (location.hash) {
        case "#login":
            showAuthUI();
            break;
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
    };
    document.title = `${hashTitles[location.hash] || "Home"} - Vocabustudy`;
});
document.title = `${hashTitles[location.hash] || "Home"} - Vocabustudy`;