import { apiKey } from "./project-config.json";
import { createElement, getLocalDb } from "../utils.js";
import { BroadcastChannel } from "broadcast-channel";

/* global gapi */
window.getLocalDb = getLocalDb;
export class Auth {
    constructor() {
        this.channel = new BroadcastChannel("auth-updates", {
            webWorkerSupport: false
        });
        this.emulatorUrl = null;
        this.handlers = [];
    }
    /**
     * Add an event listener on the Auth object
     * @param {"statechange"} eventName The name of the event to listen to
     */
    on(eventName, handler) {
        this.handlers.push({eventName, handler});
        this.channel.addEventListener("message", msg => {
            if (msg === eventName) handler();
        });
    }
}

const AuthPopup = {
    currentPopup: {
        window: null,
        promise: {
            resolve: () => {},
            reject: () => {}
        }
    },
    cachedGapiPromise: null,
    clearPopupReference() {
        this.currentPopup = {
            window: null,
            promise: {
                resolve: () => {},
                reject: () => {}
            }
        };
    },
    rejectExistingPopup() {
        try { this.currentPopup.window?.close(); } catch { /* empty */ }
        this.currentPopup.promise.reject("EXPIRED_POPUP_REQUEST");
        this.clearPopupReference();
    },
    /**
     * Open a popup, preferably for an oauth signin
     * @param {Url} url 
     * @returns the window object of the popup
     */
    openPopup(url) {
        let options = {
            width: "500",
            height: "600",
            top: Math.max((window.screen.availHeight - 600) / 2, 0).toString(),
            left: Math.max((window.screen.availWidth - 500) / 2, 0).toString(),
            location: "yes",
            resizable: "yes",
            statusbar: "yes",
            toolbar: "no",
            scrollbars: "yes"
        };
        let optionsString = Object.entries(options).reduce((prev, [key, val]) => `${prev}${key}=${val}`, "");
        return this.currentPopup.window = open(url, generateEventId(), optionsString);
    },
    resetUnloadedGapiModules() {
        let b = window.___jsl;
        if (b?.H) {
            for (let hint of Object.keys(b.H)) {
                b.H[hint].r = b.H[hint].r || []; // trying to emulate what the AUth SDK does (packages/auth/src/platform_browser/iframe/gapi.ts)
                b.H[hint].L = b.H[hint].L || [];
                b.H[hint].r = [...b.H[hint].L];
                if (b.CP) {
                    for (let i = 0; i < b.CP.length; i++) b.CP[i] = null;
                }
            }
        }
    },
    async loadGoogleApi() {
        // I know copying google's code is bad practice and unmaintainable but THIS IS ONLY FOR THE EMULATOR! Not for production!
        return (this.cachedGapiPromise) || (this.cachedGapiPromise = new Promise((resolve, reject) => {
            function loadIframe() {
                // resets unloaded modules
                AuthPopup.resetUnloadedGapiModules();
                gapi.load("gapi.iframes", {
                    callback: () => resolve(gapi.iframes.getContext()),
                    ontimeout: () => {
                        AuthPopup.resetUnloadedGapiModules();
                        reject("NETWORK_REQUEST_FAILED");
                    },
                    timeout: 30000
                });
            }
            if (window.gapi?.iframes?.Iframe) resolve(gapi.iframes.getContext())
            else if (window.gapi?.load) loadIframe();
            else {
                let callbackName = `__iframefcb${Math.floor(Math.random() * 1000000)}`;
                window[callbackName] = () => {
                    if (gapi.load) loadIframe();
                    else reject("NETWORK_REQUEST_FAILED");
                };
                return new Promise((resolve, reject) => {
                    let scriptEl = createElement("script", [], {onload: resolve, onerror: () => reject("INTERNAL_ERROR"), type: "text/javascript", charset: "UTF-8"});
                    scriptEl.setAttribute("src", `https://apis.google.com/js/api.js?onload=${callbackName}`);
                    document.head.appendChild(scriptEl);
                }).catch(err => reject(err));
            }
        }).catch(err => {
            this.cachedGapiPromise = null;
            throw err;
        }));
    },
    async loadEmulatorIframe(auth) {
        let context = await this.loadGoogleApi();
        let iframeUrl = new URL(`${auth.emulatorUrl}/emulator/auth/iframe`);
        iframeUrl.searchParams.append("apiKey", apiKey);
        iframeUrl.searchParams.append("appName", "[DEFAULT]");
        iframeUrl.searchParams.append("eid", "p");
        let iframe = await context.open({ 
            where: document.body, 
            url: iframeUrl.href, 
            messageHandlersFilter: gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER, 
            attributes: {
                style: {
                    position: "absolute",
                    top: "-100px",
                    width: "1px",
                    height: "1px"
                },
                tabindex: "-1"
            },
            dontclear: true
        // eslint-disable-next-line no-async-promise-executor
        }, iframe => new Promise(async (resolve, reject) => {
            await iframe.restyle({setHideOnLeave: false});
            let networkErrorTimer = setTimeout(() => reject("NETWORK_REQUEST_FAILED"), 5000);
            function clearTimerResolve() {
                clearTimeout(networkErrorTimer);
                resolve(iframe);
            }
            iframe.ping(clearTimerResolve).then(clearTimerResolve, () => reject("NETWORK_REQUEST_FAILED"));
        }));
        return iframe;
    }
}

