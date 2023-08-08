<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div class="my-3">
            <div class="lg:flex lg:items-center lg:justify-between">
                <div class="min-w-0 flex-1">
                    <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">My Sets</h2>
                    <p class="mt-1 text-zinc-500 dark:text-zinc-400">{{ authStore.currentUser?.email }}</p>
                </div>
                <div class="mt-5 flex lg:ml-4 lg:mt-0">
                    <router-link to="/set/new/" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700 inline-flex items-center">
                        Create Set
                        <PlusCircleIcon class="w-4 h-4 ml-1" />
                    </router-link>
                </div>
            </div>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
            <SetPagination :sets="cacheStore.mySetsCache" :show-edit-controls="true" v-bind="cacheStore.mySetsState" :is-loading="isLoading" @delete-set="deletingSet = $event" @load-more="loadNext" />
        </div>
        
        <div v-if="deletingSet" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30" />
        <div v-show="deletingSet" tabindex="-1" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="closeModals">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="p-6 text-center">
                        <ExclamationCircleIcon class="mx-auto mb-4 text-zinc-400 w-12 h-12 dark:text-zinc-200 stroke-2" />
                        <h3 class="mb-5 text-lg font-normal text-zinc-500 dark:text-zinc-400">
                            <span class="font-bold">Are you sure you want to delete this set?</span>
                        </h3>
                        <button type="button" class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2" @click="deleteSet">
                            Yes, I'm sure
                        </button>
                        <button type="button" class="text-zinc-500 bg-white hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 rounded-lg border border-zinc-200 text-sm font-medium px-5 py-2.5 hover:text-zinc-900 focus:z-10 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-500 dark:hover:text-white dark:hover:bg-zinc-600 dark:focus:ring-zinc-600" @click="closeModals">No, cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { XMarkIcon, ExclamationCircleIcon, PlusCircleIcon } from '@heroicons/vue/24/outline';
import { ref, getCurrentInstance } from 'vue';
import { useAuthStore, useCacheStore } from '../store';
import { useRouter, useRoute } from 'vue-router';
import { VocabSet, QueryBuilder, Firestore } from '../firebase-rest-api/firestore';
import { showErrorToast } from '../utils';
import SetPagination from '../components/SetPagination.vue';
const deletingSet = ref<string | null>(null);
const authStore = useAuthStore();
const cacheStore = useCacheStore();
const router = useRouter();
const route = useRoute();
const isLoading = ref(true);
const currentInstance = getCurrentInstance();

function handleState(state: (typeof authStore)["$state"]) {
    if (state.currentUser === null) {
        void router.push({ name: 'login', params: { next: route.fullPath } });
        return false;
    }
    if (cacheStore.mySetsState.uid && cacheStore.mySetsState.uid !== authStore.currentUser?.uid) {
        cacheStore.resetMySets();
    }
    return true;
}

function closeModals() {
    deletingSet.value = null;
}

async function deleteSet() {
    if (deletingSet.value && authStore.currentUser) {
        try {
            await fetch(`${WORKERS_ENDPOINT}delete-set/`, {
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authStore.currentUser.token.access}`
                },
                method: "POST",
                body: JSON.stringify({ id: deletingSet.value })
            });
            cacheStore.removeSet(deletingSet.value);
            closeModals();
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
}

authStore.$subscribe((_, state) => { handleState(state) });

async function loadNext() {
    isLoading.value = true;
    if (authStore.currentUser && cacheStore.mySetsState.hasNextPage) {
        const query = new QueryBuilder()
            .select("collections", "likes", "visibility", "name", "numTerms", "creationTime")
            .orderBy(["likes", "__name__"], "DESCENDING")
            .where("uid", "EQUAL", authStore.currentUser.uid)
            .from(VocabSet.collectionKey)
            .limit(10);

        if (cacheStore.mySetsCache.length > 0) {
            const lastSet = cacheStore.mySetsCache[cacheStore.mySetsCache.length - 1];
            query.startAt([lastSet.likes, lastSet.pathParts.join("/")]);
        }
        try {
            const start = Date.now();
            const results = VocabSet.fromMultiple(await Firestore.getDocuments(query.build(), authStore.currentUser.token.access));
            cacheStore.mySetsState.mostRecentTiming = Date.now() - start;
            if (results.length < 10) {
                cacheStore.mySetsState.hasNextPage = false;
            }
            cacheStore.addSets(results);
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
        cacheStore.mySetsState.uid = authStore.currentUser.uid;
    }
    isLoading.value = false;
}

if (handleState(authStore)) {
    void loadNext();
}
</script>