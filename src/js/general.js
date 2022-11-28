/* eslint-disable no-undef */
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
    btnLogout: document.getElementById("btn-logout"),
    burger: document.querySelector(".navbar-burger"),
    menu: document.getElementById("main-navbar")
};
const fabs = {
    theme: document.querySelector(".fab-theme"),
    themeContainer: document.querySelector(".fab-theme-container"),
    themeOptions: document.querySelectorAll(".fab-theme-container > div button")
};

const firebaseConfig = {
    apiKey: "AIzaSyCsDuM2jx3ZqccS8MS5aumkOKaV2LiVwZk",
    authDomain: "vocabustudy.org",
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
            fabs.theme.querySelector("i").innerText = "brightness_4";
            document.body.classList.add("theme-dark");
            break;
        case "system":
            fabs.theme.querySelector("i").innerText = "settings_brightness";
            document.body.classList.add("theme-system");
            break;
        case "light":
            fabs.theme.querySelector("i").innerText = "brightness_high";
            break;
    }
}
export function setHue(hue) {
    if (parseInt(hue) > 0) {
        document.documentElement.style.setProperty("--hue-rotated", hue)
        document.documentElement.style.filter = `hue-rotate(calc(var(--hue-rotated) * 1deg))`;
    } else document.documentElement.style.filter = "none";
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
    if (location.host === "vocabustudyonline.web.app" && !localStorage.getItem("use_vocabustudyonline")) {
        location.host = "vocabustudy.org";
        return;
    }
    showTheme(localStorage.getItem("theme"));
    setHue(localStorage.getItem("theme_hue"));
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
    } else if (process.env.CODESPACES) {
        connectAuthEmulator(auth, `https://${process.env.CODESPACE_NAME}-9099.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/:443`, {disableWarnings: true});
        connectFirestoreEmulator(db, `${process.env.CODESPACE_NAME}-8080.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`, 443);
    }
    addEventListener("DOMContentLoaded", () => {
        navbar.burger.addEventListener("click", () => {
            navbar.burger.classList.toggle("is-active");
            navbar.menu.classList.toggle("is-active");
        })
        fabs.themeOptions.forEach((el, i) => {
            el.addEventListener("click", () => {
                showTheme(themes[i]);
                localStorage.setItem("theme", themes[i]);
            });
        });
        navbar.btnLogout.addEventListener("click", () => auth.signOut());
    });
    auth.onAuthStateChanged(async user => {
        window.sentrySetUser?.call(window, user);
        if (user) setLoginButtonsState(true, (await user.getIdTokenResult()).claims.admin); else setLoginButtonsState(false, false);
        authStateChangedCallback(user);
    });
    fabs.theme.addEventListener("click", e => {
        e.stopPropagation();
        fabs.themeContainer.classList.toggle("show")
    }, true);
    document.addEventListener("click", () => fabs.themeContainer.classList.remove("show"));
    document.querySelector("#account-menu .loggedout a").addEventListener("click", () => localStorage.removeItem("redirect_after_login"))
    remoteConfig.settings.minimumFetchIntervalMillis = 172800000; //-> two days
    remoteConfig.defaultConfig = {
        featuredSets: []
    };
    fetchAndActivate(remoteConfig).then(() => remoteConfigActivatedCallback(remoteConfig));
    return {app, db, auth};
}
