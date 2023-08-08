<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow" @change="isUnsaved = true">
        <div v-if="loadingError" class="w-full h-full flex flex-col gap-y-3 md:flex-row items-center justify-center dark:text-white text-3xl">
            <span class="font-bold">Error</span>
            <span class="mx-2 hidden md:inline">|</span>
            {{ loadingError === "not-found" ? "This set could not be found" : loadingError === "not-owner" ? "You are not the owner of this set" : "Unknown" }}
        </div>
        <form v-else-if="currentSet" class="my-3" @submit.prevent="saveSet">
            <div>
                <h2 class="text-2xl leading-7 text-zinc-900 sm:text-3xl dark:text-white flex flex-wrap gap-x-3 mb-3">
                    <input
                        v-model="currentSet.name" type="text" required placeholder="Name"
                        class="bg-transparent text-2xl sm:text-3xl hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-100 text-zinc-900 rounded focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:border-zinc-800/50 dark:placeholder-zinc-400 dark:text-white"
                    >
                    <div class="my-3 relative">
                        <button id="visibility-dropdown" class="text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 focus:ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700 focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center w-full h-full" type="button" @click.stop="visibilityDropdownOpen = !visibilityDropdownOpen">
                            {{ visibilities[Array.isArray(currentSet.visibility) ? 3 : currentSet.visibility] }}
                            <ChevronDownIcon class="w-4 h-4 ml-1" />
                        </button>
                        <div class="z-10 absolute m-0 inset-0 inset-y-auto bg-white divide-y divide-zinc-100 rounded-lg shadow dark:bg-zinc-800 mt-3" :class="visibilityDropdownOpen ? 'block' : 'hidden'">
                            <ul class="py-2 text-sm text-zinc-700 dark:text-zinc-200" aria-labelledby="dropdownDefaultButton">
                                <li id="dropdown-private">
                                    <button type="button" class="block w-full text-left px-4 py-2 hover:bg-yellow-500/50 dark:hover:text-white" :class="{ 'bg-yellow-500/75' : currentSet.visibility === 0 }" @click="currentSet.visibility = 0">Private</button>
                                </li>
                                <li id="dropdown-unlisted">
                                    <button type="button" class="block w-full text-left px-4 py-2 hover:bg-teal-500/50 dark:hover:text-white" :class="{ 'bg-teal-500/75' : currentSet.visibility === 1 }" @click="currentSet.visibility = 1">Unlisted</button>
                                </li>
                                <!-- <li id="dropdown-shared">
                                    <a class="block px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-600 dark:hover:text-white">Shared</a>
                                </li> -->
                                <li id="dropdown-public">
                                    <button type="button" class="block w-full text-left px-4 py-2 hover:bg-green-500/50 dark:hover:text-white" :class="{ 'bg-green-500/75' : currentSet.visibility === 2 }" @click="currentSet.visibility = 2">Public</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <button :disabled="isSaveLoading" type="submit" class="border text-white border-primary bg-primary hover:bg-primary-alt focus:ring-primary/50 my-3 inline-flex items-center focus:outline-none focus:ring-4 font-medium rounded-lg text-sm px-5 py-2.5">
                        <Loader v-if="isSaveLoading" class="w-4 h-4 mr-1" :size="1" />
                        Save
                        <CheckCircleIcon class="w-4 h-4 ml-1" />
                    </button>
                </h2>
                <textarea
                    v-model="currentSet.description" type="text" placeholder="Description" rows="2"
                    class="text-sm bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-50 text-zinc-900 rounded focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50 dark:text-white"
                />
            </div>
            <!-- <div class="mt-5 flex lg:ml-4 lg:mt-0">
                <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">Save <DocumentCheckIcon class="w-4 h-4 inline relative" style="top: -1.4px;" /></button>
            </div> -->
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-800">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                <template v-if="currentSet.collections.includes('-:1')">
                    <!-- empty  --> <!-- supposed to be empty? -->
                </template>
                <template v-else>
                    <TermDefinitionEditor
                        v-for="(term, index) in (currentSet as TermDefinitionSet).terms"
                        :key="index" v-model:term="term.term" v-model:definition="term.definition"
                        @move-left="swap((currentSet as TermDefinitionSet).terms, index, index - 1)"
                        @move-right="swap((currentSet as TermDefinitionSet).terms, index, index + 1)"
                        @remove="currentSet.terms.splice(index, 1)"
                    />
                </template>
                <button class="relative cursor-pointer border-zinc-400 dark:border-zinc-600 border-dashed hover:border-zinc-500 dark:hover:border-zinc-500 text-zinc-400 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-500 border-2 rounded-md p-3" type="button" @click="addTerm">
                    <PlusCircleIcon class="w-9 h-9 mx-auto my-3" />
                    <p class="text-center mb-2">Add an item</p>
                    <button class="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm underline hover:text-zinc-600 dark:hover:text-zinc-400 z-10" @click.stop="currentModal = 'import-items'">Import items</button>
                </button>
            </div>
        </form>
        <div v-else class="w-full h-full flex items-center justify-center dark:text-white text-3xl">
            <Loader class="w-10 h-10 mr-3" :size="2" />
            Loading...
        </div>
        <a href="https://www.markdownguide.org/cheat-sheet/" class="bg-transparent rounded-lg shadow inline-block p-3 align-right mb-2 dark:border border-zinc-800 w-fit hover:bg-zinc-200 dark:hover:bg-zinc-800" target="_blank">
            <svg class="group-hover:fill-white h-6 inline-block fill-zinc-900 dark:fill-white mr-2" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512"><!--! Font Awesome Free 6.4.2 by fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.1-46.1V105.2c0-25.4-20.7-46.1-46.2-46.1zM338.5 360.6H277v-120l-61.5 76.9-61.5-76.9v120H92.3V151.4h61.5l61.5 76.9 61.5-76.9h61.5v209.2zm135.3 3.1L381.5 256H443V151.4h61.5V256H566z" /></svg>
            <span class="group-hover:text-white text-zinc-900 dark:text-white">Markdown is supported!</span>
        </a>
        <div class="fixed top-0 left-0 z-40 w-full md:w-64 h-screen p-4 flex flex-col duration-75 transition-transform bg-white dark:bg-zinc-800" :class="{ '-translate-x-full': !collectionsDrawerOpen }" tabindex="-1" @click.stop>
            <h5 class="text-base font-semibold text-zinc-500 uppercase dark:text-zinc-400">Select Collections</h5>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm p-1.5 absolute top-2.5 right-2.5 inline-flex items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="collectionsDrawerOpen = false">
                <XMarkIcon class="w-5 h-5" />
                <span class="sr-only">Close menu</span>
            </button>
            <div class="py-4 overflow-y-auto custom-scrollbar is-thumb-only grow">
                <CollectionsSelection v-if="hasLazyLoadedCollections && currentSet" v-model="currentSet.collections" grid-config="grid-cols-2 md:grid-cols-1" />
            </div>
        </div>
        <button type="button" title="Collections" class="fixed top-16 left-0 text-zinc-900 bg-white border shadow focus:outline-none hover:bg-zinc-100 font-medium rounded-tr-full rounded-br-full border-l-0 text-sm pl-1 p-2.5 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600" @click.stop="hasLazyLoadedCollections = true; collectionsDrawerOpen = true">
            <TagIcon class="w-5 h-5" />
        </button>
        <div v-if="currentModal" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30" />
        <div v-show="currentModal === 'import-items'" tabindex="-1" aria-hidden="true" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <!-- Modal content -->
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="currentModal = null">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="px-6 py-6 lg:px-8">
                        <h3 class="mb-3 text-xl font-medium text-zinc-900 dark:text-white">Import items</h3>
                        <form @submit.prevent="onImportSubmit">
                            <!-- TODO: quizlet -->
                            <label for="import-items-manual" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Import manually:</label>
                            <textarea
                                id="import-items-manual" v-model="importItemsManualInput" rows="6"
                                class="block p-2.5 mb-4 w-full text-sm text-zinc-900 bg-zinc-50 rounded-lg border border-zinc-300 focus:ring-0 focus:border-primary focus:dark:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                                placeholder="Place each item on its own line.&#10;&#10;Separate terms and definitions by two or more spaces or a tab."
                            />
                            <button type="submit" class="flex items-center w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                                Submit
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ChevronDownIcon, XMarkIcon, TagIcon } from '@heroicons/vue/20/solid';
import { PlusCircleIcon } from '@heroicons/vue/24/outline';
import { onMounted, onUnmounted, ref, getCurrentInstance } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import Loader from '../components/Loader.vue';
import TermDefinitionEditor from '../components/term-cards/TermDefinitionEditor.vue';
import { BatchWriter, Firestore, VocabSet } from '../firebase-rest-api/firestore';
import { useAuthStore, useCacheStore } from '../store';
import type { SetTerms, StudyGuideQuiz, StudyGuideReading, TermDefinition } from '../types';
import { swap, showErrorToast, generateDocumentId, getWords } from "../utils";
import CollectionsSelection from '../components/CollectionsSelection.vue';

