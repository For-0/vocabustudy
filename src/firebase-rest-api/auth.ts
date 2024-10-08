import { apiKey, clientId } from "./project-config.json";
import { getLocalDb } from "../utils";
import type { User } from "../types";
import type { CredentialResponse } from "google-one-tap";

declare global {
    interface Window {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        ___jsl: any;
        gapi: any;
        /* eslint-enable */
        signOut: () => void;
    }
}

interface RawUserResponse {
    localId: string,
    email: string,
    emailVerified: boolean,
    displayName: string,
    photoUrl: string,
    createdAt: string,
    lastLoginAt: string,
    customAttributes: string | null,
    providerUserInfo: { providerId: "password" | "google.com" }[]
}

type GenericResponse = { idToken: string; refreshToken: string; expiresIn: string; } | { error: { errors: { domain: string, reason: string, message: string }[], code: number, message: string } };

export const errorMessages: Record<string, [string, number, "error" | "warning"]> = {
    EMAIL_NOT_FOUND: ["There is no user with that email address", 7000, "error"],
    INVALID_PASSWORD: ["Incorrect password", 5000, "error"],
    TOO_MANY_ATTEMPTS_TRY_LATER: ["Too many attempts! Please try again later", 7000, "warning"],
    USER_DISABLED: ["Your account has been disabled", 5000, "warning"],
    RESET_PASSWORD_EXCEED_LIMIT: ["Too many attempts! Please try again later", 7000, "warning"],
    UNAUTHORIZED_DOMAIN: ["Invalid domain", 5000, "warning"],
    "popup-closed": ["Popup closed", 5000, "warning"],
    EMAIL_EXISTS: ["An account with that email address already exists", 7000, "error"],
    WEAK_PASSWORD: ["Your password must be at least 6 characters", 5000, "warning"],
    NetworkError: ["Can't connect to the authentication server", 5000, "error"],
    EXPIRED_OOB_CODE: ["This link has expired!", 7000, "error"],
    INVALID_OOB_CODE: ["This link has expired or was already used!", 7000, "error"],
};

const AuthPopup = {
    currentPopup: {
        window: null as Window | null,
        promise: {
            resolve: () => {},
            reject: (_reason?: string) => {}
        }
    },
    cachedGapiPromise: null as Promise<unknown> | null,
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
    /* eslint-disable */ // this is just development emulation code and relies on a bunch of hidden APIs on the window which we don't know the types of
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
        return (this.cachedGapiPromise) ?? (this.cachedGapiPromise = new Promise((resolve, reject) => {
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
                (window[callbackName as keyof Window] as () => void) = () => {
                    if (window.gapi.load) loadIframe();
                    else reject("NETWORK_REQUEST_FAILED");
                };
                return new Promise((resolve, reject) => {
                    const scriptEl = document.createElement("script");
                    scriptEl.onload = resolve;
                    scriptEl.onerror = () => reject("INTERNAL_ERROR");
                    scriptEl.type = "text/javascript";
                    scriptEl.charset = "UTF-8";
                    scriptEl.setAttribute("src", `https://apis.google.com/js/api.js?onload=${callbackName}`);
                    document.head.appendChild(scriptEl);
                }).catch(err => reject(err));
            }
        }).catch(err => {
            this.cachedGapiPromise = null;
            throw err;
        }));
    },
    async loadEmulatorIframe() {
        const context = await this.loadGoogleApi();
        const iframeUrl = new URL(`${AUTH_EMULATOR_URL}/emulator/auth/iframe`);
        iframeUrl.searchParams.append("apiKey", apiKey);
        iframeUrl.searchParams.append("appName", "[DEFAULT]");
        iframeUrl.searchParams.append("eid", "p");
        //@ts-ignore
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
    /* eslint-enable */
}

const requestUri = `${location.protocol}//${location.hostname}`;

function generateEventId() {
    return Array(10).fill(null).map(() => Math.floor(Math.random() * 10)).join("");
}

/**
 * Extract the error from an API response and throw it if it exists
 * @param response The JSON response from the identity toolkit API
 * @throws {Error}
 * @returns response for chaining
 */
function throwResponseError(response: GenericResponse) {
    if ("error" in response) throw new Error(response.error.message);
    else return response;
}

async function authEndpointRequest([segment]: TemplateStringsArray | [string], body: object, isRetry=false) {
    const res = await fetch(`${AUTH_EMULATOR_URL ?? "https:/"}/identitytoolkit.googleapis.com/v1/accounts${segment}?key=${apiKey}`, {
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify(body)
    });
    const resJson = await res.json() as GenericResponse;
    try {
        return throwResponseError(resJson); // this is the response type for everything except accounts:lookup
    } catch (err) {
        if ((err as Error).message === "INVALID_ID_TOKEN" && !isRetry) {
            await refreshCurrentUser();
            return authEndpointRequest([segment], body, true);
        } else throw err;
    }
}

