<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div class="my-3">
            <div class="lg:flex lg:items-center lg:justify-between">
                <div class="min-w-0 flex-1">
                    <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">My Collections</h2>
                    <p class="mt-1 text-zinc-500 dark:text-zinc-400">{{ authStore.currentUser?.email }}</p>
                </div>
                <div class="mt-5 flex lg:ml-4 lg:mt-0">
                    <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700 inline-flex items-center">
                        Create Collection
                        <PlusCircleIcon class="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
            <div class="flex flex-row gap-5 flex-wrap mb-5 w-full">
                <div
                    v-for="collection, i in collections" :key="collection.id"
                    class="max-w-sm flex flex-col items-start p-6 bg-white border border-zinc-200 rounded-lg shadow dark:bg-zinc-800 dark:border-zinc-700 transition-transform duration-300"
                >
                    <form v-if="editingCollection && editingCollection?.id === collection.id" @submit.prevent="saveCollection">
                        <input
                            v-model="editingCollection.name" type="text" required placeholder="Name"
                            class="block cursor-pointer font-bold tracking-tight bg-transparent text-2xl hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-100 text-zinc-900 rounded focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2.5 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700 dark:border-zinc-700 dark:placeholder-zinc-400 dark:text-white mb-3"
                        >
                        <span class="bg-blue-100 text-blue-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-blue-800/25 dark:text-blue-300 border border-blue-300 mb-3">
                            <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                            {{ pluralizeWord("set", editingCollection.sets.length) }}
                        </span>
                        <div v-for="_set, j in editingCollection.sets" :key="j" class="relative mb-2">
                            <input
                                v-model="editingCollection.sets[j]" type="text" required placeholder="Set ID or URL"
                                :pattern="setIdRe.source"
                                class="w-full cursor-pointer bg-transparent hover:bg-zinc-100 focus:bg-zinc-100 border border-zinc-100 text-zinc-900 rounded focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700 dark:border-zinc-700 dark:placeholder-zinc-400 dark:text-white"
                            >
                            <button class="text-zinc-400 bg-transparent hover:text-rose-500 absolute right-3 top-1/2 -translate-y-1/2 rounded-lg text-sm inline-flex items-center dark:text-zinc-600 dark:hover:text-rose-500" type="button" @click="editingCollection.sets.splice(j, 1)">
                                <XCircleIcon class="w-4 h-4" />
                            </button>
                        </div>
                        <div class="flex flex-row flex-wrap gap-2 mt-auto">
                            <button type="button" class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50" @click="editingCollection.sets.push('')">
                                Add Set
                                <PlusCircleIcon class="w-3.5 h-3.5 ml-2" />
                            </button>
                            <button
                                type="button"
                                class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center border text-yellow-800 border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800 hover:text-yellow-900 hover:bg-yellow-100 hover:border-yellow-400 dark:hover:bg-yellow-900 dark:hover:border-yellow-700 dark:hover:text-yellow-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-yellow-200 dark:focus:ring-yellow-700" 
                                @click="editingCollection = null"
                            >
                                Cancel
                                <XCircleIcon class="w-3.5 h-3.5 ml-2" />
                            </button>
                            <button class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center border text-emerald-800 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 hover:text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 dark:hover:bg-emerald-900 dark:hover:border-emerald-700 dark:hover:text-emerald-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-emerald-200 dark:focus:emerald-red-700">
                                Save
                                <CheckCircleIcon class="w-3.5 h-3.5 ml-2" />
                            </button>
                        </div>
                    </form>
                    <template v-else>
                        <router-link :to="{ name: 'custom-collection-detail', params: { id: collection.id } }" class="max-w-full">
                            <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate" :title="collection.name">{{ collection.name }}</h3>
                        </router-link>
                        <div class="text-sm text-zinc-500 dark:text-zinc-400 mb-3" :title="collection.createTime.toLocaleString()">
                            Created {{ humanizeDate(collection.createTime) }}
                        </div>
                        <span class="bg-blue-100 text-blue-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-blue-800/25 dark:text-blue-300 border border-blue-300 mb-3">
                            <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                            {{ pluralizeWord("set", collection.sets.length) }}
                        </span>
                        <div class="flex flex-row flex-wrap gap-2 mt-auto">
                            <router-link :to="{ name: 'custom-collection-detail', params: { id: collection.id } }" class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50">
                                View
                                <ArrowRightIcon class="w-3.5 h-3.5 ml-2" />
                            </router-link>
                            <button
                                type="button"
                                class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center border text-yellow-800 border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800 hover:text-yellow-900 hover:bg-yellow-100 hover:border-yellow-400 dark:hover:bg-yellow-900 dark:hover:border-yellow-700 dark:hover:text-yellow-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-yellow-200 dark:focus:ring-yellow-700" 
                                @click="editCollection(i)"
                            >
                                Edit
                                <PencilSquareIcon class="w-3.5 h-3.5 ml-2" />
                            </button>
                            <button type="button" class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center border text-rose-800 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 hover:text-rose-900 hover:bg-rose-100 hover:border-rose-400 dark:hover:bg-rose-900 dark:hover:border-rose-700 dark:hover:text-rose-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-red-200 dark:focus:ring-red-700" @click="deletingCollection = collection.id">
                                Delete
                                <TrashIcon class="w-3.5 h-3.5 ml-2" />
                            </button>
                        </div>
                    </template>
                </div>
            </div>
            <p v-if="isLoading" class="flex items-center text-zinc-600 dark:text-zinc-300 mb-3 text-lg">
                <Loader :size="2" class="w-6 h-6 mr-2" />
                Loading...
            </p>
            <div v-if="collections.length > 0" class="text-zinc-500 dark:text-zinc-400">
                Loaded <span class="font-bold">{{ collections.length }}</span> collections. ({{ mostRecentTiming }} ms)
            </div>
        </div>
        
        <div v-if="deletingCollection" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30" />
        <div v-show="deletingCollection" tabindex="-1" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="closeModals">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="p-6 text-center">
                        <ExclamationCircleIcon class="mx-auto mb-4 text-zinc-400 w-12 h-12 dark:text-zinc-200 stroke-2" />
                        <h3 class="mb-5 text-lg font-normal text-zinc-500 dark:text-zinc-400">
                            <span class="font-bold">Are you sure you want to delete this collection?</span>
                        </h3>
                        <button type="button" class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2" @click="deleteCollection">
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
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline';
import { ArrowRightIcon, PencilSquareIcon, TrashIcon, QueueListIcon, XCircleIcon, CheckCircleIcon, PlusCircleIcon } from '@heroicons/vue/20/solid';
import { ref, getCurrentInstance } from 'vue';
import { useAuthStore } from '../store';
import { useRouter, useRoute } from 'vue-router';
import { QueryBuilder, Firestore, CustomCollection } from '../firebase-rest-api/firestore';
import { humanizeDate, showErrorToast, pluralizeWord } from '../utils';
import Loader from "../components/Loader.vue";

