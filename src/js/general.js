import { MDCMenu } from "@material/menu/index";
import { MDCTooltip } from "@material/tooltip/index";
import { MDCRipple } from "@material/ripple/index";
import { initializeApp } from "firebase/app";
import { browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, initializeAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore/lite";
import { fetchAndActivate, getRemoteConfig } from "firebase/remote-config";

function setLoginButtonsState(state, isAdmin) {
    document.querySelectorAll(".loggedin").forEach(el => el.hidden = !state);
    document.querySelectorAll(".loggedout").forEach(el => el.hidden = state);
    document.querySelectorAll(".adminonly").forEach(el => el.hidden = !isAdmin);
}
const navbar = {
    accountMenu: document.getElementById("account-menu"),
    btnAccountMenu: document.getElementById("btn-account-menu"),
    btnLogout: document.getElementById("btn-logout"),
    tooltipAccountMenu: document.getElementById("tooltip-btn-account-menu"),
    tooltipBtnBrowse: document.getElementById("tooltip-btn-browse"),
    tooltipBtnLeaderboard: document.getElementById("tooltip-btn-leaderboard"),
    tooltipBtnHelp: document.getElementById("tooltip-btn-support")
};
const fabs = {
    theme: document.querySelector(".fab-theme"),
    themeContainer: document.querySelector(".fab-theme-container"),
    themeOptions: document.querySelectorAll(".fab-theme-container > div button")
};

const firebaseConfig = {
    apiKey: "AIzaSyCsDuM2jx3ZqccS8MS5aumkOKaV2LiVwZk",
    authDomain: "vocabustudyonline.web.app",
    projectId: "vocab-u-study",
    storageBucket: "vocab-u-study.appspot.com",
    messagingSenderId: "230085427328",
    appId: "1:230085427328:web:9eed7902aab4c8eb49e665"

};
const themes = ["system", "dark", "light"];
function showTheme(theme) {
    document.body.classList.remove("theme-dark", "theme-system");
    switch(theme) {
        case "dark":
            fabs.theme.querySelector("span").innerText = "brightness_4";
            document.body.classList.add("theme-dark");
            break;
        case "system":
            fabs.theme.querySelector("span").innerText = "settings_brightness";
            document.body.classList.add("theme-system");
            break;
        case "light":
            fabs.theme.querySelector("span").innerText = "brightness_high";
            break;
    }
}

/**
 * Callback for when the auth state changes
 * @callback authStateChangedCallback
 * @param {import("firebase/auth").User} user The user that signed in if available
 */
/**
 * Callback for when remote config has been activated
 * @callback remoteConfigActivatedCallback
 * @param {import("firebase/remote-config").RemoteConfig} remoteConfig The remote config instance
 */

/**
 * Initializes Firebase and Navbar
 * @param {authStateChangedCallback} authStateChangedCallback 
 * @param {remoteConfigActivatedCallback} remoteConfigActivatedCallback 
 */
export default function initialize(authStateChangedCallback = () => {}, remoteConfigActivatedCallback = () => {}) {
    showTheme(localStorage.getItem("theme"));
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver
    });
    auth.setPersistence(browserLocalPersistence);
    //const analytics = getAnalytics(app);
    const remoteConfig = getRemoteConfig(app);
    
    if (process.env.NODE_ENV !== "production" && location.hostname === "localhost") {
        connectAuthEmulator(auth, "http://localhost:9099", {disableWarnings: true});
        connectFirestoreEmulator(db, "localhost", 8080);
    }
    addEventListener("DOMContentLoaded", () => {
        MDCTooltip.attachTo(navbar.tooltipAccountMenu);
        MDCTooltip.attachTo(navbar.tooltipBtnBrowse);
        MDCTooltip.attachTo(navbar.tooltipBtnLeaderboard);
        MDCTooltip.attachTo(navbar.tooltipBtnHelp);
        MDCRipple.attachTo(fabs.theme);
        fabs.themeOptions.forEach((el, i) => {
            MDCRipple.attachTo(el);
            el.addEventListener("click", () => {
                showTheme(themes[i]);
                localStorage.setItem("theme", themes[i]);
            });
        });
        let menu = new MDCMenu(navbar.accountMenu);
        menu.setAnchorMargin({ top: 20 });
        navbar.btnAccountMenu.addEventListener("mousedown", () => menu.open = !menu.open);
        navbar.btnLogout.addEventListener("click", () => auth.signOut());
    });
    auth.onAuthStateChanged(async user => {
        if (user) setLoginButtonsState(true, (await user.getIdTokenResult()).claims.admin); else setLoginButtonsState(false, false);
        authStateChangedCallback(user);
    });
    fabs.theme.addEventListener("click", e => {
        e.stopPropagation();
        fabs.themeContainer.classList.toggle("show")
    }, true);
    document.addEventListener("click", () => fabs.themeContainer.classList.remove("show"));
    remoteConfig.settings.minimumFetchIntervalMillis = 172800000; //-> two days
    remoteConfig.defaultConfig = {
        featuredSets: []
    };
    fetchAndActivate(remoteConfig).then(() => remoteConfigActivatedCallback(remoteConfig));
    return {app, db, auth, get storage() {
        return (async () => {
            const {getStorage, getDownloadURL, ref}  = await import("firebase/storage");
            let storage = getStorage(app);
            this.storage = () => Promise.resolve({storage, getDownloadURL, ref});
            return {storage, getDownloadURL, ref};
        })();
    }};
}