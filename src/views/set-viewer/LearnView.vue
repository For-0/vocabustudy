<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 mr-2" viewBox="0 0 640 512" fill="currentColor"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M160 64c0-35.3 28.7-64 64-64H576c35.3 0 64 28.7 64 64V352c0 35.3-28.7 64-64 64H336.8c-11.8-25.5-29.9-47.5-52.4-64H384V320c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32v32h64V64L224 64v49.1C205.2 102.2 183.3 96 160 96V64zm0 64a96 96 0 1 1 0 192 96 96 0 1 1 0-192zM133.3 352h53.3C260.3 352 320 411.7 320 485.3c0 14.7-11.9 26.7-26.7 26.7H26.7C11.9 512 0 500.1 0 485.3C0 411.7 59.7 352 133.3 352z" /></svg>
            <p class="font-semibold text-lg hidden lg:block">Learn</p>
            <h2 class="text-xl font-bold mb-1 text-center mx-auto">{{ currentSet.name }}</h2>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </button>
        </div>
        <div class="grow flex relative min-h-0">
            <StudyModeConfiguration v-model:answer-with="answerWith" v-model:only-starred="onlyStarredCheck">
                <button type="button" class="text-zinc-900 bg-white border mb-4 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
            </StudyModeConfiguration>
            <div class="flex flex-col grow p-3 lg:p-6 min-w-0" :class="{ 'gap-3': !questionState.isDone }">
                <template v-if="questionState.isDone">
                    <h3 class="text-4xl font-bold">All done!</h3>
                    <p class="opacity-75 mb-4 text-xl">You finished Learn mode.</p>
                    <template v-if="missedTerms.size > 0">
                        <p class="text-lg font-bold mb-2">Most Missed Terms:</p>
                        <button class="self-start mb-2 text-white bg-yellow-500 hover:bg-yellow-600 focus:ring-4 focus:outline-none focus:ring-amber-300 font-medium rounded-lg text-sm px-3 py-2 text-center inline-flex items-center mr-2 dark:focus:ring-amber-900" type="button" @click="starAllMissed">
                            <StarOutlineIcon class="w-3 h-3 mr-2" />
                            Star All Terms
                        </button>
                        <div class="relative overflow-y-auto shadow-md rounded-lg custom-scrollbar is-thumb-only">
                            <table class="w-full text-sm text-left text-zinc-500 dark:text-zinc-400">
                                <thead class="text-xs text-zinc-700 uppercase bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-400 whitespace-nowrap">
                                    <tr>
                                        <th scope="col" class="px-6 py-3">Term</th>
                                        <th scope="col" class="px-6 py-3">MCQs Missed</th>
                                        <th scope="col" class="px-6 py-3">FRQs Missed</th>
                                    </tr>
                                </thead>
                                <tbody style="overflow-wrap: anywhere;">
                                    <tr v-for="[i, item], rowIndex in missedTerms" :key="i" class="border-b dark:border-zinc-700" :class="rowIndex % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800'">
                                        <th scope="row" class="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                                            {{ currentSet.terms[i].term }}
                                        </th>
                                        <td class="px-6 py-4">
                                            {{ item.mc }}
                                        </td>
                                        <td class="px-6 py-4">
                                            {{ item.fr }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                    <p v-else class="text-lg font-bold mb-2">No terms missed!</p>
                </template>
                <template v-else>
                    <div class="grow relative justify-center pt-3 min-h-0 overflow-y-auto custom-scrollbar is-thumb-only">
                        <p class="opacity-50 font-bold mb-2">{{ answerWith === "term" ? "Definition" : "Term" }}:</p>
                        <ImageCarousel :images="questionState.questionImages" :always-vertical="true" class="mb-6 max-w-3xl" />
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <p class="grow break-words text-2xl" v-html="questionState.question" />
                        <button class="text-yellow-600 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-500 absolute right-0 top-0 p-1 h-7 w-7 rounded-lg text-sm inline-flex items-center" title="Star" type="button" @click.stop="$emit('toggle-star', questionState.currentTerm)" @keyup.stop>
                            <StarSolidIcon v-if="starredTerms.includes(questionState.currentTerm)" class="w-5 h-5" />
                            <StarOutlineIcon v-else class="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div v-if="currentSection === 'mc' && questionState.mcqOptions" class="grid gap-3 grid-cols-1 md:grid-cols-2">
                        <!-- MC Answer Choices -->
                        <LearnMCButton :content="questionState.mcqOptions[0]" :state="getMcqButtonState(0)" @click="onMcqButtonClicked(0)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M9.283 4.002V12H7.971V5.338h-.065L6.072 6.656V5.385l1.899-1.383h1.312Z" />
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                            </svg>
                        </LearnMCButton>
                        <LearnMCButton :content="questionState.mcqOptions[1]" :state="getMcqButtonState(1)" @click="onMcqButtonClicked(1)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M6.646 6.24v.07H5.375v-.064c0-1.213.879-2.402 2.637-2.402 1.582 0 2.613.949 2.613 2.215 0 1.002-.6 1.667-1.287 2.43l-.096.107-1.974 2.22v.077h3.498V12H5.422v-.832l2.97-3.293c.434-.475.903-1.008.903-1.705 0-.744-.557-1.236-1.313-1.236-.843 0-1.336.615-1.336 1.306Z" />
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                            </svg>
                        </LearnMCButton>
                        <LearnMCButton :content="questionState.mcqOptions[2]" :state="getMcqButtonState(2)" @click="onMcqButtonClicked(2)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M7.918 8.414h-.879V7.342h.838c.78 0 1.348-.522 1.342-1.237 0-.709-.563-1.195-1.348-1.195-.79 0-1.312.498-1.348 1.055H5.275c.036-1.137.95-2.115 2.625-2.121 1.594-.012 2.608.885 2.637 2.062.023 1.137-.885 1.776-1.482 1.875v.07c.703.07 1.71.64 1.734 1.917.024 1.459-1.277 2.396-2.93 2.396-1.705 0-2.707-.967-2.754-2.144H6.33c.059.597.68 1.06 1.541 1.066.973.006 1.6-.563 1.588-1.354-.006-.779-.621-1.318-1.541-1.318Z" />
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                            </svg>
                        </LearnMCButton>
                        <LearnMCButton :content="questionState.mcqOptions[3]" :state="getMcqButtonState(3)" @click="onMcqButtonClicked(3)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 mr-2 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M7.519 5.057c.22-.352.439-.703.657-1.055h1.933v5.332h1.008v1.107H10.11V12H8.85v-1.559H4.978V9.322c.77-1.427 1.656-2.847 2.542-4.265ZM6.225 9.281v.053H8.85V5.063h-.065c-.867 1.33-1.787 2.806-2.56 4.218Z" />
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2Zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2Z" />
                            </svg>
                        </LearnMCButton>
                    </div>

                    <template v-else>
                        <div v-if="questionState.hasAnswered && !questionState.frqCorrect" class="max-h-1/4 flex items-center justify-between p-3.5 mb-3.5 text-sm text-emerald-800 border border-emerald-300 rounded-lg bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                            <!-- eslint-disable-next-line vue/no-v-html -->
                            <span class="break-words min-w-0 max-h-full overflow-y-auto custom-scrollbar is-thumb-only" v-html="questionState.frqCorrectDisplay" />
                            <CheckCircleIcon class="w-6 h-6 text-emerald-800 dark:text-emerald-400 shrink-0" />
                        </div>
                        <form @submit.prevent="onFrqSubmit">   
                            <AccentKeyboard v-if="!questionState.hasAnswered && currentSet.accents.length > 0" :accents="currentSet.accents" class="mb-3" @add-accent="onInputAccent" />
                            <div class="relative">
                                <input
                                    ref="frqAnswerInput" v-model="questionState.frqAnswer" type="text"
                                    class="block w-full p-4 text-sm border rounded-lg transition-colors"
                                    :class="{
                                        'text-zinc-900 border-zinc-300 bg-zinc-50 focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white dark:focus:border-primary': !questionState.hasAnswered,
                                        'text-emerald-800 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800': questionState.hasAnswered && questionState.frqCorrect,
                                        'text-rose-800 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800': questionState.hasAnswered && !questionState.frqCorrect
                                    }"
                                    :placeholder="`Type the ${answerWith}...`" required :disabled="questionState.hasAnswered"
                                >
                                <button v-if="!questionState.hasAnswered" type="submit" class="transition-colors text-white absolute right-2.5 bottom-2.5 bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:outline-none focus:ring-emerald-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800">Check</button>
                                <CheckCircleIcon v-else-if="questionState.frqCorrect" class="right-2.5 bottom-3.5 absolute w-6 h-6 text-emerald-800 dark:text-emerald-400" />
                                <XCircleIcon v-else class="right-3.5 bottom-3.5 absolute w-6 h-6 text-rose-800 dark:text-rose-400" />
                            </div>
                        </form>
                    </template>

                    <div class="flex gap-2 items-center flex-wrap">
                        <span><strong>{{ Math.round(percentComplete) }}%</strong> Complete</span>
                        <div class="bg-zinc-200 rounded-full h-2.5 dark:bg-zinc-700 min-w-[10rem] max-w-sm w-1/4">
                            <div class="bg-primary h-2.5 rounded-full" :style="{ 'width': `${percentComplete}%` }" />
                        </div>
                        <button class="ml-auto font-medium mr-2 text-sm opacity-75 hover:opacity-100" :class="{ 'invisible': !questionState.hasAnswered }" @click="overrideResult">
                            Override: I was {{ isCorrect ? "in" : "" }}correct
                        </button>
                        <button
                            type="button"
                            class="border focus:outline-none focus:ring-4 font-medium inline-flex items-center rounded-lg text-sm px-5 py-2.5"
                            :class="questionState.hasAnswered ? 'text-white border-transparent bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800' : 'text-zinc-900 bg-white border-zinc-300 hover:bg-zinc-100 focus:ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700'"
                            @click="onNextButtonClick"
                        >
                            <!--
                                If they haven't answered, "Skip"
                                If they have, and there are terms left, "Next" (There are terms left if upcomingTerms.length > 0, or if we are only in the MCQ sectoin)
                                Else, "Finish"
                            -->
                            {{ !questionState.hasAnswered ? "Skip" : currentSection === "mc" ? "Next" : upcomingTerms.length === 0 ? "Finish" : "Next" }}
                            <ArrowRightIcon class="w-5 h-5 ml-2" aria-hidden="true" />
                        </button>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { StarIcon as StarOutlineIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/vue/24/solid";
import type { TermDefinitionSet, ViewerExtraSetProperties } from "../../types";
import { ref, onMounted, onUnmounted, computed, nextTick, getCurrentInstance } from "vue";
import { getRandomChoices, checkAnswers, showWarningToast, showSuccessToast } from "../../utils";
import { styleAndSanitizeImages } from "../../markdown";
import ImageCarousel from "../../components/set-viewer/ImageCarousel.vue";
import LearnMCButton from "../../components/set-viewer/LearnMCButton.vue";
import { ArrowRightIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/vue/20/solid";
import AccentKeyboard from "../../components/set-viewer/AccentKeyboard.vue";
import StudyModeConfiguration from "../../components/set-viewer/StudyModeConfiguration.vue";

type LearnSection = "mc" | "fr";

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    starredTerms: number[];
}>();

const emit = defineEmits<{
    "toggle-star": [term: number];
    "star-all": [termIndices: number[]];
}>();

const answerWith = ref<"term" | "definition">("term");
const upcomingTerms = ref<number[]>([]);
const currentSection = ref<LearnSection>("mc");
const onlyStarredCheck = ref(false);
const onlyStarred = ref(false);
const frqAnswerInput = ref<HTMLInputElement | null>(null);
const questionState = ref<{
    currentTerm: number;
    // The four MCQ options, or null if we are in the FRQ section
    mcqOptions: [string, string, string, string] | null;
    // The index of the correct MCQ option and the selected one, or null if we are in the FRQ section
    correctMcqOption: number | null;
    selectedMcqOption: number | null;
    // The current FRQ answer, whether it is correct, and the markdown rendered correct answer
    frqAnswer: string;
    frqCorrect: boolean;
    frqCorrectDisplay: string;
    // The markdown rendered question and its images
    question: string;
    questionImages: string[];
    // Whether the user has answered the question
    hasAnswered: boolean;
    isDone: boolean;
}>({
    currentTerm: 0,
    mcqOptions: null,
    correctMcqOption: null,
    selectedMcqOption: null,
    frqAnswer: "",
    frqCorrect: false,
    frqCorrectDisplay: "",
    question: "",
    questionImages: [],
    hasAnswered: false,
    isDone: false
});

const missedTerms = ref<Map<number, { mc: number, fr: number }>>(new Map());
const currentInstance = getCurrentInstance();

const percentComplete = computed(() => {
    const total = onlyStarred.value ? props.starredTerms.length : props.currentSet.terms.length;
    
    // We multiply the total by 2 because we have to go through the set twice (MCQ and FRQ)
    const sectionPercent = (total - upcomingTerms.value.length) / (2 * total);
    return (sectionPercent + (currentSection.value === "fr" ? 0.5 : 0)) * 100;

});

const isCorrect = computed({
    get() {
        if (questionState.value.hasAnswered) {
            if (currentSection.value === "mc") {
                return questionState.value.correctMcqOption === questionState.value.selectedMcqOption;
            } else {
                return questionState.value.frqCorrect;
            }
        } else {
            // If they haven't answered, it's not correct
            return false;
        }
    },
    set(newValue) {
        // Change the result
        if (questionState.value.hasAnswered) {
            if (currentSection.value === "mc") {
                questionState.value.selectedMcqOption = newValue ? questionState.value.correctMcqOption : null;
            } else {
                questionState.value.frqCorrect = newValue;
            }
        }
    }
});

const getDefaultList = () => onlyStarred.value ? props.starredTerms.slice() : props.currentSet.terms.map((_, i) => i);
/** Given a button index, figure out what color it should be */
const getMcqButtonState = (index: number) => {
    if (questionState.value.hasAnswered) {
        if (index === questionState.value.correctMcqOption) {
            return "correct";
        } else if (index === questionState.value.selectedMcqOption) {
            return "incorrect";
        } else {
            return "unclickable";
        }
    } else {
        return "clickable";
    }
};

function restart(section: LearnSection = "mc") {
    currentSection.value = section;
    questionState.value.isDone = false;
    // Make sure we have enough starred terms
    onlyStarred.value = onlyStarredCheck.value && props.starredTerms.length >= 1;
    if (onlyStarredCheck.value && !onlyStarred.value) {
        showWarningToast("You don't have any starred terms.", currentInstance?.appContext, 5000);
        onlyStarredCheck.value = false;
    }
    upcomingTerms.value = getDefaultList();
    if (section === "mc")
        missedTerms.value.clear();
    nextQuestion();
}

function nextQuestion() {
    if (upcomingTerms.value.length === 0) {
        // We're done with the current section
        if (currentSection.value === "mc") {
            restart("fr");
        } else {
            questionState.value.isDone = true;
        }
    } else {
        // Choose the current term
        questionState.value.currentTerm = upcomingTerms.value[Math.floor(Math.random() * upcomingTerms.value.length)]
        const currentTerm = props.currentSet.terms[questionState.value.currentTerm];

        // Get the question (depends on what answer with is) and parse it into markdown
        const questionRaw = currentTerm[answerWith.value === "term" ? "definition" : "term"];
        ({ parsed: questionState.value.question, images: questionState.value.questionImages } = styleAndSanitizeImages(questionRaw));

        questionState.value.hasAnswered = false;

        if (currentSection.value === "mc") {
            // Generate the MCQ options, look them up, and parse them
            const mcqOptionIndices = getRandomChoices(3, props.currentSet.terms.length, questionState.value.currentTerm);
            questionState.value.mcqOptions = mcqOptionIndices.map(i => styleAndSanitizeImages(props.currentSet.terms[i][answerWith.value]).parsed) as [string, string, string, string];
            questionState.value.correctMcqOption = mcqOptionIndices.indexOf(questionState.value.currentTerm);
        } else {
            questionState.value.frqAnswer = "";
            questionState.value.frqCorrect = false;
            questionState.value.frqCorrectDisplay = styleAndSanitizeImages(currentTerm[answerWith.value]).parsed;
            // Once vue updates the DOM, focus the input
            void nextTick().then(() => frqAnswerInput.value?.focus());
        }
    }
}

function applyQuestionResult() {
    if (isCorrect.value) {
        // Remove the current term
        upcomingTerms.value.splice(upcomingTerms.value.indexOf(questionState.value.currentTerm), 1);
    } else {
        // Add the current term again
        upcomingTerms.value.push(questionState.value.currentTerm);
        const questionMissedTerms =
            // get the current term's missed terms, or
            missedTerms.value.get(questionState.value.currentTerm) ??
            // create a new missed terms object and add it to the map
            (missedTerms.value.set(questionState.value.currentTerm, { mc: 0, fr: 0 }), missedTerms.value.get(questionState.value.currentTerm)!);
        questionMissedTerms[currentSection.value]++;
    }
}

function overrideResult() {
    isCorrect.value = !isCorrect.value;
    applyQuestionResult();

    nextQuestion();
}

function starAllMissed() {
    emit("star-all", [...missedTerms.value.keys()]);
    showSuccessToast("All terms starred", currentInstance?.appContext, 5000);
}

function onKeyPress(e: KeyboardEvent) {
    const parsedKey = parseInt(e.key);
    if (parsedKey >= 1 && parsedKey <= 4) {
        onMcqButtonClicked(parsedKey - 1);
    } else if (e.key === "Enter" && document.activeElement?.nodeName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        if (questionState.value.hasAnswered)
            onNextButtonClick();
    }
}

function onInputAccent(accent: string) {
    if (frqAnswerInput.value && frqAnswerInput.value === document.activeElement) {
        // If the user is typing in the input, insert the accent at the cursor
        const { selectionStart, selectionEnd } = frqAnswerInput.value;
        if (selectionStart !== null && selectionEnd !== null)
            frqAnswerInput.value.setRangeText(accent, selectionStart, selectionEnd, (selectionStart === selectionEnd) ? "end" : "preserve");
    } else {
        // Otherwise, append the accent to the end of the input
        questionState.value.frqAnswer += accent;
    }
}

function onNextButtonClick() {
    if (questionState.value.hasAnswered) {
        // Apply the progress
        applyQuestionResult();
        nextQuestion();
    } else {
        // Skip question
        questionState.value.hasAnswered = true;
        questionState.value.selectedMcqOption = null;
        questionState.value.frqCorrect = false;
    }
}

function onMcqButtonClicked(index: number) {
    if (questionState.value.hasAnswered || currentSection.value !== "mc") return;
    questionState.value.hasAnswered = true;
    questionState.value.selectedMcqOption = index;
}

function onFrqSubmit() {
    if (questionState.value.hasAnswered || currentSection.value !== "fr") return;
    questionState.value.hasAnswered = true;
    const correctAnswer = props.currentSet.terms[questionState.value.currentTerm][answerWith.value];
    questionState.value.frqCorrect = checkAnswers(questionState.value.frqAnswer, correctAnswer);
}

onMounted(() => {
    document.body.addEventListener("keypress", onKeyPress, true);
    restart();
});

onUnmounted(() => {
    document.body.removeEventListener("keypress", onKeyPress, true);
});
</script>