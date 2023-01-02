import { toast } from "bulma-toast";
import Alert from "@vizuaalog/bulmajs/src/plugins/alert";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
// eslint-disable-next-line no-unused-vars
import Dropdown from "@vizuaalog/bulmajs/src/plugins/dropdown";
import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updatePassword, updateProfile } from "firebase/auth";
import { collection, collectionGroup, deleteDoc, doc, documentId, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore/lite";
import { getValue } from "firebase/remote-config";
import initialize from "./general";
import { getWords, createSetCard, createSetCardOwner, showCollections, toLocaleDate, paginateQueries, createCustomCollectionCard, createTextFieldWithHelper, parseCollections, initBulmaModals, bulmaModalPromise, createElement, zoomOutRemove } from "./utils";

const restrictedUrls = ["#account", "#mysets", "#editor", "#admin"];
const { db, auth } = initialize(async user => {
    if (user) {
        if (location.hash === "#login") pages.login.show()
        else if (location.hash === "#saved-sets") showLikedSets();
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
                createElement("div", ["message-body"], {innerText: a.message})
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
    "#login": "Log In",
    "#mysets": "My Sets",
    "#saved-sets": "Saved Sets",
    "#admin": "Admin Portal",
    "#search": "Browse Sets",
    "#account": "My Account",
    "#discord":"Discord",
    "#donate": "Donate",
    "#youtube": "YouTube",
    "#credits": "Credits"
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
        emailNotVerified: document.querySelector("#account .field-email-not-verified"),
        btnVerifyEmail: document.querySelector("#account .btn-verify-email"),
        btnChangePassword: document.querySelector("#account .btn-change-password"),
        btnChangeName: document.querySelector("#account .btn-change-name"),
        btnDeleteAccount: document.querySelector("#account .btn-delete-account")
    },
    login: {
        page: document.getElementById("login"),
        form: document.querySelector("#login form"),
        btnsSwitchMode: document.querySelectorAll("#login .btn-switch-mode, #login .prompt-switch-mode a"),
        btnForgotPassword: document.querySelector("#login .btn-forgot-password"),
        inputEmail: document.querySelector("#login-email"),
        inputDisplayName: document.querySelector("#login-display-name"),
        inputPassword: document.querySelector("#login-password"),
        inputConfirmPassword: document.querySelector("#login-confirm-password"),
        checkTos: document.querySelector("#login-accept-tos"),
        btnSubmit: document.querySelector("#login button[type=submit]"),
        btnContinueGoogle: document.querySelector("#login .btn-continue-google"),
        show(switchMode = true) {
            this.btnSubmit.disabled = false;
            this.btnContinueGoogle.disabled = false;
            if (switchMode) this.page.dataset.mode = "login";
            this.btnSubmit.classList.remove("is-loading");
            this.btnContinueGoogle.classList.remove("is-loading");
            this.form.reset();
            this.form.classList.remove("has-validated-inputs");
            if (auth.currentUser) 
                return location.hash = "#account";
        },
        restoreState() {
            let afterLogin = localStorage.getItem("redirect_after_login");
            localStorage.removeItem("redirect_after_login");
            location.href = afterLogin || "#account";
        }
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
        reauthenticatePassword: new Modal("#modal-reauthenticate-password").modal(),
        reauthenticatePasswordInput: (/** @type {HTMLInputElement} */ (document.querySelector("#modal-reauthenticate-password input"))),
        changePassword: new Modal("#modal-change-password").modal(),
        changePasswordInputs: (/** @type {HTMLInputElement[]} */ ([...document.querySelectorAll("#modal-change-password input")])),
        changeName: new Modal("#modal-change-name").modal(),
        changeNameInput: (/** @type {HTMLInputElement} */ (document.querySelector("#modal-change-name input"))),
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

async function reauthenticateUser() {
    switch (auth.currentUser.providerData[0].providerId) {
        case GoogleAuthProvider.PROVIDER_ID: {
            let provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: "consent",
                login_hint: auth.currentUser.email
            })
            await reauthenticateWithPopup(auth.currentUser, provider);
            return true;
        } case EmailAuthProvider.PROVIDER_ID: {
            pages.modals.reauthenticatePasswordInput.value = "";
            pages.modals.reauthenticatePasswordInput.setCustomValidity("");
            let result = await bulmaModalPromise(pages.modals.reauthenticatePassword);
            return result;
        }
    }
}
async function changePassword() {
    pages.modals.changePassword.open();
    pages.modals.changePasswordInputs.forEach(el => el.value = "");
    pages.modals.changePasswordInputs.forEach(el => el.setCustomValidity(""));
    let result = await bulmaModalPromise(pages.modals.changePassword);
    if (result) await updatePassword(auth.currentUser, pages.modals.changePasswordInputs[0].value);
}
async function changeName() {
    pages.modals.changeNameInput.value = "";
    let result = await bulmaModalPromise(pages.modals.changeName);
    if (result) await updateProfile(auth.currentUser, { displayName: pages.modals.changeNameInput.value });
}
/**
 * Show account info
 * @param {import("firebase/auth").User} param0
 */
function showAccountInfo({ displayName, email, emailVerified, metadata: { creationTime } }) {
    pages.account.name.innerText = displayName;
    pages.account.email.innerText = email;
    pages.account.emailVerified.hidden = !emailVerified;
    pages.account.emailNotVerified.hidden = emailVerified;
    pages.account.btnVerifyEmail.parentElement.hidden = emailVerified;
    if (creationTime) pages.account.created.innerText = toLocaleDate(creationTime);
    else if (auth.currentUser)
        auth.currentUser.reload().then(() => pages.account.created.innerText = toLocaleDate(auth.currentUser.metadata.creationTime));
}

async function showMySets(el = pages.mySets.sets, showAll = false) {
    el.textContent = "Loading sets...";
    let mQuery = showAll ? query(collection(db, "meta_sets")) : query(collection(db, "meta_sets"), where("uid", "==", auth.currentUser.uid));
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
    els.card.addEventListener("change", () => els.buttons[2].disabled = false);
    //els.inputs.forEach(t => t.addEventListener("change", () => els.buttons[2].disabled = false));
    els.buttons[1].addEventListener("click", () => {
        if (els.card.querySelectorAll(".collection-sets > label").length >= 10) return alert("You can have at most 10 sets in a collection.");
        let cEls = createTextFieldWithHelper("Set ID", "vocabustudy.org/set/<SET ID>/view/", {pattern: "[0-9a-zA-Z]*", title: "Enter only the set id, not the full URL"});
        els.card.querySelector(".collection-sets").append(cEls.textField, cEls.helperLine);
    });
    els.buttons[2].addEventListener("click", async () => {
        els.buttons[2].disabled = true;
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
    let docs = await getDocs(query(collection(db, "collections"), where("uid", "==", auth.currentUser.uid)));
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
        queries.push(query(collection(db, "meta_sets"), where("public", "==", true), where("nameWords", "array-contains-any", words)));
    }
    if (selectedFilters.length > 0)
        queries.push(query(collection(db, "meta_sets"), where("public", "==", true), where("collections", "array-contains-any", selectedFilters)));
    if (!searchTerm && selectedFilters.length <= 0)
        queries.push(query(collection(db, "meta_sets"), where("public", "==", true)));
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
        new Alert().alert({
            type: "warning",
            title: "Verify Email Address",
            body: "You will not be able to use your account if you do not verify your email address.\nPress the button below to verify your email address:\nNote: If it does not work, contact Omkar Patil (Vocabustudy Co-Admin) or Nikhil Gupta (Server Owner + Co-Admin) on Discord in order to get your email verified manually.",
            confirm: {
                label: "Send Verification Email",
                onClick: () => 
                    sendEmailVerification(auth.currentUser).then(() => toast({message: "Verification email sent. Reload once you have verified your email.", type: "is-success", dismissible: true, position: "bottom-center", duration: 7000}))
            },
            cancel: {
                label: "Not Now"
            },
        });
    }
}
addEventListener("DOMContentLoaded", () => {
    pages.modals.filterCollection.onclose = () => {
        let collections = [...pages.modals.filterCollectionList.querySelectorAll("input:checked")].map(el => el.value).filter(el => el);
        if (collections.length > 10) toast({message: "Warning: You can only choose up to 10 collections!", type: "is-warning", dismissible: true, position: "bottom-center"})
        listPreviewCollections(collections);
    };
    pages.modals.changeHue.onclose = () => {};
    initBulmaModals([pages.modals.reauthenticatePassword, pages.modals.changePassword, pages.modals.filterCollection, pages.modals.changeHue, pages.modals.changeName, ...pages.modals.contributers]);
    pages.modals.reauthenticatePassword.validateInput = async () => {
        pages.modals.reauthenticatePasswordInput.setCustomValidity("");
        if (pages.modals.reauthenticatePasswordInput.reportValidity()) {
            let credential = EmailAuthProvider.credential(auth.currentUser.email, pages.modals.reauthenticatePasswordInput.value);
            try {
                await reauthenticateWithCredential(auth.currentUser, credential);
                return true;
            } catch {
                pages.modals.reauthenticatePasswordInput.setCustomValidity("Incorrect Password");
                pages.modals.reauthenticatePasswordInput.reportValidity();
                return false;
            }
        }
    };
    pages.modals.changePassword.validateInput = () => {
        pages.modals.changePasswordInputs.forEach(el => el.setCustomValidity(""));
        if (pages.modals.changePasswordInputs.every(el => el.reportValidity())) {
            if (pages.modals.changePasswordInputs[0].value === pages.modals.changePasswordInputs[1].value) return true;
            else {
                pages.modals.changePasswordInputs[0].setCustomValidity("Passwords do not match");
                pages.modals.changePasswordInputs[0].reportValidity();
                return false;
            }
        }
    };
    pages.modals.changeName.validateInput = () => pages.modals.changeNameInput.reportValidity();
    pages.modals.changeHue.on("open", () => pages.modals.changeHueInput.value = localStorage.getItem("theme_hue") || 0);
    pages.modals.changeHueInput.addEventListener("change", () => {
        localStorage.setItem("theme_hue", pages.modals.changeHueInput.value);
        setHue(pages.modals.changeHueInput.valueAsNumber);
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
            new Alert().alert({
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
            });
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
            await setDoc(docRef, {name: pages.modals.changeNameInput.value, sets: [], uid: auth.currentUser.uid});
            let docSnap = await getDoc(docRef);
            registerCustomCollectionCard(docSnap);
        }
    });
    pages.login.form.addEventListener("submit", async e => {
        e.preventDefault();
        pages.login.form.classList.add("has-validated-inputs");
        switch (pages.login.page.dataset.mode) {
            case "sign-up":
                pages.login.inputPassword.setCustomValidity("");
                if (pages.login.inputEmail.reportValidity() && pages.login.inputPassword.reportValidity() && pages.login.inputConfirmPassword.reportValidity() && pages.login.inputDisplayName.reportValidity() && pages.login.checkTos.reportValidity()) {
                    if (pages.login.inputPassword.value === pages.login.inputConfirmPassword.value) {
                        try {
                            await createUserWithEmailAndPassword(auth, pages.login.inputEmail.value, pages.login.inputPassword.value);
                            await updateProfile(auth.currentUser, { displayName: pages.login.inputDisplayName.value });
                            pages.login.restoreState();
                        } catch(err) {
                            if (err.name !== "FirebaseError") throw err;
                            switch(err.code) {
                                case "auth/email-already-in-use":
                                    toast({message: "An account with that email address already exists", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                                    break;
                                case "auth/too-many-requests":
                                    toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                                    break;
                                case "auth/weak-password":
                                    toast({message: "That password is too weak", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                                    break;
                            }
                        } finally {
                            pages.login.show(false);
                        }
                    } else {
                        pages.login.inputPassword.setCustomValidity("Passwords do not match");
                        pages.login.inputPassword.reportValidity();
                    }
                }
                break;
            case "forgot-password":
                if (pages.login.inputEmail.reportValidity()) {
                    pages.login.btnSubmit.disabled = true;
                    pages.login.btnSubmit.classList.add("is-loading");
                    try {
                        await sendPasswordResetEmail(auth, pages.login.inputEmail.value);
                        toast({message: "Email sent!", type: "is-success", dismissible: true, position: "bottom-center", duration: 5000});
                    } catch(err) {
                        if (err.name !== "FirebaseError") throw err;
                        switch(err.code) {
                            case "auth/user-not-found":
                                toast({message: "There is no user with that email address", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "auth/too-many-requests":
                                toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                        }
                    } finally {
                        pages.login.show(false);
                    }
                }
                break;
            default:
                if (pages.login.inputEmail.reportValidity() && pages.login.inputPassword.reportValidity()) {
                    try {
                        pages.login.btnSubmit.disabled = true;
                        pages.login.btnSubmit.classList.add("is-loading");
                        await signInWithEmailAndPassword(auth, pages.login.inputEmail.value, pages.login.inputPassword.value);
                        pages.login.restoreState();
                    } catch(err) {
                        if (err.name !== "FirebaseError") throw err;
                        switch(err.code) {
                            case "auth/user-not-found":
                                toast({message: "There is no user with that email address", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "auth/wrong-password":
                                toast({message: "Incorrect password", type: "is-danger", dismissible: true, position: "bottom-center", duration: 5000});
                                break;
                            case "auth/too-many-requests":
                                toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "auth/user-disabled":
                                toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                                break;
                            case "auth/account-exists-with-different-credential":
                                toast({message: "Use Sign In with Google for that account", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                        }
                    } finally {
                        pages.login.show();
                    }
                }
                break;
        }
    });
    pages.login.btnsSwitchMode.forEach(el => el.addEventListener("click", () => {
        if (pages.login.page.dataset.mode === "sign-up" || pages.login.page.dataset.mode === "forgot-password") pages.login.page.dataset.mode = "login";
        else pages.login.page.dataset.mode = "sign-up";
    }));
    pages.login.btnForgotPassword.addEventListener("click", () => pages.login.page.dataset.mode = "forgot-password");
    pages.login.btnContinueGoogle.addEventListener("click", async () => {
        pages.login.btnContinueGoogle.disabled = true;
        pages.login.btnContinueGoogle.classList.add("is-loading");
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            pages.login.restoreState();
        } catch (err) {
            switch(err.code) {
                case "auth/popup-blocked":
                    toast({message: "The popup was blocked", type: "is-info", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "auth/popup-closed-by-user":
                    toast({message: "Operation Cancelled", type: "is-info", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "auth/too-many-requests":
                    toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                    break;
                case "auth/user-disabled":
                    toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "auth/unauthorized-continue-uri":
                    toast({message: "Invalid domain", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "auth/account-exists-with-different-credential":
                    toast({message: "Use email/password login for that account", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                    break;
            }
        } finally {
            pages.login.show();
        }
    });
    document.querySelector(".btn-change-hue").addEventListener("click", () => pages.modals.changeHue.open());
    document.querySelector(".btn-change-hue").hidden = false;
    document.querySelectorAll(".button.is-credit").forEach((el, i) => el.addEventListener("click", () => pages.modals.contributers[i].open()))
    showCollections(pages.modals.filterCollectionList).then(collections => location.hash === "#search" && loadPreviousSearch(collections));
    if (location.hash === "#login") pages.login.show();
});
window.addEventListener("hashchange", () => {
    if (!auth.currentUser && restrictedUrls.includes(location.hash)) {
        localStorage.setItem("redirect_after_login", location.href);
        location.hash = "#login";
        return;
    }
    switch (location.hash) {
        case "#login":
            pages.login.show();
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
    }
    document.title = `${hashTitles[location.hash] || "Home"} - Vocabustudy`;
});
document.title = `${hashTitles[location.hash] || "Home"} - Vocabustudy`;
