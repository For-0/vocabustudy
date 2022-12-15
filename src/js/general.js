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

const firebaseConfig = {
    apiKey: "AIzaSyCsDuM2jx3ZqccS8MS5aumkOKaV2LiVwZk",
    authDomain: "vocabustudy.org",
    projectId: "vocab-u-study",
    storageBucket: "vocab-u-study.appspot.com",
    messagingSenderId: "230085427328",
    appId: "1:230085427328:web:9eed7902aab4c8eb49e665"
};

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
    } else if (process.env.GITPOD_WORKSPACE_URL) {
        connectAuthEmulator(auth, `https://${9099}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}/:443`, {disableWarnings: true});
        connectFirestoreEmulator(db, `${8080}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}`, 443);
    }
    window.signOut = () => auth.signOut(); // TODO move all to SW, as this will not work on some pages. ALso may disable tree shaking
    auth.onAuthStateChanged(async user => {
        window.sentrySetUser?.call(window, user);
        if (user) setLoginButtonsState(true, (await user.getIdTokenResult()).claims.admin); else setLoginButtonsState(false, false);
        authStateChangedCallback(user);
    });
    remoteConfig.settings.minimumFetchIntervalMillis = 172800000; //-> two days
    remoteConfig.defaultConfig = {
        featuredSets: []
    };
    fetchAndActivate(remoteConfig).then(() => remoteConfigActivatedCallback(remoteConfig));
    return {app, db, auth};
}
