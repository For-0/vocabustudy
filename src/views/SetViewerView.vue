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
                loadingError === "server-error" ? "500: Internal Server Error" :
                "Unknown"
            }}
        </div>
        <template v-else-if="currentSet">
            <router-view v-slot="{ Component }">
                <component :is="Component" :current-set="currentSet" :creator="creator" :starred-terms="starredList" @update-comment="updateComment" @update-like="updateLike" @toggle-star="toggleStar" @star-all="starAll" />
            </router-view>
            <div v-if="!isQuizletSourceSet" class="mb-3">
                <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-800">
                <p class="font-medium dark:text-white mb-2">Offline:</p>
                <button
                    v-if="!offlineStatus || offlineStatus < currentSet.updateTime" type="button"
                    class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-xs px-3 py-2 me-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700"
                    @click="saveForOffline(false)"
                >
                    {{ offlineStatus ? "Update Save" : "Save for Offline" }}
                </button>
                <button v-if="offlineStatus" type="button" class="border text-rose-800 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 focus:outline-none hover:bg-rose-100 hover:border-rose-400 focus:ring-4 focus:ring-rose-200 font-medium rounded-lg text-xs px-3 py-2 dark:hover:bg-rose-900 dark:hover:border-rose-700 dark:focus:ring-rose-700" @click="saveForOffline(true)">Remove Save</button>
            </div>
        </template>
        <div v-else class="w-full h-full flex items-center justify-center dark:text-white text-3xl">
            <Loader class="w-10 h-10 mr-3" :size="2" />
            Loading...

            <!-- Import quizlet source modal -->
            <div v-if="isQuizletSourceSet" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30" />
            <div v-if="isQuizletSourceSet" tabindex="-1" aria-hidden="true" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
                <div class="relative w-full max-w-md max-h-full">
                    <div class="bg-white rounded-lg shadow dark:bg-zinc-800">
                        <div class="px-6 py-6 lg:px-8">
                            <h3 class="mb-3 text-xl font-medium text-zinc-900 dark:text-white">Quizlet Source Import:</h3>

                            <label for="quizlet-source-import" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Paste the source code of the Quizlet set page (or just the <code>NEXT_DATA</code> element) below:</label>
                            <textarea id="quizlet-source-import" v-model="quizletSourceValue" rows="4" class="custom-scrollbar is-thumb-only block p-2.5 w-full text-sm text-zinc-900 bg-zinc-100 rounded-lg border border-zinc-200 focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dark:focus:border-primary" />
                        </div>
                        <div class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                            <button class="text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center" type="button" @click="loadQuizletSource">Load</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, toRaw } from 'vue';
import type { UserProfile, ViewerPartialSet, StudyGuide, TermDefinitionSet } from '../types';
import { useAuthStore, useCacheStore } from '../store';
import Loader from '../components/Loader.vue';
import { VocabSet, Firestore } from '../firebase-rest-api/firestore';
import { useRoute } from 'vue-router';
import { detectAndGetQuizletSet } from '../converters/quizlet';
import { parseQuizletSource } from '../converters/quizlet-source';
import { importGenericSet } from "../converters/generic";
import { isStudyGuide, studyGuideItemIsReading, getLocalDb } from '../utils';

const loadingError = ref<"not-found" | "unauthorized" | "quizlet-not-supported" | "offline" | "server-error" | null>(null);
const currentSet = ref<ViewerPartialSet | null>(null);
const offlineStatus = ref<Date | null>(null);

const route = useRoute();

const creator = ref<UserProfile | null>(null);

const authStore = useAuthStore();
const cacheStore = useCacheStore();
const starredList = ref(getStarredTerms(localStorage.getItem("starred_terms")));

const isQuizletSourceSet = route.params.type === "quizlet" && route.params.id === "source";
const quizletSourceValue = ref("");

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

async function saveForOffline(remove: boolean) {
    const offlineId = `${route.params.type as string}/${route.params.id as string}`.toLowerCase();
    const db = await getLocalDb();
    if (remove) {
        await db.delete("offline-sets", offlineId);
        offlineStatus.value = null;
    } else if (currentSet.value) {
        const toSave = toRaw(currentSet.value);
        for (const key of Object.keys(toSave)) {
            if (!["accents", "collections", "comments", "creationTime", "description", "likes", "name", "pathParts", "terms", "uid", "updateTime", "visibility"].includes(key)) {
                // @ts-expect-error
                delete toSave[key]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
            }
        }
        await db.put("offline-sets", toSave, offlineId);
        offlineStatus.value = currentSet.value.updateTime;
    }
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
    const offlineId = `${route.params.type as string}/${route.params.id as string}`.toLowerCase();
    const db = await getLocalDb();
    const offlineSet = await db.get("offline-sets", offlineId);

    offlineStatus.value = offlineSet?.updateTime ?? null;

    if (!navigator.onLine) {
        if (offlineSet) {
            creator.value = await cacheStore.getProfile(offlineSet.uid);
            currentSet.value = offlineSet;
            document.title = `${currentSet.value.name} - Vocabustudy`;
        } else
            loadingError.value = "offline";
        return;
    }

    const { id, type } = route.params as { id: string, type: string };
    
    // Vocabustudy set
    if (type === "set") {
        await authStore.refreshPromise;

        try {
            const set = VocabSet.fromSingle(await Firestore.getDocument(VocabSet.collectionKey, id, ["uid", "name", "collections", "description", "terms", "visibility", "creationTime", "likes", "comments"], authStore.currentUser?.token.access));
            if (set) {
                creator.value = await cacheStore.getProfile(set.uid);
                currentSet.value = addAccents(set as TermDefinitionSet | StudyGuide) as ViewerPartialSet;
                document.title = `${currentSet.value.name} - Vocabustudy`;
            } else {
                loadingError.value = "not-found";
            }
        } catch (_err) {
            loadingError.value = "unauthorized";
        }
    }
    // Import from quizlet (the three possible values for params.type are set, quizlet, and import)
    else if (type === "quizlet") {
        if (id === "source") return; // Don't load anything yet if the user is importing a Quizlet source
        const setOrError = await detectAndGetQuizletSet(id);
        if (typeof setOrError === "string") loadingError.value = setOrError;
        else {
            currentSet.value = addAccents(setOrError) as ViewerPartialSet;
            document.title = `${currentSet.value.name} - Vocabustudy`
        }
    } else if (type === "import") {
        // generic import
        const url = window.atob(id.replaceAll("-", "+").replaceAll("_", "/"));
        const setOrError = await importGenericSet(url);
        if ("error" in setOrError) loadingError.value = setOrError.error;
        else {
            currentSet.value = addAccents(setOrError.set as TermDefinitionSet | StudyGuide) as ViewerPartialSet;
            document.title = `${currentSet.value.name} - Vocabustudy`;
            creator.value = setOrError.creator;
        }
    } else {
        loadingError.value = "not-found";
    }
}

function loadQuizletSource() {
    if (isQuizletSourceSet && quizletSourceValue.value) {
        const result = parseQuizletSource(quizletSourceValue.value);
        if (result) {
            currentSet.value = addAccents(result.set as TermDefinitionSet | StudyGuide) as ViewerPartialSet;
            document.title = `${currentSet.value.name} - Vocabustudy`;
            creator.value = result.creator;
        }
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

    :deep(img:not(.rounded-full)) {
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