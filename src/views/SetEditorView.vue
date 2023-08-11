<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow" @change="isUnsaved = true">
        <!-- Loading errors -->
        <div v-if="loadingError" class="w-full h-full flex flex-col gap-y-3 md:flex-row items-center justify-center dark:text-white text-3xl">
            <span class="font-bold">Error</span>
            <span class="mx-2 hidden md:inline">|</span>
            {{
                loadingError === "not-found" ? "This set could not be found" :
                loadingError === "not-owner" ? "You are not the owner of this set" :
                loadingError === "quizlet-not-supported" ? "You need to install the Quizlet converter extension to import Quizlet sets" : // TODO: link to help center
                "Unknown"
            }}
        </div>

        <form v-else-if="currentSet" ref="form" class="my-3" @submit.prevent="saveSet">
            <div>
                <!-- Header - title, visibility, save -->
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
                
                <!-- Description -->
                <textarea
                    v-model="currentSet.description" type="text" placeholder="Description" rows="2"
                    class="text-sm bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-50 text-zinc-900 rounded focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50 dark:text-white"
                />
            </div>

            <!-- Study Guide -->
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-800">
            <template v-if="isStudyGuide(currentSet)">    
                <!-- Top tab bar -->
                <div class="border-b border-zinc-200 dark:border-zinc-700 mb-4">
                    <ul class="flex flex-wrap -mb-px text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        <li v-for="page, i in currentSet.terms" :key="i" class="mr-2">
                            <button
                                type="button"
                                class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group"
                                :class="currentStudyGuidePage === i ? 'text-primary border-primary dark:text-primary-light dark:border-primary-light' : 'hover:text-zinc-600 hover:border-zinc-300 dark:hover:text-zinc-300 border-transparent'"
                                @click="currentStudyGuidePage = i"
                            >
                                <DocumentTextIcon v-if="page.type === 0" class="w-4 h-4 mr-2" :class="currentStudyGuidePage === i ? 'text-primary dark:text-primary-light' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'" />
                                <svg v-else class="w-4 h-4 mr-2" :class="currentStudyGuidePage === i ? 'text-primary dark:text-primary-light' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M2 10h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm9-9h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 9a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3zm0-10a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-3zM2 9a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H2zm7 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3zM0 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.354.854a.5.5 0 1 0-.708-.708L3 3.793l-.646-.647a.5.5 0 1 0-.708.708l1 1a.5.5 0 0 0 .708 0l2-2z" />
                                </svg>
                                {{ page.title || "Untitled page" }}
                                <button type="button" class="ml-2" @click.stop="removeGuideItem(i)">
                                    <XCircleIcon v-if="currentSet.terms.length > 1" class="w-4 h-4 hover:text-red-500/75 dark:hover:text-red-500/75" :class="currentStudyGuidePage === i ? 'text-primary-alt' : 'text-zinc-300 dark:text-zinc-500'" />
                                </button>
                            </button>
                        </li>
                        <!-- Add buttons -->
                        <li class="ml-auto">
                            <button
                                type="button"
                                class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group text-zinc-600 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-300 dark:hover:text-zinc-200 border-transparent"
                                @click="currentSet.terms.push({ type: 0, title: '', body: '' })"
                            >
                                <DocumentPlusIcon class="w-4 h-4 mr-2 text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                                Add Reading
                            </button>
                            <button
                                type="button"
                                class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group text-zinc-600 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-300 dark:hover:text-zinc-200 border-transparent"
                                @click="currentSet.terms.push({ type: 1, title: '', questions: [] })"
                            >
                                <svg class="w-4 h-4 mr-2 text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M7 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-1zM2 1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm0 8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H2zm.854-3.646a.5.5 0 0 1-.708 0l-1-1a.5.5 0 1 1 .708-.708l.646.647 1.646-1.647a.5.5 0 1 1 .708.708l-2 2zm0 8a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 .708-.708l.646.647 1.646-1.647a.5.5 0 0 1 .708.708l-2 2zM7 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-1zm0-5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
                                </svg>
                                Add Quiz
                            </button>
                        </li>
                    </ul>
                </div>
                <div class="text-zinc-700 dark:text-zinc-300">
                    <!-- guide content -->
                    <textarea
                        v-model="currentStudyGuideItem.title" type="text" placeholder="Page title"
                        rows="2" required
                        class="mb-3 custom-scrollbar is-thumb-only text-lg bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-50 rounded focus:ring-0 focus:border-primary focus:dark:border-primary p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50"
                    />
                    <textarea
                        v-if="studyGuideItemIsReading(currentStudyGuideItem!)"
                        v-model="currentStudyGuideItem.body" type="text" placeholder="Body" rows="10" required
                        class="mb-3 custom-scrollbar is-thumb-only text-sm bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-50 rounded focus:ring-0 focus:border-primary focus:dark:border-primary p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50"
                    />
                    <!-- guide quiz -->
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                        <GuideQuestionEditor
                            v-for="(_, index) in currentStudyGuideItem.questions"
                            :key="index" v-model:question="currentStudyGuideItem.questions[index]"
                            @move-left="swap(currentStudyGuideItem.questions, index, index - 1)"
                            @move-right="swap(currentStudyGuideItem.questions, index, index + 1)"
                            @remove="currentStudyGuideItem.questions.splice(index, 1)"
                        />
                        <button class="cursor-pointer border-zinc-400 dark:border-zinc-600 border-dashed hover:border-zinc-500 dark:hover:border-zinc-500 text-zinc-400 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-500 border-2 rounded-md p-3" type="button" @click="currentStudyGuideItem.questions.push({ question: '', type: 0, answers: [''] })">
                            <PlusCircleIcon class="w-9 h-9 mx-auto my-3" />
                            <p class="text-center mb-2">Add a question</p>
                        </button>
                    </div>
                </div>
            </template>

            <!-- term/definitions -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                <TermDefinitionEditor
                    v-for="(term, index) in currentSet.terms"
                    :key="index" v-model:term="term.term" v-model:definition="term.definition"
                    @move-left="swap(currentSet.terms, index, index - 1)"
                    @move-right="swap(currentSet.terms, index, index + 1)"
                    @remove="currentSet.terms.splice(index, 1)"
                />
                <button class="cursor-pointer border-zinc-400 dark:border-zinc-600 border-dashed hover:border-zinc-500 dark:hover:border-zinc-500 text-zinc-400 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-500 border-2 rounded-md p-3" type="button" @click="addTerm">
                    <PlusCircleIcon class="w-9 h-9 mx-auto my-3" />
                    <p class="text-center mb-2">Add an item</p>
                    <button class="text-sm underline hover:text-zinc-600 dark:hover:text-zinc-400 z-10" type="button" @click.stop="currentModal = 'import-items'">Import items</button>
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

        <!-- Collections menu -->
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
        <button type="button" title="Collections" class="fixed top-20 left-0 text-zinc-300 border shadow focus:outline-none hover:bg-primary-alt font-medium rounded-tr-full rounded-br-full border-l-0 text-sm pl-1 p-2.5 bg-primary border-primary-alt hover:border-primary" @click.stop="hasLazyLoadedCollections = true; collectionsDrawerOpen = true">
            <TagIcon class="w-5 h-5" />
        </button>

        <!-- Import modal -->
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
                            <!-- TODO: quizlet - link to help center -->
                            <label for="import-items-manual" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Import manually:</label>
                            <textarea
                                id="import-items-manual" v-model="importItemsManualInput" rows="6"
                                class="block p-2.5 mb-4 w-full text-sm text-zinc-900 bg-zinc-50 rounded-lg border border-zinc-300 focus:ring-0 focus:border-primary focus:dark:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                                placeholder="Place each item on its own line.&#10;&#10;Separate terms and definitions by two or more spaces or a tab."
                            />
                            <button type="submit" class="justify-center flex items-center w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
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
import { CheckCircleIcon, ChevronDownIcon, XMarkIcon, TagIcon, XCircleIcon } from '@heroicons/vue/20/solid';
import { PlusCircleIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';
import { onMounted, onUnmounted, ref, getCurrentInstance, computed } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import Loader from '../components/Loader.vue';
import TermDefinitionEditor from '../components/TermDefinitionEditor.vue';
import { BatchWriter, Firestore, VocabSet } from '../firebase-rest-api/firestore';
import { useAuthStore, useCacheStore } from '../store';
import type { StudyGuideQuiz, StudyGuideReading, TermDefinitionSet, StudyGuide } from '../types';
import { swap, showErrorToast, generateDocumentId, getWords, isStudyGuide, studyGuideItemIsReading } from "../utils";
import CollectionsSelection from '../components/CollectionsSelection.vue';
import { detectAndGetQuizletSet } from "../converters/quizlet";
import { DocumentPlusIcon } from '@heroicons/vue/24/solid';
import GuideQuestionEditor from '../components/GuideQuestionEditor.vue';

const currentSet = ref<TermDefinitionSet | StudyGuide | null>(null);
const visibilityDropdownOpen = ref(false);
const collectionsDrawerOpen = ref(false);
const hasLazyLoadedCollections = ref(false);
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cacheStore = useCacheStore();
const currentStudyGuidePage = ref(0);
const currentStudyGuideItem = computed(() => currentSet.value?.terms[currentStudyGuidePage.value] as StudyGuideQuiz | StudyGuideReading);
const loadingError = ref<"not-found" | "not-owner" | "quizlet-not-supported" | null>(null);
const currentModal = ref<"import-items" | null>(null);
const importItemsManualInput = ref("");
const importTermLineRe = /^(.+?)(?: {2,}|\t+)(.+)$/;
const isSaveLoading = ref(false);
const form = ref<HTMLFormElement>();
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
    terms: [{ term: "", definition: "" }],
    visibility: 2,
    uid: "",
    pathParts: []
};