type PartialVocabSet<T extends SetTerms = SetTerms> = Pick<VocabSet<T>, "name" | "collections" | "terms" | "visibility" | "description"> & Partial<Pick<VocabSet, "uid">>;
type TermDefinitionSet = PartialVocabSet<TermDefinition[]>;
type StudyGuide = PartialVocabSet<(StudyGuideQuiz|StudyGuideReading)[]>;

const currentSet = ref<PartialVocabSet | null>(null);
const visibilityDropdownOpen = ref(false);
const collectionsDrawerOpen = ref(false);
const hasLazyLoadedCollections = ref(false);
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cacheStore = useCacheStore();
const loadingError = ref<"not-found" | "not-owner" | null>(null);
const currentModal = ref<"import-items" | null>(null);
const importItemsManualInput = ref("");
const importTermLineRe = /^(.+?)(?: {2,}|\t+)(.+)$/;
const isSaveLoading = ref(false);
let isUnsaved = false;

const visibilities = [
    "Private",
    "Unlisted",
    "Public",
    "Shared"
]
const blankSet: TermDefinitionSet = {
    name: "Untitled Set",
    collections: [],
    terms: [],
    visibility: 2
};

const blankGuide: StudyGuide = {
    name: "Untitled Guide",
    collections: ["-:1"],
    terms: [],
    visibility: 2
};

