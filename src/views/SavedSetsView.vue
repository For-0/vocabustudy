<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div class="my-3">
            <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:text-3xl sm:tracking-tight dark:text-white">Saved Sets</h2>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
        </div>
        <div v-if="preferencesStore.isOnline && authStore.currentUser" class="my-3">
            <div class="mb-3">
                <h3 class="text-xl font-bold leading-7 text-zinc-900 sm:text-2xl sm:tracking-tight dark:text-white">Liked Sets:</h3>
                <p class="mt-1 text-zinc-500 dark:text-zinc-400">{{ authStore.currentUser?.email }}</p>
            </div>
            <SetPagination :sets="sets" :show-edit-controls="false" :creators="creators" :has-next-page="hasNextPage" :most-recent-timing="mostRecentTiming" :is-loading="isLoading" @load-more="loadMoreLikedSets" />
        </div>
        <div class="my-3">
            <div class="mb-3">
                <h3 class="text-xl font-bold leading-7 text-zinc-900 sm:text-2xl sm:tracking-tight dark:text-white">Offline Sets:</h3>
            </div>
            <div class="flex flex-row gap-5 flex-wrap mb-5" v-bind="$attrs">
                <!-- @vue-skip -->
                <SetCard v-for="set in offlineSets" :key="set.id" :set="set" :show-edit-controls="false" />
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue';
import { useAuthStore, useCacheStore, usePreferencesStore } from '../store';
import { VocabSet, QueryBuilder, Firestore } from '../firebase-rest-api/firestore';
import { showErrorToast, getLocalDb } from '../utils';
import SetPagination from '../components/SetPagination.vue';
import { type UserProfile, type ViewerPartialSet } from '../types';
import SetCard from '../components/SetCard.vue';
const authStore = useAuthStore();
const cacheStore = useCacheStore();
const preferencesStore = usePreferencesStore();
const isLoading = ref(true);
const currentInstance = getCurrentInstance();
const hasNextPage = ref(true);
const mostRecentTiming = ref(0);
const sets = ref<VocabSet[]>([]);
const offlineSets = ref<(ViewerPartialSet & { id: string; numTerms: number })[]>([]);
const creators = ref<UserProfile[]>([]);

// @
async function loadMoreLikedSets() {
    isLoading.value = true;
    if (authStore.currentUser && hasNextPage.value) {
        const query = new QueryBuilder()
            .select("name", "creationTime", "numTerms", "collections", "likes", "uid")
            .from("sets")
            .orderBy(["creationTime", "__name__"], "DESCENDING")
            .where("visibility", "EQUAL", 2)
            .where("likes", "ARRAY_CONTAINS", authStore.currentUser.uid)
            .limit(10);

        if (sets.value.length > 0) {
            const lastSet = sets.value[sets.value.length - 1];
            query.startAt([lastSet.creationTime, lastSet.pathParts.join("/")]);
        }
        try {
            const start = Date.now();
            const results = VocabSet.fromMultiple(await Firestore.getDocuments(query.build(), authStore.currentUser.token.access));
            mostRecentTiming.value = Date.now() - start;
            if (results.length < 10) {
                hasNextPage.value = false;
            }
            creators.value = [...creators.value, ...await cacheStore.getAllProfiles(results.map(set => set.uid))];
            sets.value = [...sets.value, ...results];
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isLoading.value = false;
}

async function loadOfflineSets() {
    const db = await getLocalDb();
    let _offlineSets: typeof offlineSets.value = [];
    const tx = db.transaction("offline-sets", "readonly");
    let cursor = await tx.store.openCursor();
    while (cursor) {
        _offlineSets.push({ ...cursor.value, id: cursor.primaryKey, numTerms: cursor.value.terms.length });
        cursor = await cursor.continue();
    }
    offlineSets.value = _offlineSets;
}

if (preferencesStore.isOnline)
    void loadMoreLikedSets();

void loadOfflineSets();
</script>