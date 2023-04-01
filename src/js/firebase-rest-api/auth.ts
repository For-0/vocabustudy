import { apiKey, clientId } from "./project-config.json";
import { createElement, getLocalDb } from "../utils";
import { BroadcastChannel } from "broadcast-channel";
import type { User } from "../types";

declare global {
    interface Window {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        ___jsl: any;
        gapi: any;
        google?: any;
        /* eslint-enable */
        signOut: () => void;
    }
}

interface AuthEndpointConfig {
    emulatorUrl: string | null;
}

export class Auth implements AuthEndpointConfig {
    channel: BroadcastChannel;
    emulatorUrl: string | null = null;
    handlers: {eventName: "statechange", handler: () => void}[];
    constructor() {
        this.channel = new BroadcastChannel("auth-updates", {
            webWorkerSupport: false
        });
        this.handlers = [];
    }
    /**
     * Add an event listener on the Auth object
     * @param {"statechange"} eventName The name of the event to listen to
     */
    on(eventName: "statechange", handler: () => void) {
        this.handlers.push({eventName, handler});
        this.channel.addEventListener("message", async msg => {
            if (msg === eventName) handler();
        });
    }
    async broadcastEvent(eventName: "statechange") {
        this.handlers.forEach(el => el.eventName === eventName && el.handler());
        await this.channel.postMessage(eventName);
    }
}

