<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6" viewBox="0 0 640 512" fill="currentColor"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M160 64c0-35.3 28.7-64 64-64H576c35.3 0 64 28.7 64 64V352c0 35.3-28.7 64-64 64H336.8c-11.8-25.5-29.9-47.5-52.4-64H384V320c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32v32h64V64L224 64v49.1C205.2 102.2 183.3 96 160 96V64zm0 64a96 96 0 1 1 0 192 96 96 0 1 1 0-192zM133.3 352h53.3C260.3 352 320 411.7 320 485.3c0 14.7-11.9 26.7-26.7 26.7H26.7C11.9 512 0 500.1 0 485.3C0 411.7 59.7 352 133.3 352z" /></svg>
            <p class="font-semibold text-lg hidden lg:block">Learn</p>
            <div class="text-center mx-auto">
                <h2 class="text-xl font-bold mb-1">{{ currentSet.name }}</h2>
                <div class="flex gap-2 items-center">
                    <span class="hidden md:inline">Progress:</span>
                    <div class="w-full bg-zinc-200 rounded-full h-2.5 dark:bg-zinc-700 min-w-[6rem]">
                        <div class="bg-primary h-2.5 rounded-full" style="width: 45%" />
                    </div>
                </div>
            </div>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </button>
        </div>
        <div class="grow flex relative min-h-0">
            <div class="w-full absolute lg:static lg:w-48 lg:pb-6 z-30 lg:z-auto shrink-0">
                <!-- Configuration -->
                <!-- TODO: Make some of this a component? -->
                <div class="p-3 lg:block bg-zinc-100 dark:bg-zinc-900 flex flex-col items-start lg:bg-transparent" :class="{ 'hidden': !optionsExpanded }">
                    <p class="font-semibold mb-2">Answer With:</p>
                    <div class="flex items-center mb-2">
                        <input id="learn-answer-with-term" v-model="answerWith" type="radio" value="term" name="flashcard-answer-with" class="cursor-pointer w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                        <label for="learn-answer-with-term" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Term</label>
                    </div>
                    <div class="flex items-center mb-4">
                        <input id="learn-answer-with-definition" v-model="answerWith" type="radio" value="definition" name="flashcard-answer-with" class="cursor-pointer w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                        <label for="learn-answer-with-definition" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Definition</label>
                    </div>
                    <div class="flex items-center mb-4">
                        <input id="learn-only-starred" v-model="onlyStarred" type="checkbox" class="cursor-pointer w-4 h-4 text-yellow-500 bg-zinc-100 border-zinc-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                        <label for="learn-only-starred" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Only Starred</label>
                    </div>
                    <button type="button" class="text-zinc-900 bg-white border mb-4 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
                </div>
                <button class="absolute lg:hidden bottom-0 left-1/2 -translate-x-1/2 text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-2 rounded-full text-sm inline-flex items-center" type="button" :class="{ 'translate-y-1/2': optionsExpanded, 'translate-y-full rounded-t-none': !optionsExpanded }" @click="optionsExpanded = !optionsExpanded">
                    <ChevronDownIcon class="w-6 h-6 transition-transform" :class="{ 'rotate-180': optionsExpanded }" />
                </button>
            </div>
            <div class="gap-3 lg:gap-6 flex flex-col grow p-3 lg:p-6 min-w-0">
                <div class="grow relative justify-center pt-3 min-h-0 overflow-y-auto custom-scrollbar is-thumb-only">
                    <p class="opacity-50 font-bold mb-2">{{ answerWith === "term" ? "Definition" : "Term" }}:</p>
                    <ImageCarousel :images="questionImages" :always-vertical="true" class="mb-6 max-w-3xl" />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p class="grow break-words text-2xl" v-html="question" />
                    <button class="text-yellow-600 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-500 absolute right-0 top-0 p-1 h-7 w-7 rounded-lg text-sm inline-flex items-center" title="Star" type="button" @click.stop="$emit('toggle-star', currentTerm)" @keyup.stop>
                        <StarSolidIcon v-if="starredTerms.includes(currentTerm)" class="w-5 h-5" />
                        <StarOutlineIcon v-else class="w-5 h-5" />
                    </button>
                </div>
                <!-- eslint-disable vue/no-v-html -->
                <div v-if="currentSection === 'mc' && mcqOptions" class="grid gap-3 grid-cols-1 md:grid-cols-2">
                    <!-- MC Answer Choices -->
                    <button type="button" class="break-words max-h-36 md:max-h-64 inline-flex items-center text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 rounded-lg text-lg px-4 py-3.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M9.283 4.002V12H7.971V5.338h-.065L6.072 6.656V5.385l1.899-1.383h1.312Z" />
                            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                        </svg>
                        <span class="min-w-0 overflow-auto custom-scrollbar is-thumb-only max-h-full" v-html="mcqOptions[0]" />
                    </button>
                    <button type="button" class="break-words max-h-36 md:max-h-64 inline-flex items-center text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 rounded-lg text-lg px-4 py-3.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M6.646 6.24v.07H5.375v-.064c0-1.213.879-2.402 2.637-2.402 1.582 0 2.613.949 2.613 2.215 0 1.002-.6 1.667-1.287 2.43l-.096.107-1.974 2.22v.077h3.498V12H5.422v-.832l2.97-3.293c.434-.475.903-1.008.903-1.705 0-.744-.557-1.236-1.313-1.236-.843 0-1.336.615-1.336 1.306Z" />
                            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                        </svg>
                        <span class="min-w-0 overflow-auto custom-scrollbar is-thumb-only max-h-full" v-html="mcqOptions[1]" />
                    </button>
                    <button type="button" class="break-words max-h-36 md:max-h-64 inline-flex items-center text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 rounded-lg text-lg px-4 py-3.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M7.918 8.414h-.879V7.342h.838c.78 0 1.348-.522 1.342-1.237 0-.709-.563-1.195-1.348-1.195-.79 0-1.312.498-1.348 1.055H5.275c.036-1.137.95-2.115 2.625-2.121 1.594-.012 2.608.885 2.637 2.062.023 1.137-.885 1.776-1.482 1.875v.07c.703.07 1.71.64 1.734 1.917.024 1.459-1.277 2.396-2.93 2.396-1.705 0-2.707-.967-2.754-2.144H6.33c.059.597.68 1.06 1.541 1.066.973.006 1.6-.563 1.588-1.354-.006-.779-.621-1.318-1.541-1.318Z" />
                            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                        </svg>
                        <span class="min-w-0 overflow-auto custom-scrollbar is-thumb-only max-h-full" v-html="mcqOptions[2]" />
                    </button>
                    <button type="button" class="break-words max-h-36 md:max-h-64 inline-flex items-center text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 rounded-lg text-lg px-4 py-3.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M7.519 5.057c.22-.352.439-.703.657-1.055h1.933v5.332h1.008v1.107H10.11V12H8.85v-1.559H4.978V9.322c.77-1.427 1.656-2.847 2.542-4.265ZM6.225 9.281v.053H8.85V5.063h-.065c-.867 1.33-1.787 2.806-2.56 4.218Z" />
                            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                        </svg>
                        <span class="min-w-0 overflow-auto custom-scrollbar is-thumb-only max-h-full" v-html="mcqOptions[3]" />
                    </button>
                </div>
                <!-- eslint-enable vue/no-v-html -->
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon, StarIcon as StarOutlineIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/vue/24/solid";
import type { TermDefinitionSet, ViewerExtraSetProperties, UserProfile } from "../../types";
import { ref, onMounted, onUnmounted } from "vue";
import { shuffle, getRandomChoices } from "../../utils";
import { styleAndSanitizeImages } from "../../markdown";
import ImageCarousel from "../../components/set-viewer/ImageCarousel.vue";