const blankGuide: StudyGuide = {
    name: "Untitled Guide",
    collections: ["-:1"],
    terms: [{ title: "", type: 0, body: "" }],
    visibility: 2,
    uid: "",
    pathParts: []
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


/** Load the inital set from Firestore or Quizlet */
async function loadInitialSet() {
    // New set and guide
    if (route.params.id === "new") {
        currentSet.value = blankSet;
        document.title = document.title.replace("Edit Set", "New Set");
    } else if (route.params.id === "new-guide") {
        currentSet.value = blankGuide;
        document.title = document.title.replace("Edit Set", "New Guide");
    }
    // Edit an existing set
    else if (typeof route.params.id === "string" && route.params.type === "set") {
        const set = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, route.params.id, ["uid", "name", "collections", "description", "terms", "visibility"], authStore.currentUser!.token.access));
        if (set) {
            currentSet.value = set as TermDefinitionSet | StudyGuide;
            handleState(authStore.$state);
            document.title = document.title.replace("Edit Set", `Edit ${set.name}`);
        } else {
            loadingError.value = "not-found";
        }
    }
    // Import from quizlet (the two possible values for params.type are set and quizlet)
    else if (typeof route.params.id === "string") {
        const setOrError = await detectAndGetQuizletSet(route.params.id);
        if (typeof setOrError === "string") loadingError.value = setOrError;
        else {
            setOrError.uid = authStore.currentUser!.uid; // change the quizlet set to be owned by the current user (muahahaha)
            currentSet.value = setOrError;
            document.title = document.title.replace("Edit Set", `Edit ${setOrError.name}`);
        }
    } else {
        loadingError.value = "not-found";
    }
}

