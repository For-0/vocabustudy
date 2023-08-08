<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div class="my-3">
            <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:text-3xl sm:tracking-tight dark:text-white">Saved Sets</h2>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
        </div>
        <div v-if="authStore.currentUser" class="my-3">
            <div class="mb-3">
                <h3 class="text-xl font-bold leading-7 text-zinc-900 sm:text-2xl sm:tracking-tight dark:text-white">Liked Sets:</h3>
                <p class="mt-1 text-zinc-500 dark:text-zinc-400">{{ authStore.currentUser?.email }}</p>
            </div>
            <SetPagination :sets="sets" :show-edit-controls="false" :creators="creators" :has-next-page="hasNextPage" :most-recent-timing="mostRecentTiming" :is-loading="isLoading" @load-more="loadMoreLikedSets" />
        </div>
        <div class="my-3">
            <div class="mb-3">
                <h3 class="text-xl font-bold leading-7 text-zinc-900 sm:text-2xl sm:tracking-tight dark:text-white">Offline Sets:</h3>
                <p class="mt-1 text-zinc-500 dark:text-zinc-400 italic">Coming soon!</p>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue';
import { useAuthStore, useCacheStore } from '../store';
import { VocabSet, QueryBuilder, Firestore } from '../firebase-rest-api/firestore';
import { showErrorToast } from '../utils';
import SetPagination from '../components/SetPagination.vue';
import { type UserProfile } from '../types';
const authStore = useAuthStore();
const cacheStore = useCacheStore();
const isLoading = ref(true);
const currentInstance = getCurrentInstance();
const hasNextPage = ref(true);
const mostRecentTiming = ref(0);
const sets = ref<VocabSet[]>([]);
const creators = ref<UserProfile[]>([]);

async function loadMoreLikedSets() {
    isLoading.value = true;
    if (authStore.currentUser && hasNextPage.value) {
        const query = new QueryBuilder()
            .select("uid")
            .from("social", true)
            .orderBy(["__name__"], "DESCENDING")
            .where("uid", "EQUAL", authStore.currentUser.uid)
            .where("like", "EQUAL", true)
            .limit(10);

        if (sets.value.length > 0) {
            const lastSet = sets.value[sets.value.length - 1];
            query.startAt([lastSet.likes, lastSet.pathParts.join("/")]);
        }
        try {
            const start = Date.now();
            const results = await Firestore.getDocuments(query.build(), authStore.currentUser.token.access);
            const setIds = results.map(el => el.pathParts[el.pathParts.length - 3]);
            const newSets = setIds.length < 1? [] :
                VocabSet.fromMultiple(await Firestore.getDocumentsForIds(VocabSet.collectionKey, setIds, ["name", "creationTime", "numTerms", "collections", "likes", "uid"], authStore.currentUser.token.access));
            mostRecentTiming.value= Date.now() - start;
            if (results.length < 10) {
                hasNextPage.value = false;
            }
            creators.value = [...creators.value, ...await cacheStore.getAllProfiles(newSets.map(set => set.uid))];
            sets.value = [...sets.value, ...newSets];
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isLoading.value = false;
}

void loadMoreLikedSets();
</script>