const currentInstance = getCurrentInstance();

function handleState(state: (typeof authStore)["$state"]) {
    if (state.currentUser === null) {
        void router.push({ name: 'login', params: { redirect: route.fullPath } });
        return false;
    } else if (currentSet.value?.uid && currentSet.value.uid !== state.currentUser.uid && !state.currentUser.customAttributes.admin) {
        // Show unauthorized thing - we don't really want to fully log them out
        loadingError.value = "not-owner";
        return false;
    }
    return true;
}

async function loadInitialSet() {
    if (route.params.id === "new") {
        currentSet.value = blankSet;
        document.title = document.title.replace("Edit Set", "New Set");
    } else if (route.params.id === "new-guide") {
        currentSet.value = blankGuide;
        document.title = document.title.replace("Edit Set", "New Guide");
    } else if (typeof route.params.id === "string") {
        const set = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, route.params.id, ["uid", "name", "collections", "description", "terms", "visibility"], authStore.currentUser!.token.access));
        if (set) {
            currentSet.value = set;
            handleState(authStore.$state);
            document.title = document.title.replace("Edit Set", `Edit ${set.name}`);
        } else {
            loadingError.value = "not-found";
        }
    } else {
        loadingError.value = "not-found";
    }
}

function closeDropdown() {
    visibilityDropdownOpen.value = false;
    collectionsDrawerOpen.value = false;
}

function addTerm() {
    if (currentSet.value) {
        if (currentSet.value.collections.includes("-:0")) {
            (currentSet.value as StudyGuide).terms.push({
                title: "",
                type: 0,
                body: ""
            })
        } else {
            (currentSet.value as TermDefinitionSet).terms.push({
                term: "",
                definition: ""
            })
        }
    }
}

function onImportSubmit() {
    if (currentSet.value && !currentSet.value.collections.includes("-:0")) {
        const terms = importItemsManualInput.value.split(/\n+/g)
            .map(line => line.match(importTermLineRe))
            .filter((line): line is RegExpMatchArray => line !== null)
            .map(([, term, definition]) => ({ term: term.trim(), definition: definition.trim() }));
        (currentSet.value as TermDefinitionSet).terms.push(...terms);
    }

    importItemsManualInput.value = "";
    currentModal.value = null;
}

async function saveSet() {
    if (isSaveLoading.value || !currentSet.value) return;
    isSaveLoading.value = true;
    if (currentSet.value.terms.length < 4 && !currentSet.value.collections.includes("-:0")) {
        showErrorToast("You must have at least 4 items in your set.", currentInstance?.appContext, 7000);
    } else {
        await authStore.refreshCurrentUser();
        if (handleState(authStore.$state)) {
            const batchWriter = new BatchWriter();
            const nameWords = getWords(currentSet.value.name.replace(/\p{Diacritic}/gu, ""));
            const numTerms = currentSet.value.terms.length;
            if (route.params.id === "new" || route.params.id === "new-guide") {
                const documentId = generateDocumentId();
                batchWriter.update<VocabSet>(
                    ["sets", documentId],
                    { ...currentSet, numTerms, nameWords, uid: authStore.currentUser!.uid, likes: 0 },
                    [{ fieldPath: "creationTime", setToServerValue: "REQUEST_TIME" }]
                );
            } else
                batchWriter.update<VocabSet>(
                    ["sets", route.params.id as string],
                    { ...currentSet, numTerms, nameWords }
                );
            try {
                await batchWriter.commit(authStore.currentUser!.token.access);
                isUnsaved = false;
                cacheStore.resetMySets();
                await router.push({ name: "my-sets" });
            } catch {
                showErrorToast("We weren't able to save your set.", currentInstance?.appContext, 7000);
            }
        }
    }
    isSaveLoading.value = false;
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
    e.preventDefault();
    return (e.returnValue = "");
}

onBeforeRouteLeave((_to, _from) => {
    if (!confirm("You have unsaved changes. Are you sure you want to leave?")) return false;
});

onMounted(() => {
    document.addEventListener("click", closeDropdown);
    window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
    document.removeEventListener("click", closeDropdown);
    window.removeEventListener("beforeunload", handleBeforeUnload);
});

if (handleState(authStore.$state)) void loadInitialSet();
</script>