import { defineStore } from "pinia";
import { ref } from "vue";
import { type User, type UserProfile } from "./types";
import { deleteCurrentUser, getCurrentUser, refreshCurrentUser, signInWithEmailAndPassword, setCurrentUser, signInWithGoogleCredential, showGooglePopup, createUserWithEmailAndPassword, updateProfile, updatePassword } from "./firebase-rest-api/auth";
import { BroadcastChannel } from "broadcast-channel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericFunction = (...args: any[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FunctionRequiringRefresh<T extends GenericFunction> = (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;

// TERMINOLOGY:
// reLOAD: load from indexeddb/localstorage
// reFRESH: refresh the auth token if it expired and make sure the user stille exists. requires a network request

export const useAuthStore = defineStore("auth", () => {
    const currentUser = ref<User | null>(null);

    /** reload from indexeddb/localstorage */
    async function reloadCurrentUser() {
        const user = await getCurrentUser();
        currentUser.value = user;
    }

    function withBroadcast<T extends GenericFunction>(fn: T): FunctionRequiringRefresh<T> {
        return async (...args: Parameters<T>) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = await fn(...args);
            await reloadCurrentUser();
            await broadcastUpdate();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return result;
        };
    }

    const functionsRequiringRefresh = {
        refreshCurrentUser,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signInWithGoogleCredential,
        showGooglePopup,
        updateProfile,
        updatePassword,
        deleteCurrentUser
    };

    // @ts-expect-error
    const functionsWithRefresh: { [K in keyof typeof functionsRequiringRefresh]: FunctionRequiringRefresh<(typeof functionsRequiringRefresh)[K]> } = {};

    for (const key of Object.keys(functionsRequiringRefresh)) {
        const original = functionsRequiringRefresh[key as keyof typeof functionsRequiringRefresh];
        functionsWithRefresh[key as keyof typeof functionsRequiringRefresh] = withBroadcast(original);
    }    

    async function logout() {
        await setCurrentUser(null);
        await reloadCurrentUser();
        await broadcastUpdate();
    }

    const channel = new BroadcastChannel("auth-updates", {
        webWorkerSupport: false
    });

    async function broadcastUpdate() {
        await channel.postMessage("statechange");
    }
    
    channel.addEventListener("message", async (msg: string) => {
        if (msg === "statechange") {
            await reloadCurrentUser();
        }
    });

    void reloadCurrentUser(); // this completes much faster than refreshCurrentUser, so we can use it to get the initial state while we wait for the refresh to complete
    void refreshCurrentUser(true);

    return {
        currentUser,
        ...functionsWithRefresh,
        logout
    };
});

export const useUserProfileCacheStore = defineStore("user-profile-cache", () => {
    const cache = ref<Map<string, UserProfile>>(new Map());

    async function getAll(uids: string[]) {
        const uniqueUids = [...new Set(uids)];

        const missingUids = uniqueUids.filter(uid => !cache.value.get(uid));

        await Promise.all(missingUids.map(async uid => {
            const res = await fetch(`${DD_URL}users/${uid}`);
            if (res.ok) {
                const data = await res.json() as UserProfile;
                cache.value.set(uid, data);
            }
        }));

        return uids.map(uid => cache.value.get(uid) ?? { displayName: "Unknown User", photoUrl: "", roles: [] });
    }

    return {
        getAll,
        cache
    };
});

export const usePreferencesStore = defineStore("prefs", () => {
    const validateTheme = (theme: string | null) => theme === "light" || theme === "dark" ? theme : "system";

    const theme = ref<"light" | "dark" | "system">(validateTheme(localStorage.getItem("theme")));

    window.addEventListener("storage", e => {
        if (e.key === "theme") {
            theme.value = validateTheme(e.newValue);
        }
    });

    function setTheme(newTheme: "light" | "dark" | "system") {
        localStorage.setItem("theme", newTheme);
        theme.value = newTheme;
    }

    const navigationStartedAt = ref(-1);

    function startNavigation() {
        navigationStartedAt.value = Date.now();
    }

    function stopNavigation() {
        navigationStartedAt.value = -1;
    }

    return {
        theme,
        setTheme,
        navigationStartedAt,
        startNavigation,
        stopNavigation
    }
});