function closeDropdown() {
    visibilityDropdownOpen.value = false;
    collectionsDrawerOpen.value = false;
}

/** Add a single term or guide item to the set */
function addTerm() {
    if (currentSet.value) {
        if (isStudyGuide(currentSet.value)) {
            currentSet.value.terms.push({
                title: "",
                type: 0,
                body: ""
            })
        } else {
            currentSet.value.terms.push({
                term: "",
                definition: ""
            })
        }
    }
}

/** Parse the manual input textarea and add the terms */
function onImportSubmit() {
    if (currentSet.value && !isStudyGuide(currentSet.value)) {
        const terms = importItemsManualInput.value.split(/\n+/g)
            .map(line => line.match(importTermLineRe))
            .filter((line): line is RegExpMatchArray => line !== null)
            .map(([, term, definition]) => ({ term: term.trim(), definition: definition.trim() }));
        currentSet.value.terms.push(...terms);
    }

    importItemsManualInput.value = "";
    currentModal.value = null;
}

function removeGuideItem(index: number) {
    if (currentSet.value) {
        currentSet.value.terms.splice(index, 1);
        currentStudyGuidePage.value = Math.min(Math.max(0, currentStudyGuidePage.value - 1), currentSet.value.terms.length - 1);
    }
}

function findInvalidGuidePage() {
    if (currentSet.value && isStudyGuide(currentSet.value)) {
        for (let i = 0; i < currentSet.value.terms.length; i++) {
            const item = currentSet.value.terms[i];
            // Make sure the title is not empty and the body/questions are not empty
            if (item.type === 0 && (!item.title || !item.body)) return i;
            else if (item.type === 1) {
                if (item.questions.length <= 0) return i;
                for (const { question, answers } of item.questions) {
                    if (!question || !answers.every(el => el)) return i;
                }
            }
        }
    }
    return null;
}