/**
 * A Firebase Auth user
 * @typedef {{created: Date, displayName: string, email: string, emailVerified: boolean, lastLogin: Date, photoUrl: string, token: {refresh: string, access: string, expirationTime: number}, uid: string, customAttributes: Object, providers: ("password"|"google")[]}} User
 */

const requestUri = `${location.protocol}//${location.hostname}`;

function generateEventId() {
    return Array(10).fill(null).map(() => Math.floor(Math.random() * 10)).join("");
}

/**
 * Extract the error from an API response and throw it if it exists
 * @param {{error?: {errors: {domain: string, reason: string, message: string}[], code: number, message: string}}} response The JSON response from the identity toolkit API
 * @throws {Error}
 * @returns response for chaining
 */
function throwResponseError(response) {
    if (response.error) throw new Error(response.error.message);
    else return response;
}

async function authEndpointRequest([segment], body, {emulatorUrl}, isRetry=false) {
    const res = await fetch(`${emulatorUrl ?? "https:/"}/identitytoolkit.googleapis.com/v1/accounts${segment}?key=${apiKey}`, {
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    let resJson = await res.json();
    try {
        return throwResponseError(resJson);
    } catch (err) {
        if (err.message === "INVALID_ID_TOKEN" && !isRetry) {
            await refreshCurrentUser();
            return authEndpointRequest([segment], body, {emulatorUrl}, true);
        } else throw err;
    }
}

function parseAccountResponse(user, {idToken, refreshToken, expiresIn}, expirationTime=null) {
    return {
        uid: user.localId,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        created: new Date(Number(user.createdAt)),
        lastLogin: new Date(Number(user.lastLoginAt)),
        customAttributes: JSON.parse(user.customAttributes || "{}"),
        providers: user.providerUserInfo.map(el => el.providerId),
        token: {
            access: idToken,
            refresh: refreshToken,
            expirationTime: expirationTime || (Date.now() + Number(expiresIn) * 1000) // expiresIn is a string in seconds like "3600" (one hour),
        }
    };
}

/**
 * Convert an ID token to a User object by calling `accounts:lookup`
 * @param {{idToken: string, refreshToken: string, expiresIn: string}} param0 
 * @returns {Promise<User>}
 */
export async function idTokenToUser(auth, {idToken, refreshToken, expiresIn}, expirationTime=null) {
    const res = await authEndpointRequest`:lookup${{idToken}}${auth}`;
    let user = res.users[0];
    if (user) return parseAccountResponse(user, {idToken, refreshToken, expiresIn}, expirationTime);
}

/**
 * Get the currently signed in user, or null if there is no signed in user
 * @returns {Promise<User | null>}
 */
export async function getCurrentUser() {
    let db = await getLocalDb();
    let user = await db.get("general", "current-user");
    return user;
}

export async function refreshCurrentUser(auth) {
    let currentUser = await getCurrentUser();
    let user = null;
    if (currentUser) {
        try {
            if (Date.now() >= currentUser.token.expirationTime) {
                let res = await fetch(`${auth.emulatorUrl ?? "https:/"}/securetoken.googleapis.com/v1/token?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        grant_type: "refresh_token",
                        refresh_token: currentUser.token.refresh
                    })
                });
                let { id_token: idToken, refresh_token: refreshToken, expires_in: expiresIn } = await res.json();
                user = await idTokenToUser(auth, { idToken, refreshToken, expiresIn });
            } else
                user = await idTokenToUser(auth, { idToken: currentUser.token.access, refreshToken: currentUser.token.refresh }, currentUser.token.expirationTime);
        } catch (err) {
            switch(err.message) {
                case "TOKEN_EXPIRED":
                case "USER_DISABLED":
                case "USER_NOT_FOUND":
                    user = null;
                    break;
                default:
                    throw err;
            }
        }
    }
    await setCurrentUser(auth, user);
}

/**
 * Fetch a user using the accounts:lookup method
 * @param {Auth} auth 
 * @param {{idToken: string, refreshToken: string, expiresIn: string}} param1 
 */
async function fetchUser(auth, { idToken, refreshToken, expiresIn }) {
    let user = await idTokenToUser(auth, { idToken, refreshToken, expiresIn });
    await setCurrentUser(auth, user);
    return user;
}

/**
 * Store the currently signed in user. Broadcasts a statechange event
 * @param {Auth} auth The auth instance
 * @param {User|null} user The currently signed in user or null if there is no signed in user
 */
export async function setCurrentUser(auth, user) {
    let db = await getLocalDb();
    await db.put("general", user, "current-user");
    await auth.channel.postMessage("statechange");
    auth.handlers.forEach(el => el.eventName === "statechange" && el.handler());
}

/**
 * @param {Auth} auth the auth instance
 * @param {string} email the email
 * @param {string} password the password
 * @returns {Promise<User>}
 */
export async function signInWithEmailAndPassword(auth, email, password) {
    let res = await authEndpointRequest`:signInWithPassword${{email, password, returnSecureToken: true}}${auth}`;
    return await fetchUser(auth, res);
}

/**
 * @param {Auth} auth the auth instance
 * @param {string} email the email
 * @param {string} password the password
 * @returns {Promise<User>}
 */
export async function createUserWithEmailAndPassword(auth, email, password) {
    let res = await authEndpointRequest`:signUp${{email, password, returnSecureToken: true}}${auth}`;
    return await fetchUser(auth, res);
}

/**
 * Sign in with a Google credential
 * @param {Auth} auth the auth instance
 * @param {string} googleIdToken the Google credential
 * @returns {Promise<User>}
 */
export async function signInWithGoogleCredential(auth, googleIdToken) {
    let res = await authEndpointRequest`:signInWithIdp${{postBody: `id_token=${googleIdToken}&providerId=google.com`, requestUri, returnSecureToken: true}}${auth}`;
    return await fetchUser(auth, res);
}

/**
 * Deletes the current user and signs them out
 * @param {Auth} auth the auth instance
 */
export async function deleteCurrentUser(auth) {
    let currentUser = await getCurrentUser();
    await setCurrentUser(auth, null);
    if (currentUser)
        return await authEndpointRequest`:delete${{idToken: currentUser.token.access}}${auth}`;
}

/**
 * Sends an email verification for the current user
 * @param {User} currentUser the user to send it for
 */
export async function sendEmailVerification(auth, currentUser) {
    return await authEndpointRequest`:sendOobCode${{idToken: currentUser.token.access, requestType: "VERIFY_EMAIL"}}${auth}`
}

/**
 * Send a password reset email to the given address
 * @param {string} email 
 */
export async function sendPasswordResetEmail(auth, email) {
    return await authEndpointRequest`:sendOobCode${{requestType: "PASSWORD_RESET", email}}${auth}`;
}

/**
 * Update the current user's password
 * @param {string} password
 */
export async function updatePassword(auth, password) {
    let currentUser = await getCurrentUser();
    if (currentUser) {
        let res = await authEndpointRequest`:update${{idToken: currentUser.token.access, password, returnSecureToken: true}}${auth}`;
        await refreshCurrentUser(auth);
        return res;
    }
}

/**
 * Update a user's display name or profile picture
 * @param {{displayName: string?, photoUrl: string?}} updatedProfile 
 */
export async function updateProfile(auth, updatedProfile) {
    let currentUser = await getCurrentUser();
    if (currentUser) {
        let res = await authEndpointRequest`:update${{idToken: currentUser.token.access, returnSecureToken: true, ...updatedProfile}}${auth}`;
        await refreshCurrentUser(auth);
        return res;
    }
}

function authEventUid(authEvent) {
    return [authEvent.type, authEvent.eventId, authEvent.sessionId, authEvent.tenantId].filter(a => a).join("-");
}
/**
 * Show a Sign In With Google popup (EMULATOR ONLY)
 * @param {Auth} auth 
 * @param {boolean} isReauth If the user is reauthenticating
 */
export async function showGooglePopup(auth, isReauth=false) {
    AuthPopup.rejectExistingPopup();
    let actionUrl = new URL(`${auth.emulatorUrl}/emulator/auth/handler`);
    actionUrl.searchParams.append("apiKey", apiKey);
    actionUrl.searchParams.append("appName", "[DEFAULT]");
    actionUrl.searchParams.append("authType", "signInViaPopup");
    actionUrl.searchParams.append("providerId", "google.com");
    actionUrl.searchParams.append("scopes", "profile");
    actionUrl.searchParams.append("eventId", generateEventId());
    actionUrl.searchParams.append("redirectUrl", location.href);
    if (isReauth) {
        let currentUser = await getCurrentUser();
        if (!currentUser) return;
        actionUrl.searchParams.set("authType", "reauthViaPopup");
        actionUrl.searchParams.set("customParameters", JSON.stringify({prompt: "consent", login_hint: currentUser.email}));
    }
    let popupWindow = AuthPopup.openPopup(actionUrl);
    let pollId; // TODO: decode firebase auth to find out how they do it
    const pollClosed = () => {
        if (popupWindow.closed) {
            // wait for stuff to complete before rejection
            pollId = window.setTimeout(() => {
                pollId = null;
                throw new Error("popup-closed");
            }, 2000);
            return;
        }
        pollId = window.setTimeout(pollClosed, 3000);
    }
    pollClosed();
    let eventManager = {
        lastProcessed: Date.now(),
        cachedUids: new Set()
    }
    let iframe = await AuthPopup.loadEmulatorIframe(auth);
    await new Promise((resolve, reject) => {
        iframe.register("authEvent", iframeEvent => {
            if (Date.now() - eventManager.lastProcessed >= 10 * 60 * 1000) eventManager.cachedUids.clear();
            if (eventManager.cachedUids.has(authEventUid(iframeEvent.authEvent))) return { status: "ERROR" };
            else if (iframeEvent.authEvent.type === "unknown") return { status: "ACK" };
            else if (["signInViaPopup", "reauthViaPopup"].includes(iframeEvent.authEvent.type) && iframeEvent.authEvent.eventId === actionUrl.searchParams.get("eventId")) {
                clearTimeout(pollId);
                popupWindow.close();
                authEndpointRequest`:signInWithIdp${{requestUri: iframeEvent.authEvent.urlResponse, returnSecureToken: true}}${auth}`
                .then(res => fetchUser(auth, res))
                .then(user => resolve(user))
                .catch(err => reject(err));
                return { status: "ACK" };
            }
            else return { status: "ERROR" };
        }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
    });
}