function parseAccountResponse(user: RawUserResponse, { idToken, refreshToken, expiresIn } : { idToken: string, refreshToken: string, expiresIn: string | undefined }, expirationTime: number | null = null): User {
    return {
        uid: user.localId,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        created: new Date(Number(user.createdAt)),
        lastLogin: new Date(Number(user.lastLoginAt)),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        customAttributes: JSON.parse(user.customAttributes || "{}") as Record<string, unknown>,
        providers: user.providerUserInfo.map(el => el.providerId),
        token: {
            access: idToken,
            refresh: refreshToken,
            expirationTime: expirationTime ?? (Date.now() + Number(expiresIn) * 1000) // expiresIn is a string in seconds like "3600" (one hour),
        }
    };
}

/**
 * Convert an ID token to a User object by calling `accounts:lookup`
 */
export async function idTokenToUser({idToken, refreshToken, expiresIn}: {idToken: string, refreshToken: string, expiresIn?: string}, expirationTime: number | null =null) {
    const res = await authEndpointRequest`:lookup${{idToken}}` as unknown as { users: (RawUserResponse | null)[] };
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
        return user ?? null;
    } catch (err) {
        if ((err as Error).name === "InvalidStateError") return JSON.parse(localStorage.getItem("current-user") ?? "null") as User | null;
        else throw err;
    }
}

export async function getUpToDateIdToken() {
    const user = await refreshCurrentUser();
    if (user) return user.token.access;
    else return null;
}

