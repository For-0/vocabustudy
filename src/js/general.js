/* eslint-disable no-undef */
import { initializeApp } from "firebase/app";
import { browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, initializeAuth } from "firebase/auth";
import { Auth, getCurrentUser, refreshCurrentUser, setCurrentUser } from "./firebase-rest-api/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore/lite";

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
 * @param {import("./firebase-rest-api/auth").User} user The user that signed in if available
 */
/**
 * Callback for when remote config has been activated
 * @callback remoteConfigActivatedCallback
 * @param {import("firebase/remote-config").RemoteConfig?} remoteConfig The remote config instance. Null if remote config is unavailable (like if indexeddb is not available)
 */

/**
 * Initializes Firebase and Navbar
 * @param {authStateChangedCallback} authStateChangedCallback 
 * @param {remoteConfigActivatedCallback} remoteConfigActivatedCallback 
 */
export default function initialize(authStateChangedCallback = () => {}, remoteConfigActivatedCallback = null) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver
    });
    auth.setPersistence(browserLocalPersistence);
    const newAuth = new Auth();
    if (remoteConfigActivatedCallback !== null) {
        import("firebase/remote-config").then(async ({getRemoteConfig, fetchAndActivate}) => {
            let remoteConfig = getRemoteConfig(app);
            remoteConfig.settings.minimumFetchIntervalMillis = 86400000; //-> two days
            remoteConfig.defaultConfig = {
                featuredSets: [],
                announcements: []
            };
            await fetchAndActivate(remoteConfig)
            remoteConfigActivatedCallback(remoteConfig);
        }).catch(err => {
            console.warn(`Error while activating Remote Config: ${err}`);
            remoteConfigActivatedCallback(null);
        });
    }
    
    if (process.env.NODE_ENV !== "production" && location.hostname === "localhost") {
        connectAuthEmulator(auth, "http://localhost:9099", {disableWarnings: true});
        newAuth.emulatorUrl = "http://localhost:9099";
        connectFirestoreEmulator(db, "localhost", 8080);
    } else if (process.env.CODESPACES) {
        connectAuthEmulator(auth, `https://${process.env.CODESPACE_NAME}-9099.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/:443`, {disableWarnings: true});
        connectFirestoreEmulator(db, `${process.env.CODESPACE_NAME}-8080.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`, 443);
    } else if (process.env.GITPOD_WORKSPACE_URL) {
        connectAuthEmulator(auth, `https://${9099}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}/:443`, {disableWarnings: true});
        connectFirestoreEmulator(db, `${8080}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}`, 443);
    }
    window.signOut = () => setCurrentUser(newAuth, null);
    newAuth.on("statechange", async () => {
        let user = await getCurrentUser();
        if (user) setLoginButtonsState(true, user.customAttributes.admin); else setLoginButtonsState(false, false);
        authStateChangedCallback(user);
    });
    refreshCurrentUser(newAuth);
    return {app, db, auth, newAuth};
}