/** Get the set ready for saving to firestore */
function serializeSet() {
    if (!currentSet.value) return null;
    const nameWords = getWords(currentSet.value.name.replace(/\p{Diacritic}/gu, ""));
    const numTerms = currentSet.value.terms.length;
    const serialized: Pick<VocabSet, "name" | "nameWords" | "collections" | "numTerms" | "terms" | "visibility" | "description"> = {
        name: currentSet.value.name,
        nameWords,
        collections: currentSet.value.collections,
        numTerms,
        terms: currentSet.value.terms,
        visibility: currentSet.value.visibility,
    };
    if (currentSet.value.description) serialized.description = currentSet.value.description;
    return serialized;
}

async function saveSet() {
    if (isSaveLoading.value || !currentSet.value) return;
    

    // Check to make sure it's valid
    if (isStudyGuide(currentSet.value)) {
        const invalidGuideIndex = findInvalidGuidePage();
        if (invalidGuideIndex !== null) {
            showErrorToast(`Page ${invalidGuideIndex + 1} is invalid.`, currentInstance?.appContext, 7000);
            // Switch to the invalid page
            currentStudyGuidePage.value = invalidGuideIndex;
            setTimeout(() => form.value?.reportValidity(), 0);
            return;
        }
    } else if (currentSet.value.terms.length < 4) {
        showErrorToast("You must have at least 4 items in your set.", currentInstance?.appContext, 7000);
    }

    isSaveLoading.value = true;
    await authStore.refreshCurrentUser();
    if (handleState(authStore.$state)) {
        const batchWriter = new BatchWriter();
        const serializedSet = serializeSet();
        if (!serializedSet) return; // this should never happen
        if (route.params.id === "new" || route.params.id === "new-guide" || route.params.type === "quizlet") {
            // creating a new set - we need to initialize the uid and likes
            const documentId = generateDocumentId();
            batchWriter.update<VocabSet>(
                ["sets", documentId],
                { ...serializedSet, uid: authStore.currentUser!.uid, likes: [], comments: {} },
                [{ fieldPath: "creationTime", setToServerValue: "REQUEST_TIME" }]
            );
        } else
            batchWriter.update<VocabSet>(
                ["sets", route.params.id as string],
                { ...serializedSet }
            );
        try {
            // Commit the writes and go back to my sets
            await batchWriter.commit(authStore.currentUser!.token.access);
            isUnsaved = false;
            cacheStore.resetMySets();
            await router.push({ name: "my-sets" });
        } catch (err) {
            showErrorToast(`We weren't able to save your set: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isSaveLoading.value = false;
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (isUnsaved) {
        e.preventDefault();
        return (e.returnValue = "");
    }
}

// Event listeners

onBeforeRouteLeave((_to, _from) => {
    if (isUnsaved && !confirm("You have unsaved changes. Are you sure you want to leave?")) return false;
});

onMounted(() => {
    document.addEventListener("click", closeDropdown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    if (handleState(authStore.$state)) void loadInitialSet();
});

onUnmounted(() => {
    document.removeEventListener("click", closeDropdown);
    window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>