/** Refresh the auth token of the current user if needed. Sign them out if it's not possible */
export async function refreshCurrentUser(force = false): Promise<User | null> {
    const currentUser = await getCurrentUser();
    let user: User | null = null;
    if (currentUser) {
        try {
            // refresh the user if the token expired
            if (Date.now() >= currentUser.token.expirationTime) {
                const res = await fetch(`${AUTH_EMULATOR_URL ?? "https:/"}/securetoken.googleapis.com/v1/token?key=${apiKey}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        grant_type: "refresh_token",
                        refresh_token: currentUser.token.refresh
                    })
                });
                const { id_token: idToken, refresh_token: refreshToken, expires_in: expiresIn } = await res.json() as { id_token: string, refresh_token: string, expires_in: string };
                user = await idTokenToUser({ idToken, refreshToken, expiresIn });
            } else if (force) // if force is true, call accounts:lookup to check if something happened (they were deleted, disabled, etc.)
                user = await idTokenToUser({ idToken: currentUser.token.access, refreshToken: currentUser.token.refresh }, currentUser.token.expirationTime);
            else return currentUser;
        } catch (err) {
            switch((err as Error).message.split(" ")[0]) {
                case "TOKEN_EXPIRED":
                case "USER_DISABLED":
                case "USER_NOT_FOUND":
                case "NetworkError":
                    user = null;
                    break;
                default:
                    throw err;
            }
        }
    }
    await setCurrentUser(user);
    return user;
}

/**
 * Fetch a user using the accounts:lookup method
 */
async function fetchUser({ idToken, refreshToken, expiresIn }: { idToken: string, refreshToken: string, expiresIn: string }) {
    const user = await idTokenToUser({ idToken, refreshToken, expiresIn });
    await setCurrentUser(user);
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
}

/**
 * Store the currently signed in user. Broadcasts a statechange event
 * @param user The currently signed in user or null if there is no signed in user
 */
export async function setCurrentUser(user: User | null) {
    try {
        const db = await getLocalDb();
        await db.put("general", user, "current-user");
    } catch (err) {
        // catch mutation not allowed in firefox private:
        if ((err as Error).name === "InvalidStateError") localStorage.setItem("current-user", JSON.stringify(user)); // fallback to localStorage
        else throw err;
    }
    /*if (((currentUser === null) !== (user === null)) || forceUpdate) // if there was a change in the user state
        await auth.broadcastEvent("statechange");*/
}

export async function signInWithEmailAndPassword(email: string, password: string): Promise<User> {
    const res = await authEndpointRequest`:signInWithPassword${{email, password, returnSecureToken: true}}`;
    return await fetchUser(res);
}

export async function createUserWithEmailAndPassword(email: string, password: string, displayName: string): Promise<User> {
    const res = await authEndpointRequest`:signUp${{email, password, returnSecureToken: true}}`;
    await authEndpointRequest`:update${{idToken: res.idToken, displayName}}`;
    return await fetchUser(res);
}

/**
 * Sign in with a Google credential
 */
export async function signInWithGoogleCredential(googleIdToken: string): Promise<User> {
    const res = await authEndpointRequest`:signInWithIdp${{postBody: `id_token=${googleIdToken}&providerId=google.com`, requestUri, returnSecureToken: true}}`;
    return await fetchUser(res);
}

/**
 * Deletes the current user and signs them out
 */
export async function deleteCurrentUser() {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        await authEndpointRequest`:delete${{idToken: currentUser.token.access}}`;
        await setCurrentUser(null);
    }
}

/**
 * Sends an email verification for the current user
 */
export async function sendEmailVerification() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;
    await authEndpointRequest`:sendOobCode${{idToken: currentUser.token.access, requestType: "VERIFY_EMAIL"}}`
}

/**
 * Send a password reset email to the given address 
 */
export async function sendPasswordResetEmail(email: string) {
    return await authEndpointRequest`:sendOobCode${{requestType: "PASSWORD_RESET", email}}`;
}

/**
 * Update the current user's password
 */
export async function updatePassword(password: string) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        const res = await authEndpointRequest`:update${{idToken: currentUser.token.access, password, returnSecureToken: true}}`;
        await fetchUser(res);
    }
}

/**
 * Verify a user's email
 */
export async function verifyEmail(oobCode: string) {
    return await authEndpointRequest`:update${{oobCode}}` as unknown as { email: string };
}

/**
 * Reset a user's password
 */
export async function resetPassword(oobCode: string, newPassword: string | undefined) {
    return await authEndpointRequest`:resetPassword${{oobCode, newPassword}}` as unknown as { email: string };
}

/**
 * Update a user's display name or profile picture
 */
export async function updateProfile(updatedProfile: {displayName?: string, photoUrl?: string}) {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        await authEndpointRequest`:update${{idToken: currentUser.token.access, returnSecureToken: true, ...updatedProfile}}`;
        await refreshCurrentUser(true);
    }
}

function authEventUid(authEvent: {type: string, eventId: string, sessionId: string, tenantId: string}) {
    return [authEvent.type, authEvent.eventId, authEvent.sessionId, authEvent.tenantId].filter(a => a).join("-");
}
/**
 * Show a Sign In With Google popup (EMULATOR ONLY)
 * @param isReauth If the user is reauthenticating
 */
export async function showGooglePopup(isReauth = false) {
    AuthPopup.rejectExistingPopup();
    const actionUrl = new URL(`${AUTH_EMULATOR_URL!}/emulator/auth/handler`);
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
        void AuthPopup.loadEmulatorIframe().then(iframe => {
            // eslint-disable-next-line
            iframe.register("authEvent", (iframeEvent: { authEvent: { type: string, eventId: string, urlResponse: string, sessionId: string, tenantId: string } }) => {
                if (Date.now() - eventManager.lastProcessed >= 10 * 60 * 1000) eventManager.cachedUids.clear();
                if (eventManager.cachedUids.has(authEventUid(iframeEvent.authEvent))) return { status: "ERROR" };
                else if (iframeEvent.authEvent.type === "unknown") return { status: "ACK" };
                else if (["signInViaPopup", "reauthViaPopup"].includes(iframeEvent.authEvent.type)) {
                    if (iframeEvent.authEvent.eventId === actionUrl.searchParams.get("eventId")) {
                        if (pollId) clearTimeout(pollId);
                        popupWindow?.close();
                        authEndpointRequest`:signInWithIdp${{requestUri: iframeEvent.authEvent.urlResponse, returnSecureToken: true}}`
                        .then(res => fetchUser(res))
                        .then((user: User) => { resolve(user); })
                        .catch((err: any) => { reject(err); }); // eslint-disable-line
                    }
                    return { status: "ACK" };
                }
                else return { status: "ERROR" };
            }, window.gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER); // eslint-disable-line
        });
    });
}

export async function loadGoogleSignIn() {
    if ("google" in window && "accounts" in window.google) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    document.body.appendChild(script);
    await new Promise<void>(resolve => { script.addEventListener("load", () => { resolve() }); });
}

export function renderGoogleButton(oneTapContainer: HTMLElement, callback: (credentialResponse: CredentialResponse) => void) {
    window.google.accounts.id.initialize({
        client_id: clientId,
        context: "signin",
        ux_mode: "popup",
        auto_select: true,
        callback
    });
    window.google.accounts.id.renderButton(oneTapContainer, {
        type: "standard",
        shape: "pill",
        theme: "outline",
        text: "continue_with",
        size: "large",
        logo_alignment: "left",
        width: 215
    });
}