type LearnSection = "mc" | "fr";

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    creator: UserProfile;
    starredTerms: number[];
}>();

defineEmits<{
    "toggle-star": [term: number]
}>();

const answerWith = ref<"term" | "definition">("term");
const upcomingTerms = ref<number[]>([]);
const currentSection = ref<LearnSection>("mc");
const onlyStarred = ref(false);
const currentTerm = ref(0);
const mcqOptions = ref<[string, string, string, string] | null>(null);
const question = ref("");
const questionImages = ref<string[]>([]);
const optionsExpanded = ref(false);

const getDefaultList = () => onlyStarred.value ? props.starredTerms.slice() : props.currentSet.terms.map((_, i) => i);

function restart(section: LearnSection = "mc") {
    currentSection.value = section;
    const termIdList = getDefaultList();
    shuffle(termIdList);
    upcomingTerms.value = termIdList;
    nextQuestion();
}

function onKeyUp(e: KeyboardEvent) {
    
}

function nextQuestion() {
    if (currentSection.value === "mc") {
        if (upcomingTerms.value.length === 0) {
            restart("fr");
        } else {
            currentTerm.value = upcomingTerms.value.shift()!;
            const questionRaw = props.currentSet.terms[currentTerm.value][answerWith.value === "term" ? "definition" : "term"];
            const mcqOptionIndices = getRandomChoices(3, props.currentSet.terms.length, currentTerm.value);
            mcqOptions.value = mcqOptionIndices.map(i => styleAndSanitizeImages(props.currentSet.terms[i][answerWith.value]).parsed) as [string, string, string, string];
            ({ parsed: question.value, images: questionImages.value } = styleAndSanitizeImages(questionRaw));
        }
    } else {
        if (upcomingTerms.value.length === 0) {
            // TODO: Show end screen
        }
    }
}

onMounted(() => {
    document.body.addEventListener("keyup", onKeyUp);
    restart();
});

onUnmounted(() => {
    document.body.removeEventListener("keyup", onKeyUp);
});
</script>