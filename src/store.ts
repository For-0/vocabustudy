import { defineStore } from "pinia";
import { ref } from "vue";
import { type User, type UserProfile } from "./types";
import { getCurrentUser, refreshCurrentUser } from "./firebase-rest-api/auth";
import { BroadcastChannel } from "broadcast-channel";

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

    /** refresh the auth token if needed */
    async function refreshUser(force = false) {
        await refreshCurrentUser(force);
        await reloadCurrentUser();
        broadcastUpdate();
    }

    const channel = new BroadcastChannel("auth-updates", {
        webWorkerSupport: false
    });

    function broadcastUpdate() {
        channel.postMessage("statechange");
    }
    
    channel.addEventListener("message", async (msg: string) => {
        if (msg === "statechange") {
            await reloadCurrentUser();
        }
    });

    reloadCurrentUser(); // this completes much faster than refreshCurrentUser, so we can use it to get the initial state while we wait for the refresh to complete
    refreshCurrentUser(true);

    return {
        currentUser,
        refreshCurrentUser: refreshUser
    };
});

export const useUserProfileCacheStore = defineStore("user-profile-cache", () => {
    const cache = ref<{ [key: string]: UserProfile }>({});

    async function getAll(uids: string[]) {
        const uniqueUids = [...new Set(uids)];

        const missingUids = uniqueUids.filter(uid => !cache.value[uid]);

        await Promise.all(missingUids.map(async uid => {
            const res = await fetch(`${DD_URL}users/${uid}`);
            if (res.ok) {
                const data = await res.json();
                cache.value[uid] = data;
            }
        }));

        return uids.map(uid => cache.value[uid] || { displayName: "Unknown User", photoUrl: "", roles: [] });
    }

    return {
        getAll,
    };
});