<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <NumberedListIcon class="w-6 mr-2" />
            <p class="font-semibold text-lg hidden lg:block">List</p>
            <h2 class="text-xl font-bold mb-1 text-center mx-auto">{{ currentSet.name }}</h2>
            <router-link :to="{ name: 'set-detail', params: { id: currentSet.pathParts[currentSet.pathParts.length - 1] } }" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </router-link>
        </div>
        <div class="grow flex relative min-h-0">
            <StudyModeConfiguration v-model:answer-with="answerWith" v-model:only-starred="onlyStarredCheck">
                <button type="button" class="text-zinc-900 bg-white border mb-4 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
            </StudyModeConfiguration>
            <div class="flex flex-col grow p-3 lg:p-6 min-w-0" :class="{ 'gap-3': !questionState.isDone }">
                <template v-if="questionState.isDone">
                    <h3 class="text-4xl font-bold">All done!</h3>
                    <p class="opacity-75 mb-4 text-xl">You finished List mode.</p>
                </template>
                <template v-else>
                    <form class="mt-auto" @submit.prevent="onFrqSubmit">
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
                                :placeholder="`Type the ${answerWith}...`" required 
                            >
                            <button v-if="!questionState.hasAnswered" type="submit" class="transition-colors text-white absolute right-2.5 bottom-2.5 bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:outline-none focus:ring-emerald-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800">Check</button>
                            <CheckCircleIcon v-else-if="questionState.frqCorrect" class="right-2.5 bottom-3.5 absolute w-6 h-6 text-emerald-800 dark:text-emerald-400" />
                            <XCircleIcon v-else class="right-3.5 bottom-3.5 absolute w-6 h-6 text-rose-800 dark:text-rose-400" />
                        </div>
                    </form>

                    <div class="flex gap-2 items-center flex-wrap">
                        <span><strong>{{ Math.round(percentComplete) }}%</strong> Complete</span>
                        <div class="bg-zinc-200 rounded-full h-2.5 dark:bg-zinc-700 min-w-[10rem] max-w-sm w-1/4">
                            <div class="bg-primary h-2.5 rounded-full" :style="{ 'width': `${percentComplete}%` }" />
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/outline";
import type { TermDefinitionSet, ViewerExtraSetProperties } from "../../types";
import { ref, computed, nextTick, getCurrentInstance, onMounted } from "vue";
import { checkAnswers, showWarningToast } from "../../utils";
import { styleAndSanitizeImages } from "../../markdown";
import { CheckCircleIcon, XCircleIcon, NumberedListIcon } from "@heroicons/vue/20/solid";
import AccentKeyboard from "../../components/set-viewer/AccentKeyboard.vue";
import StudyModeConfiguration from "../../components/set-viewer/StudyModeConfiguration.vue";

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    starredTerms: number[];
}>();

const answerWith = ref<"term" | "definition">("term");
const upcomingTerms = ref<number[]>([]);
const onlyStarredCheck = ref(false);
const onlyStarred = ref(false);
const frqAnswerInput = ref<HTMLInputElement | null>(null);
const questionState = ref<{
    currentTerm: number;
    // The current FRQ answer, whether it is correct, and the markdown rendered correct answer
    frqAnswer: string;
    frqCorrect: boolean;
    // Whether the user has answered the question
    hasAnswered: boolean;
    isDone: boolean;
}>({
    currentTerm: 0,
    frqAnswer: "",
    frqCorrect: false,
    hasAnswered: false,
    isDone: false
});

const currentInstance = getCurrentInstance();

const percentComplete = computed(() => {
    const total = onlyStarred.value ? props.starredTerms.length : props.currentSet.terms.length;
    
    const sectionPercent = (total - upcomingTerms.value.length) / (total);
    return (sectionPercent) * 100;

});

const getDefaultList = () => onlyStarred.value ? props.starredTerms.slice() : props.currentSet.terms.map((_, i) => i);

function restart() {
    questionState.value.isDone = false;
    // Make sure we have enough starred terms
    onlyStarred.value = onlyStarredCheck.value && props.starredTerms.length >= 1;
    if (onlyStarredCheck.value && !onlyStarred.value) {
        showWarningToast("You don't have any starred terms.", currentInstance?.appContext, 5000);
        onlyStarredCheck.value = false;
    }
    upcomingTerms.value = getDefaultList();
    nextQuestion();
}

function nextQuestion() {
    if (upcomingTerms.value.length === 0) {
       questionState.value.isDone = true;
      
    } else {
        // Choose the current term
        //questionState.value.currentTerm = upcomingTerms.value[Math.floor(Math.random() * upcomingTerms.value.length)]

        questionState.value.hasAnswered = false;

        
        questionState.value.frqAnswer = "";
        questionState.value.frqCorrect = false;
        // Once vue updates the DOM, focus the input
        void nextTick().then(() => frqAnswerInput.value?.focus());
        
    }
}

function onInputAccent(accent: string) {
    if (frqAnswerInput.value && frqAnswerInput.value === document.activeElement) {
        // If the user is typing in the input, insert the accent at the cursor
        const { selectionStart, selectionEnd } = frqAnswerInput.value;
        if (selectionStart !== null && selectionEnd !== null) {
            frqAnswerInput.value.setRangeText(accent, selectionStart, selectionEnd, (selectionStart === selectionEnd) ? "end" : "preserve");
            frqAnswerInput.value.dispatchEvent(new InputEvent("input"));
        }
    } else {
        // Otherwise, append the accent to the end of the input
        questionState.value.frqAnswer += accent;
    }
}

let answeredTimeout = 0;

function onFrqSubmit() {
    clearTimeout(answeredTimeout);
    questionState.value.hasAnswered = true;
    answeredTimeout = setTimeout(() => questionState.value.hasAnswered = false, 500);

    const isCorrect = upcomingTerms.value.find(el => checkAnswers(props.currentSet.terms[el].term, questionState.value.frqAnswer)) ?? null;
    
    if (isCorrect !== null) {
      questionState.value.frqCorrect = true;
      questionState.value.frqAnswer = "";
      upcomingTerms.value = upcomingTerms.value.filter(a => a !== isCorrect);
    } else {
      questionState.value.frqCorrect = false;
    }
}

onMounted(() => {
  restart();
});
</script>
