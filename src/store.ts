import { defineStore } from "pinia";
import { ref } from "vue";
import { type User, type UserProfile } from "./types";
import { deleteCurrentUser, getCurrentUser, refreshCurrentUser, signInWithEmailAndPassword, setCurrentUser, signInWithGoogleCredential, showGooglePopup, createUserWithEmailAndPassword, updateProfile, updatePassword } from "./firebase-rest-api/auth";
import { BroadcastChannel } from "broadcast-channel";
import type { VocabSet } from "./firebase-rest-api/firestore";

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

    function withBroadcast<T extends GenericFunction>(fn?: T): FunctionRequiringRefresh<T> {
        return async (...args: Parameters<T>) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = await fn?.(...args);
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
    void refreshCurrentUser(true).then(user => {
        if (currentUser.value && !user) return withBroadcast()();
    });

    return {
        currentUser,
        ...functionsWithRefresh,
        logout
    };
});

const unknownUser = { displayName: "Unknown User", photoUrl: "", roles: [] };

export const useCacheStore = defineStore("cache", () => {
    const userProfileCache = ref<Map<string, UserProfile>>(new Map());
    const mySetsCache = ref<VocabSet[]>([]);
    const mySetsState = ref({ hasNextPage: true, mostRecentTiming: 0, uid: null as string | null });

    async function getAllProfiles(uids: string[]) {
        const uniqueUids = [...new Set(uids)];

        const missingUids = uniqueUids.filter(uid => !userProfileCache.value.get(uid));

        await Promise.all(missingUids.map(async uid => {
            try {
                const res = await fetch(`${DD_URL}users/${uid}`);
                if (res.ok) {
                    const data = await res.json() as UserProfile;
                    userProfileCache.value.set(uid, data);
                }
            } catch { /* empty */ }
        }));

        return uids.map(uid => userProfileCache.value.get(uid) ?? unknownUser);
    }

    async function getProfile(uid: string) {
        const profile = userProfileCache.value.get(uid);
        if (profile) return profile;

        try {
            const res = await fetch(`${DD_URL}users/${uid}`);
            if (res.ok) {
                const data = await res.json() as UserProfile;
                userProfileCache.value.set(uid, data);
                return data;
            } else {
                return unknownUser;
            }
        } catch {
            return unknownUser;
        }
    }

    function addSets(sets: VocabSet[]) {
        mySetsCache.value = [...mySetsCache.value, ...sets];
    }

    function removeSet(setId: string) {
        mySetsCache.value = mySetsCache.value.filter(set => set.id !== setId);
    }

    function resetMySets() {
        mySetsCache.value = [];
        mySetsState.value = { hasNextPage: true, mostRecentTiming: 0, uid: null };
    }

    return {
        getAllProfiles,
        getProfile,
        userProfileCache,
        mySetsCache,
        mySetsState,
        addSets,
        resetMySets,
        removeSet
    };
});

export const usePreferencesStore = defineStore("prefs", () => {
    const validateTheme = (theme: string | null) => theme === "light" || theme === "dark" ? theme : "system";
    const parseLastSearch = (raw: string | null) => JSON.parse(raw ?? "null") as { search: string, collections: string[] } | null;

    const theme = ref<"light" | "dark" | "system">(validateTheme(localStorage.getItem("theme")));
    const lastSearch = ref(parseLastSearch(localStorage.getItem("previous_search")));

    window.addEventListener("storage", e => {
        if (e.key === "theme") {
            theme.value = validateTheme(e.newValue);
        } else if (e.key === "previous_search") {
            lastSearch.value = parseLastSearch(e.newValue);
        }
    });

    function setTheme(newTheme: "light" | "dark" | "system") {
        localStorage.setItem("theme", newTheme);
        theme.value = newTheme;
    }

    function setLastSearch(search: string, collections: string[]) {
        localStorage.setItem("previous_search", JSON.stringify({ search, collections }));
        lastSearch.value = { search, collections };
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
        stopNavigation,
        lastSearch,
        setLastSearch
    }
});