const AuthPopup = {
    currentPopup: {
        window: null,
        promise: {
            resolve: () => {},
            reject: (_reason?: string) => {}
        }
    },
    cachedGapiPromise: null,
    clearPopupReference() {
        this.currentPopup = {
            window: null,
            promise: {
                resolve: () => {},
                reject: (_reason?: string) => {}
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
     * @returns the window object of the popup
     */
    openPopup(url: URL) {
        const options = {
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
        const optionsString = Object.entries(options).reduce((prev, [key, val]) => `${prev}${key}=${val}`, "");
        return this.currentPopup.window = open(url, generateEventId(), optionsString);
    },
    resetUnloadedGapiModules() {
        const b = window.___jsl;
        if (b?.H) {
            for (const hint of Object.keys(b.H)) {
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
                window.gapi.load("gapi.iframes", {
                    callback: () => resolve(window.gapi.iframes.getContext()),
                    ontimeout: () => {
                        AuthPopup.resetUnloadedGapiModules();
                        reject("NETWORK_REQUEST_FAILED");
                    },
                    timeout: 30000
                });
            }
            if (window.gapi?.iframes?.Iframe) resolve(window.gapi.iframes.getContext())
            else if (window.gapi?.load) loadIframe();
            else {
                const callbackName = `__iframefcb${Math.floor(Math.random() * 1000000)}`;
                window[callbackName] = () => {
                    if (window.gapi.load) loadIframe();
                    else reject("NETWORK_REQUEST_FAILED");
                };
                return new Promise((resolve, reject) => {
                    const scriptEl = createElement("script", [], {onload: resolve, onerror: () => reject("INTERNAL_ERROR"), type: "text/javascript", charset: "UTF-8"});
                    scriptEl.setAttribute("src", `https://apis.google.com/js/api.js?onload=${callbackName}`);
                    document.head.appendChild(scriptEl);
                }).catch(err => reject(err));
            }
        }).catch(err => {
            this.cachedGapiPromise = null;
            throw err;
        }));
    },
    async loadEmulatorIframe(auth: Auth) {
        const context = await this.loadGoogleApi();
        const iframeUrl = new URL(`${auth.emulatorUrl}/emulator/auth/iframe`);
        iframeUrl.searchParams.append("apiKey", apiKey);
        iframeUrl.searchParams.append("appName", "[DEFAULT]");
        iframeUrl.searchParams.append("eid", "p");
        const iframe = await context.open({ 
            where: document.body, 
            url: iframeUrl.href, 
            messageHandlersFilter: window.gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER, 
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
        // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-explicit-any
        }, (iframe: any) => new Promise(async (resolve, reject) => {
            await iframe.restyle({setHideOnLeave: false});
            const networkErrorTimer = setTimeout(() => reject("NETWORK_REQUEST_FAILED"), 5000);
            function clearTimerResolve() {
                clearTimeout(networkErrorTimer);
                resolve(iframe);
            }
            iframe.ping(clearTimerResolve).then(clearTimerResolve, () => reject("NETWORK_REQUEST_FAILED"));
        }));
        return iframe;
    }
}

const requestUri = `${location.protocol}//${location.hostname}`;

export function initializeAuth(authStateChangedCallback?: (user: User) => void) {
    const auth = new Auth();
    auth.on("statechange", async () => {
        const user = await getCurrentUser();
        document.querySelectorAll<HTMLElement>(".only-logged-in").forEach(el => el.hidden = !user);
        document.querySelectorAll<HTMLElement>(".only-logged-out").forEach(el => el.hidden = !!user);
        if (authStateChangedCallback) authStateChangedCallback(user);
    });
    if (process.env.NODE_ENV !== "production" && location.hostname === "localhost") auth.emulatorUrl = "http://localhost:9099";
    else if (process.env.CODESPACES) auth.emulatorUrl = `https://${process.env.CODESPACE_NAME}-9099.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/:443`;
    else if (process.env.GITPOD_WORKSPACE_URL) auth.emulatorUrl = `https://${9099}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}/:443`;
    else auth.emulatorUrl = null;
    window.signOut = () => setCurrentUser(auth, null);
    refreshCurrentUser(auth, true);
    return auth;
}

function generateEventId() {
    return Array(10).fill(null).map(() => Math.floor(Math.random() * 10)).join("");
}

/**
 * Extract the error from an API response and throw it if it exists
 * @param response The JSON response from the identity toolkit API
 * @throws {Error}
 * @returns response for chaining
 */
function throwResponseError(response: {error?: {errors: {domain: string, reason: string, message: string}[], code: number, message: string}}) {
    if (response.error) throw new Error(response.error.message);
    else return response;
}

async function authEndpointRequest([segment]: TemplateStringsArray | [string], body: object, auth: Auth, isRetry=false) {
    const res = await fetch(`${auth.emulatorUrl ?? "https:/"}/identitytoolkit.googleapis.com/v1/accounts${segment}?key=${apiKey}`, {
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    const resJson = await res.json();
    try {
        return throwResponseError(resJson);
    } catch (err) {
        if (err.message === "INVALID_ID_TOKEN" && !isRetry) {
            await refreshCurrentUser(auth);
            return authEndpointRequest([segment], body, auth, true);
        } else throw err;
    }
}

function parseAccountResponse(user: {
    localId: string,
    email: string,
    emailVerified: boolean,
    displayName: string,
    photoUrl: string,
    createdAt: string,
    lastLoginAt: string,
    customAttributes: string | null,
    providerUserInfo: { providerId: "password" | "google.com" }[]
}, { idToken, refreshToken, expiresIn } : { idToken: string, refreshToken: string, expiresIn: string | undefined }, expirationTime: number | null = null): User {
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
 */
export async function idTokenToUser(auth: Auth, {idToken, refreshToken, expiresIn}: {idToken: string, refreshToken: string, expiresIn?: string}, expirationTime: number | null =null) {
    const res = await authEndpointRequest`:lookup${{idToken}}${auth}`;
    const user = res.users[0];
    if (user) return parseAccountResponse(user, {idToken, refreshToken, expiresIn}, expirationTime);
    else return null;
}

/**
 * Get the currently signed in user, or null if there is no signed in user
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const db = await getLocalDb();
        const user = await db.get("general", "current-user");
        return user;
    } catch (err) {
        if (err.name === "InvalidStateError") return JSON.parse(localStorage.getItem("current-user") || "null");
        else throw err;
    }
}

export async function getUpToDateIdToken(auth: Auth) {
    const user = await refreshCurrentUser(auth);
    if (user) return user.token.access;
    else return null;
}

/** Refresh the auth token of the current user if needed. Sign them out if it's not possible */
export async function refreshCurrentUser(auth: Auth, force = false): Promise<User | null> {
    const currentUser = await getCurrentUser();
    let user: User | null = null;
    if (currentUser) {
        try {
            if (Date.now() >= currentUser.token.expirationTime) {
                const res = await fetch(`${auth.emulatorUrl ?? "https:/"}/securetoken.googleapis.com/v1/token?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        grant_type: "refresh_token",
                        refresh_token: currentUser.token.refresh
                    })
                });
                const { id_token: idToken, refresh_token: refreshToken, expires_in: expiresIn } = await res.json();
                user = await idTokenToUser(auth, { idToken, refreshToken, expiresIn });
            } else if (force)
                user = await idTokenToUser(auth, { idToken: currentUser.token.access, refreshToken: currentUser.token.refresh }, currentUser.token.expirationTime);
            else return currentUser;
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
    await setCurrentUser(auth, user, force);
    return user;
}

/**
 * Fetch a user using the accounts:lookup method
 */
async function fetchUser(auth: Auth, { idToken, refreshToken, expiresIn }: { idToken: string, refreshToken: string, expiresIn: string }) {
    const user = await idTokenToUser(auth, { idToken, refreshToken, expiresIn });
    await setCurrentUser(auth, user);
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
}

/**
 * Store the currently signed in user. Broadcasts a statechange event
 * @param user The currently signed in user or null if there is no signed in user
 */
export async function setCurrentUser(auth: Auth, user: User | null, forceUpdate = false) {
    const currentUser = await getCurrentUser();
    try {
        const db = await getLocalDb();
        await db.put("general", user, "current-user");
    } catch (err) {
        // catch mutation not allowed in firefox private:
        if (err.name === "InvalidStateError") localStorage.setItem("current-user", JSON.stringify(user)); // fallback to localStorage
        else throw err;
    }
    if (((currentUser === null) !== (user === null)) || forceUpdate) // if there was a change in the user state
        await auth.broadcastEvent("statechange");
}

export async function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<User> {
    const res = await authEndpointRequest`:signInWithPassword${{email, password, returnSecureToken: true}}${auth}`;
    return await fetchUser(auth, res);
}

export async function createUserWithEmailAndPassword(auth: Auth, email: string, password: string, displayName: string): Promise<User> {
    const res = await authEndpointRequest`:signUp${{email, password, returnSecureToken: true}}${auth}`;
    await authEndpointRequest`:update${{idToken: res.idToken, displayName}}${auth}`;
    return await fetchUser(auth, res);
}

/**
 * Sign in with a Google credential
 */
export async function signInWithGoogleCredential(auth: Auth, googleIdToken: string): Promise<User> {
    const res = await authEndpointRequest`:signInWithIdp${{postBody: `id_token=${googleIdToken}&providerId=google.com`, requestUri, returnSecureToken: true}}${auth}`;
    return await fetchUser(auth, res);
}

/**
 * Deletes the current user and signs them out
 */
export async function deleteCurrentUser(auth: Auth) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        await authEndpointRequest`:delete${{idToken: currentUser.token.access}}${auth}`;
        await setCurrentUser(auth, null);
    }
}

/**
 * Sends an email verification for the current user
 */
export async function sendEmailVerification(auth: Auth, currentUser: User) {
    return await authEndpointRequest`:sendOobCode${{idToken: currentUser.token.access, requestType: "VERIFY_EMAIL"}}${auth}`
}

/**
 * Send a password reset email to the given address 
 */
export async function sendPasswordResetEmail(auth: Auth, email: string) {
    return await authEndpointRequest`:sendOobCode${{requestType: "PASSWORD_RESET", email}}${auth}`;
}

/**
 * Update the current user's password
 */
export async function updatePassword(auth: Auth, password: string) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        const res = await authEndpointRequest`:update${{idToken: currentUser.token.access, password, returnSecureToken: true}}${auth}`;
        await fetchUser(auth, res);
    }
}

/**
 * Update a user's display name or profile picture
 */
export async function updateProfile(auth: Auth, updatedProfile: {displayName?: string, photoUrl?: string}) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        await authEndpointRequest`:update${{idToken: currentUser.token.access, returnSecureToken: true, ...updatedProfile}}${auth}`;
        await refreshCurrentUser(auth);
    }
}

function authEventUid(authEvent: {type: string, eventId: string, sessionId: string, tenantId: string}) {
    return [authEvent.type, authEvent.eventId, authEvent.sessionId, authEvent.tenantId].filter(a => a).join("-");
}
/**
 * Show a Sign In With Google popup (EMULATOR ONLY)
 * @param isReauth If the user is reauthenticating
 */
export async function showGooglePopup(auth: Auth, isReauth = false) {
    AuthPopup.rejectExistingPopup();
    const actionUrl = new URL(`${auth.emulatorUrl}/emulator/auth/handler`);
    actionUrl.searchParams.append("apiKey", apiKey);
    actionUrl.searchParams.append("appName", "[DEFAULT]");
    actionUrl.searchParams.append("authType", "signInViaPopup");
    actionUrl.searchParams.append("providerId", "google.com");
    actionUrl.searchParams.append("scopes", "profile");
    actionUrl.searchParams.append("eventId", generateEventId());
    actionUrl.searchParams.append("redirectUrl", location.href);
    if (isReauth) {
        const currentUser = await getCurrentUser();
        if (!currentUser) return;
        actionUrl.searchParams.set("authType", "reauthViaPopup");
        actionUrl.searchParams.set("customParameters", JSON.stringify({prompt: "consent", login_hint: currentUser.email}));
    }
    await new Promise((resolve, reject) => {
        const popupWindow = AuthPopup.openPopup(actionUrl);
        let pollId: number | null = null;
        const pollClosed = () => {
            if (popupWindow?.closed) {
                // wait for stuff to complete before rejection
                pollId = window.setTimeout(() => {
                    pollId = null;
                    reject(new Error("popup-closed"));
                }, 2000);
                return;
            }
            pollId = window.setTimeout(pollClosed, 3000);
        }
        pollClosed();
        const eventManager = {
            lastProcessed: Date.now(),
            cachedUids: new Set()
        }
        AuthPopup.loadEmulatorIframe(auth).then(iframe => {
            iframe.register("authEvent", iframeEvent => {
                if (Date.now() - eventManager.lastProcessed >= 10 * 60 * 1000) eventManager.cachedUids.clear();
                if (eventManager.cachedUids.has(authEventUid(iframeEvent.authEvent))) return { status: "ERROR" };
                else if (iframeEvent.authEvent.type === "unknown") return { status: "ACK" };
                else if (["signInViaPopup", "reauthViaPopup"].includes(iframeEvent.authEvent.type) && iframeEvent.authEvent.eventId === actionUrl.searchParams.get("eventId")) {
                    if (pollId) clearTimeout(pollId);
                    popupWindow?.close();
                    authEndpointRequest`:signInWithIdp${{requestUri: iframeEvent.authEvent.urlResponse, returnSecureToken: true}}${auth}`
                    .then((res: { idToken: string, refreshToken: string, expiresIn: string }) => fetchUser(auth, res))
                    .then((user: User) => resolve(user))
                    .catch((err: any) => reject(err)); // eslint-disable-line @typescript-eslint/no-explicit-any
                    return { status: "ACK" };
                }
                else return { status: "ERROR" };
            }, window.gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
        });
    });
}

export function renderGoogleButton(oneTapContainer, callback) {
    window.google.accounts.id.initialize({
        client_id: clientId,
        context: "signin",
        ux_mode: "popup",
        auto_select: true,
        callback
    });
    window.google.accounts.id.renderButton(oneTapContainer, {
        type: "standard",
        shape: "rectangular",
        theme: "outline",
        text: "continue_with",
        size: "large",
        logo_alignment: "left",
        width: 215
    });
}