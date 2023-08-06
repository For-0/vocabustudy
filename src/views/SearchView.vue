<template>
    <main class="bg-white dark:bg-zinc-900 grow p-3">
        <div>
            <h1 class="text-gray-900 dark:text-white text-3xl font-bold text-center">Search Sets</h1>   
            <form class="lg:max-w-2xl mx-auto justify-center" @submit.prevent="search">   
                <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                    </div>
                    <input id="default-search" type="search" class="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary dark:focus:border-primary" placeholder="Try &quot;50 States&quot;..." v-model="searchQuery">
                    <button :disabled="isLoading" type="submit" class="flex items-center text-white absolute right-2.5 bottom-2.5 bg-primary hover:bg-primaryalt focus:ring-4 focus:outline-none focus:ring-zinc-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-primaryalt dark:hover:bg-primary dark:focus:ring-white">
                        Search
                        <Loader v-if="isLoading" class="h-3 w-3 ml-2" :size="1" />
                    </button>
                </div>
                <p class="text-zinc-600 dark:text-zinc-400 text-sm mt-3">
                    <button type="button" v-if="selectedCollections.length === 0" class="underline font-medium hover:text-zinc-700 dark:hover:text-zinc-300" @click="showCollectionsModal = true">Filter by collections...</button>
                    <template v-else>
                        <span class="font-medium">{{ selectedCollections.length }}</span> collections selected.
                        <button type="button" class="underline font-medium hover:text-zinc-700 dark:hover:text-zinc-300" @click="showCollectionsModal = true">Modify selection...</button>
                    </template>
                </p>
            </form>
        </div>
        <div class="mt-3 flex flex-col items-center">
            <SetPagination :sets="sets" :creators="creators" :show-edit-controls="false" :has-next-page="hasNextPage" :most-recent-timing="mostRecentTiming" @load-more="loadMore" />
        </div>
        <div v-if="showCollectionsModal" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30" />
        <div v-show="showCollectionsModal" tabindex="-1" aria-hidden="true" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-xl h-full">
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800 h-full">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="showCollectionsModal = false">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="px-6 py-6 lg:px-8 max-h-full flex flex-col">
                        <h3 class="mb-3 text-xl font-medium text-zinc-900 dark:text-white">Select Collections</h3>
                        <p class="text-zinc-500 dark:text-zinc-400 mb-2">
                            You may select up to 10 different collections.
                            <button @click="selectedCollections = []" class="underline hover:text-zinc-600 dark:hover:text-zinc-300 font-medium" type="button">Clear selection</button>
                        </p>
                        <CollectionsSelection v-model="selectedCollections" class="custom-scrollbar is-thumb-only overflow-y-scroll p-1" />
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue';
import CollectionsSelection from '../components/CollectionsSelection.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import SetPagination from '../components/SetPagination.vue';
import { Firestore, QueryBuilder, VocabSet } from '../firebase-rest-api/firestore';
import { type StructuredQuery, type UserProfile } from '../types';
import { showErrorToast, getWords } from '../utils';
import Loader from '../components/Loader.vue';
import { useCacheStore } from '../store';

const selectedCollections = ref<string[]>([]);
const showCollectionsModal = ref(false);
const isLoading = ref(false);
const mostRecentTiming = ref(0);
const hasNextPage = ref(true);
const searchQuery = ref("");
const sets = ref<VocabSet[]>([]);
const creators = ref<UserProfile[]>([]);
const currentInstance = getCurrentInstance();
const cacheStore = useCacheStore();
let queries: StructuredQuery[] = [];
let lastSets: [VocabSet | null, VocabSet | null] = [null, null];
let cachedRawQuery: [string[], string[]] = [[], []];

const baseQuery = new QueryBuilder()
    .select("name", "numTerms", "collections", "likes", "uid", "nameWords", "creationTime")
    .where("visibility", "EQUAL", 2)
    .orderBy(["likes", "__name__"], "DESCENDING")
    .from(VocabSet.collectionKey)
    .limit(10)
    .build();

async function search() {
    if (isLoading.value) return;
    hasNextPage.value = true;
    sets.value = [];
    creators.value = [];
    mostRecentTiming.value = 0;
    queries = [];
    const words = getWords(searchQuery.value).slice(0, 10);
    cachedRawQuery = [words, selectedCollections.value];
    lastSets = [null, null];
    if (words.length > 0)
        queries.push(new QueryBuilder(JSON.parse(JSON.stringify(baseQuery))).where("nameWords", "ARRAY_CONTAINS_ANY", words).build());

    if (selectedCollections.value.length > 0)
        queries.push(new QueryBuilder(JSON.parse(JSON.stringify(baseQuery))).where("collections", "ARRAY_CONTAINS_ANY", selectedCollections.value).build());

    await loadMore();
}

async function loadMore() {
    isLoading.value = true;
    if (hasNextPage && queries.length > 0) {
        const newQueries = queries.map((query, i) => {
            const copiedQuery = new QueryBuilder(JSON.parse(JSON.stringify(query)));
            const lastSet = lastSets[i];
            if (lastSet) {
                copiedQuery.startAt([lastSet.likes, lastSet.pathParts.join("/")]);
            }
            return copiedQuery.build();
        });
        try {
            const start = Date.now();
            // remove duplicates and sort by relevance
            const results = (await Promise.all(newQueries.map(query => Firestore.getDocuments(query)))).flatMap((docs, i) => {
                const sets = VocabSet.fromMultiple(docs);
                // set the last set for this specific query so pagination will work later on
                lastSets[i] = sets[sets.length - 1];
                return sets;
            }).filter((val, index, self) => index === self.findIndex(t => t.id === val.id)).map(doc => {
                let relevance = 1;
                // if it doesn't match any of the words, relevance becomes 0
                if (cachedRawQuery[0].length > 0) relevance *= cachedRawQuery[0].filter(val => doc.nameWords.includes(val)).length / cachedRawQuery[0].length;
                // same for collections
                if (cachedRawQuery[1].length > 0) relevance *= cachedRawQuery[1].filter(val => doc.collections.includes(val)).length / cachedRawQuery[1].length;

                return { doc, relevance };
            }).filter(el => el.relevance);
            
            results.sort((a, b) => b.relevance - a.relevance);
            mostRecentTiming.value = Date.now() - start;
            if (results.length < 10) {
                hasNextPage.value = false;
            }
            creators.value = [...creators.value, ...await cacheStore.getAllProfiles(results.map(el => el.doc.uid))];
            sets.value = [...sets.value, ...results.map(el => el.doc)];
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isLoading.value = false;
}
</script>