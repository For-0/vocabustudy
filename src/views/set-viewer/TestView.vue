<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 mr-2" viewBox="0 0 640 512" fill="currentColor"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M160 64c0-35.3 28.7-64 64-64H576c35.3 0 64 28.7 64 64V352c0 35.3-28.7 64-64 64H336.8c-11.8-25.5-29.9-47.5-52.4-64H384V320c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32v32h64V64L224 64v49.1C205.2 102.2 183.3 96 160 96V64zm0 64a96 96 0 1 1 0 192 96 96 0 1 1 0-192zM133.3 352h53.3C260.3 352 320 411.7 320 485.3c0 14.7-11.9 26.7-26.7 26.7H26.7C11.9 512 0 500.1 0 485.3C0 411.7 59.7 352 133.3 352z" /></svg>
            <p class="font-semibold text-lg hidden lg:block">Test</p>
            <h2 class="text-xl font-bold mb-1 text-center mx-auto">{{ currentSet.name }}</h2>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </button>
        </div>
        <div class="grow flex relative min-h-0">
            <StudyModeConfiguration v-model:answer-with="answerWith" v-model:only-starred="onlyStarredCheck">
                <p class="font-semibold mb-2">Question Types:</p>
                <div class="flex items-center mb-2">
                    <input id="check-question-types-mc" type="checkbox" value="mc" name="check-question-types" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                    <label for="check-question-types-mc" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">MCQ</label>
                </div>
                <div class="flex items-center">
                    <input checked id="checked-checkbox" type="checkbox" value="" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                    <label for="checked-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Checked state</label>
                </div>
                <button type="button" class="text-zinc-900 bg-white border mb-4 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
            </StudyModeConfiguration>
            <div class="min-w-0 p-3 max-h-full overflow-y-auto custom-scrollbar is-thumb-only">
                
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/outline";
import type { TermDefinitionSet, ViewerExtraSetProperties } from "../../types";
import { ref, onMounted, getCurrentInstance } from "vue";
import { getRandomChoices, checkAnswers, showWarningToast, showSuccessToast } from "../../utils";
import { styleAndSanitizeImages } from "../../markdown";
import StudyModeConfiguration from "../../components/set-viewer/StudyModeConfiguration.vue";

type LearnSection = "mc" | "fr";

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    starredTerms: number[];
}>();

const answerWith = ref<"term" | "definition">("term");
const onlyStarredCheck = ref(false);
const currentInstance = getCurrentInstance();

function restart() {
    // Make sure we have enough starred terms
    const onlyStarred = onlyStarredCheck.value && props.starredTerms.length >= 1;
    if (onlyStarredCheck.value && !onlyStarred) {
        showWarningToast("You don't have any starred terms.", currentInstance?.appContext, 5000);
        onlyStarredCheck.value = false;
    }

    const termsList = onlyStarred ? props.starredTerms : props.currentSet.terms.map((_, i) => i);
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

onMounted(() => {
    restart();
});
</script>