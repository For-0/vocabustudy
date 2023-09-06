<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div v-if="loadingError" class="w-full h-full flex flex-col gap-y-3 md:flex-row items-center justify-center dark:text-white text-3xl">
            <span class="font-bold">Error</span>
            <span class="mx-2 hidden md:inline">|</span>
            {{
                loadingError === "not-found" ? "This set could not be found" :
                loadingError === "unauthorized" ? "You don't have permission to view this set" :
                loadingError === "quizlet-not-supported" ? "You need to install the Quizlet converter extension to view Quizlet sets" : // TODO: link to help center
                "Unknown"
            }}
        </div>
        <div v-else-if="currentSet" class="my-3">
            <!-- Header - title, like -->
            <div class="flex flex-wrap gap-x-3 mb-3 text-zinc-900 dark:text-white">
                <h2 class="text-2xl leading-7 sm:text-3xl grow">
                    {{ currentSet.name }}
                </h2>

                <span class="bg-blue-100 text-blue-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-blue-800/25 dark:text-blue-300 border border-blue-300">
                    <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                    {{ pluralizeWord("term", currentSet.terms.length) }}
                </span>
            </div>
            <router-view v-slot="{ Component }">
                <component :is="Component" :current-set="currentSet" :creator="creator" :starred-terms="starredList" @update-comment="updateComment" @update-like="updateLike" />
            </router-view>
        </div>
        <div v-else class="w-full h-full flex items-center justify-center dark:text-white text-3xl">
            <Loader class="w-10 h-10 mr-3" :size="2" />
            Loading...
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { UserProfile, PartialSetForViewer, TermDefinition, StudyGuideQuiz, StudyGuideReading } from '../types';
import { useAuthStore, useCacheStore } from '../store';
import Loader from '../components/Loader.vue';
import { pluralizeWord } from '../utils';
import { VocabSet, Firestore } from '../firebase-rest-api/firestore';
import { useRoute } from 'vue-router';
import { detectAndGetQuizletSet } from '../converters/quizlet';
import { QueueListIcon } from '@heroicons/vue/20/solid';

const loadingError = ref<"not-found" | "unauthorized" | "quizlet-not-supported" | null>(null);
const currentSet = ref<PartialSetForViewer | null>(null);

const route = useRoute();

const creator = ref<UserProfile | null>(null);

const authStore = useAuthStore();
const cacheStore = useCacheStore();
const starredList = ref(getStarredTerms(localStorage.getItem("starred_terms")));

function getStarredTerms(rawStarredTerms: string | null) {
    const parsed: Record<string, number[] | undefined> = JSON.parse(rawStarredTerms ?? "{}");
    return parsed[route.params.id as string] ?? [];
}

function onStorage(e: StorageEvent) {
    if (e.key === "starred_terms") {
        starredList.value = getStarredTerms(e.newValue);
    }
}

function saveStarredList() {
    const parsed: Record<string, number[] | undefined> = JSON.parse(localStorage.getItem("starred_terms") ?? "{}");
    parsed[route.params.id as string] = starredList.value;
    localStorage.setItem("starred_terms", JSON.stringify(parsed));
}

/*const StarredTerms = {
    /**
     * Find out if a term in the current set is starred
     * @param termIndex Index of the term
     *
    isStarred(termIndex: number) {
        return starredList.value.includes(termIndex);
    },
    setStar(termIndex: number, isStarred: boolean) {
        const possibleIndex = starredList.value.indexOf(termIndex);
        if (isStarred && possibleIndex === -1) starredList.value.push(termIndex);
        else if (!isStarred && possibleIndex !== -1) starredList.value.splice(possibleIndex, 1);
        saveStarredList();
    },
    setStars(termIndices: number[], isStarred: boolean) {
        for (const termIndex of termIndices) {
            const possibleIndex = starredList.value.indexOf(termIndex);
            if (isStarred && possibleIndex === -1) starredList.value.push(termIndex);
            else if (!isStarred && possibleIndex !== -1) starredList.value.splice(possibleIndex, 1);
        }
        saveStarredList();
    }
};*/

/** Load the inital set from Firestore or Quizlet */
async function loadInitialSet() {
    // Edit an existing set
    if (typeof route.params.id === "string" && route.params.type === "set") {
        const set = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, route.params.id, ["uid", "name", "collections", "description", "terms", "visibility", "creationTime", "likes", "comments"], authStore.currentUser?.token.access));
        if (set) {
            creator.value = await cacheStore.getProfile(set.uid);
            currentSet.value = set as PartialSetForViewer;
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
            currentSet.value = setOrError;
            document.title = document.title.replace("Edit Set", `Edit ${setOrError.name}`);
        }
    } else {
        loadingError.value = "not-found";
    }
}

function updateComment(newComment: string) {
    if (authStore.currentUser && currentSet.value) {
        if (newComment)
            currentSet.value.comments[authStore.currentUser.uid] = newComment;
        else
            delete currentSet.value.comments[authStore.currentUser.uid]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
    }
}

function updateLike(like: boolean) {
    if (authStore.currentUser && currentSet.value) {
        if (like) currentSet.value.likes = [...currentSet.value.likes, authStore.currentUser.uid];
        else currentSet.value.likes = currentSet.value.likes.filter(uid => uid !== authStore.currentUser!.uid);
    }
}

onMounted(() => {
    void loadInitialSet();
    addEventListener("storage", onStorage);
});

onUnmounted(() => {
    removeEventListener("storage", onStorage);
})
</script>