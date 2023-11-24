<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div v-if="loadingError" class="w-full h-full flex flex-col gap-y-3 md:flex-row items-center justify-center dark:text-white text-3xl">
            <span class="font-bold">Error</span>
            <span class="mx-2 hidden md:inline">|</span>
            {{
                loadingError === "not-found" ? "This set could not be found" :
                loadingError === "unauthorized" ? "You don't have permission to view this set" :
                loadingError === "quizlet-not-supported" ? "You need to install the Quizlet converter extension to view Quizlet sets" : // TODO: link to help center
                loadingError === "offline" ? "You're offline" :
                "Unknown"
            }}
        </div>
        <router-view v-else-if="currentSet" v-slot="{ Component }">
            <component :is="Component" :current-set="currentSet" :creator="creator" :starred-terms="starredList" @update-comment="updateComment" @update-like="updateLike" @toggle-star="toggleStar" @star-all="starAll" />
        </router-view>
        <div v-else class="w-full h-full flex items-center justify-center dark:text-white text-3xl">
            <Loader class="w-10 h-10 mr-3" :size="2" />
            Loading...
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { UserProfile, ViewerPartialSet, StudyGuide, TermDefinitionSet } from '../types';
import { useAuthStore, useCacheStore } from '../store';
import Loader from '../components/Loader.vue';
import { VocabSet, Firestore } from '../firebase-rest-api/firestore';
import { useRoute } from 'vue-router';
import { detectAndGetQuizletSet } from '../converters/quizlet';
import { isStudyGuide, studyGuideItemIsReading } from '../utils';

const loadingError = ref<"not-found" | "unauthorized" | "quizlet-not-supported" | "offline" | null>(null);
const currentSet = ref<ViewerPartialSet | null>(null);

const route = useRoute();

const creator = ref<UserProfile | null>(null);

const authStore = useAuthStore();
const cacheStore = useCacheStore();
const starredList = ref(getStarredTerms(localStorage.getItem("starred_terms")));

// Anything not in ASCII
const accentsRe = /[^\p{ASCII}]/gu;

function parseStarredTerms(rawStarredTerms: string | null) {
    return JSON.parse(rawStarredTerms ?? "{}") as Record<string, number[] | undefined>;
}

function getStarredTerms(rawStarredTerms: string | null) {
    const parsed = parseStarredTerms(rawStarredTerms);
    return parsed[route.params.id as string] ?? [];
}

function onStorage(e: StorageEvent) {
    if (e.key === "starred_terms") {
        starredList.value = getStarredTerms(e.newValue);
    }
}

function saveStarredList() {
    const parsed = parseStarredTerms(localStorage.getItem("starred_terms"));
    parsed[route.params.id as string] = starredList.value;
    localStorage.setItem("starred_terms", JSON.stringify(parsed));
}

function toggleStar(termIndex: number) {
    if (starredList.value.includes(termIndex)) starredList.value = starredList.value.filter(i => i !== termIndex);
    else starredList.value = starredList.value.concat(termIndex);
    saveStarredList();
}

function starAll(termIndices: number[]) {
    starredList.value = starredList.value.concat(termIndices.filter(el => !starredList.value.includes(el)));
    saveStarredList();
}

function addAccents(set: TermDefinitionSet | StudyGuide) {
    const accentsSet = new Set<string>();
    
    if (isStudyGuide(set)) {
        // Iterate over all of the quizzes
        for (const item of set.terms) {
            if (!studyGuideItemIsReading(item)) {
                // Iterate over all of the short answer (1) questions
                for (const { answers } of item.questions.filter(q => q.type === 1)) {
                    // Add all of the accents in the answers
                    const answerAccents = answers.flatMap(answer => answer.match(accentsRe) ?? []);
                    for (const accent of answerAccents) {
                        accentsSet.add(accent.toLowerCase());
                        accentsSet.add(accent.toUpperCase())
                    }
                }
            }
        }
    } else {
        for (const { term, definition } of set.terms) {
            const termAccents = [...term.match(accentsRe) ?? [], ...definition.match(accentsRe) ?? []];
            for (const accent of termAccents) {
                accentsSet.add(accent.toLowerCase());
                accentsSet.add(accent.toUpperCase())
            }
        }
    }

    const collator = new Intl.Collator();
    const accents = [...accentsSet].sort((a, b) => collator.compare(a, b));

    return {
        ...set,
        accents
    };
}

/** Load the inital set from Firestore or Quizlet */
async function loadInitialSet() {
    // Edit an existing set
    if (typeof route.params.id === "string" && route.params.type === "set") {
        if (!navigator.onLine) {
            loadingError.value = "offline";
            return;
        }
        const set = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, route.params.id, ["uid", "name", "collections", "description", "terms", "visibility", "creationTime", "likes", "comments"], authStore.currentUser?.token.access));
        if (set) {
            creator.value = await cacheStore.getProfile(set.uid);
            currentSet.value = addAccents(set as TermDefinitionSet | StudyGuide) as ViewerPartialSet;
            document.title = `${currentSet.value.name} - Vocabustudy`;
        } else {
            loadingError.value = "not-found";
        }
    }
    // Import from quizlet (the two possible values for params.type are set and quizlet)
    else if (typeof route.params.id === "string") {
        const setOrError = await detectAndGetQuizletSet(route.params.id);
        if (typeof setOrError === "string") loadingError.value = setOrError;
        else {
            currentSet.value = addAccents(setOrError) as ViewerPartialSet;
            document.title = `${currentSet.value.name} - Vocabustudy`
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
<style scoped>
main {
    :deep(.drag-item) {
        transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px));
        
        * {
            /* Prevent user from dragging children */
            pointer-events: none;
        }
    }

    :deep(.match) {
        height: 10px;
        position: absolute;
        --x: var(--x2) - var(--x1);
        --y: var(--y2) - var(--y1);

        /* Direction - inverse tangent */
        --angle: atan2(var(--y), var(--x));
        /* Subtract half the height from the y so that it's centered */
        transform: translate(calc(1px * var(--x1)), calc(1px * var(--y1) - 5px)) skewY(var(--angle));

        /* Magnitude - pythagorean theorem */
        width: calc(1px * (var(--x)));

        transform-origin: top left;
    }

    :deep(img) {
        @apply shadow;
        max-width: 320px;
        border-radius: 0.375rem;

        @media (max-width: 768px) {
            max-width: 256px;
        }

        @media (max-width: 640px) {
            max-width: 128px;
        }
    }
}
</style>