type PartialCollection = Pick<CustomCollection, "name" | "id" | "sets" | "createTime" | "pathParts" | "updateTime" | "uid">;

const deletingCollection = ref<string | null>(null);
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const isLoading = ref(true);
const currentInstance = getCurrentInstance();
const collections = ref<PartialCollection[]>([]);
const editingCollection = ref<{ id: string, sets: string[], name: string } | null>(null);
const mostRecentTiming = ref(0);
const setIdRe = /(?:(?:https?:\/\/)?vocabustudy.org\/set\/)?([A-Za-z0-9]{20})(?:(?:\/view)?\/?)?/;

function handleState(state: (typeof authStore)["$state"]) {
    if (state.currentUser === null) {
        void router.push({ name: 'login', params: { next: route.fullPath } });
        return false;
    }
    return true;
}

function closeModals() {
    deletingCollection.value = null;
}

function editCollection(index: number) {
    const collection = collections.value[index];

    editingCollection.value = {
        id: collection.id,
        name: collection.name,
        sets: [...collection.sets]
    };
}

async function deleteCollection() {
    if (deletingCollection.value && authStore.currentUser) {
        try {
            await Firestore.deleteDocument(CustomCollection.collectionKey, deletingCollection.value, authStore.currentUser.token.access);
            collections.value = collections.value.filter(({ id }) => id !== deletingCollection.value);
            closeModals();
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
}

async function saveCollection() {
    if (!editingCollection.value || !authStore.currentUser) return;
    const normalizedSets = editingCollection.value.sets.map(set => set.match(setIdRe)![1]);
    const newCollectionData = {
        name: editingCollection.value.name,
        sets: normalizedSets
    };
    try {
        await Firestore.updateDocument(
            CustomCollection.collectionKey, editingCollection.value.id,
            newCollectionData,
            authStore.currentUser.token.access,
            ["name", "sets"]
        );

        collections.value = collections.value.map(collection => collection.id === editingCollection.value!.id ? new CustomCollection({ ...collection, ...newCollectionData }) : collection);
        editingCollection.value = null;
    } catch (err) {
        showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
    }
}

authStore.$subscribe((_, state) => { handleState(state) });

async function loadCollections() {
    isLoading.value = true;
    if (authStore.currentUser) {
        const query = new QueryBuilder()
            .select("name", "sets")
            .where("uid", "EQUAL", authStore.currentUser.uid)
            .from(CustomCollection.collectionKey);

        try {
            collections.value = CustomCollection
                .fromMultiple(await Firestore.getDocuments(query.build(), authStore.currentUser.token.access))
                .sort((a, b) => b.createTime.getTime() - a.createTime.getTime());
            const start = Date.now();
            mostRecentTiming.value = Date.now() - start;
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isLoading.value = false;
}

if (handleState(authStore)) {
    void loadCollections();
}
</script>