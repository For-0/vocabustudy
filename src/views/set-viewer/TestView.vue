<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <TestIcon class="w-6 mr-2" />
            <p class="font-semibold text-lg hidden lg:block">Test</p>
            <h2 class="text-xl font-bold mb-1 text-center mx-auto">{{ currentSet.name }}</h2>
            <router-link :to="{ name: 'set-detail', params: { id: currentSet.pathParts[currentSet.pathParts.length - 1] } }" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </router-link>
        </div>
        <form class="grow flex relative min-h-0" @submit.prevent="onTestSubmit">
            <StudyModeConfiguration v-model:answer-with="answerWith" v-model:only-starred="onlyStarredCheck" @submit.prevent>
                <p class="font-semibold mb-2">Question Types:</p>
                <div v-for="[k, v] in Object.entries(questionTypes)" :key="k" class="flex items-center mb-2">
                    <input :id="`check-question-types-${k}`" v-model="selectedQuestionTypes" type="checkbox" :value="k" name="check-question-types" class="w-4 h-4 text-primary bg-zinc-100 border-zinc-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                    <label :for="`check-question-types-${k}`" class="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">{{ v }}</label>
                </div>
                <div class="mb-2">
                    <label for="input-max-questions" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Max Questions:</label>
                    <input id="max-questions" v-model="maxQuestions" type="number" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white dark:focus:border-primary">
                </div>
                <button type="button" class="text-zinc-900 bg-white border mb-2 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
                
                <div v-if="showTestResult" class="text-emerald-800 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 border mb-4 font-medium rounded-lg text-sm px-5 py-2.5">
                    <strong>Score:</strong> {{ score }}%
                </div>
                <button v-else type="submit" class="text-white bg-primary hover:bg-primary-alt mb-4 focus:outline-none focus:ring-4 focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5">Submit</button>
            </StudyModeConfiguration>
            <div class="min-w-0 p-3 max-h-full grow overflow-y-auto custom-scrollbar is-thumb-only divide-y divide-zinc-200 dark:divide-zinc-700">
                <div v-if="testState.sa.length" class="py-3">
                    <h2 class="text-xl font-bold mb-2">{{ pluralizeWord(`${questionTypes.sa} Question`, testState.sa.length) }}</h2>
                    <TestShortAnswer v-for="question, i in testState.sa" :id="`sa-${i}`" :key="i" v-bind="question" v-model:answer="question.answer" :accents="currentSet.accents" />
                </div>
                <div v-if="testState.mc.length" class="py-3">
                    <h2 class="text-xl font-bold mb-2">{{ pluralizeWord(`${questionTypes.mc} Question`, testState.mc.length) }}</h2>
                    <TestMultipleChoice v-for="question, i in testState.mc" :key="i" v-bind="question" :show-result="showTestResult" @update:correct="correct => question.isCorrect = correct" />
                </div>
                <div v-if="testState.mt.questions.length" class="py-3">
                    <h2 class="text-xl font-bold mb-2">{{ pluralizeWord(`${questionTypes.mt} Question`, testState.mt.questions.length) }}</h2>
                    <TestMatching v-bind="testState.mt" :show-result="showTestResult" @update:all-answered="v => testState.mt.allAnswered = v" @update:num-correct="v => testState.mt.correctMatches = v" />
                </div>
                <div v-if="testState.tf.length" class="py-3">
                    <h2 class="text-xl font-bold mb-2">{{ pluralizeWord(`${questionTypes.tf} Question`, testState.tf.length) }}</h2>
                    <TestMultipleChoice v-for="question, i in testState.tf" :key="i" :answers="['True', 'False']" :question="question.question" :correct-index="question.correctAnswer ? 0 : 1" :show-result="showTestResult" @update:correct="correct => question.isCorrect = correct" />
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/outline";
import type { TermDefinitionSet, ViewerExtraSetProperties } from "../../types";
import { ref, onMounted, getCurrentInstance, computed } from "vue";
import { showWarningToast, makeRandomGroups, pluralizeWord, getRandomChoices, shuffle, checkAnswers } from "../../utils";
import { styleAndSanitize } from "../../markdown";
import StudyModeConfiguration from "../../components/set-viewer/StudyModeConfiguration.vue";
import TestShortAnswer from "../../components/set-viewer/TestShortAnswer.vue";
import TestMultipleChoice from "../../components/set-viewer/TestMultipleChoice.vue";
import TestMatching from "../../components/set-viewer/TestMatching.vue";
import TestIcon from "../../components/TestIcon.vue";

const questionTypes = { sa: "Short Answer", mc: "Multiple Choice", mt: "Matching", tf: "True/False" } as const;

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    starredTerms: number[];
}>();

const answerWith = ref<"term" | "definition">("term");
const questionWith = computed(() => answerWith.value === "term" ? "definition" : "term");
const onlyStarredCheck = ref(false);
const selectedQuestionTypes = ref(new Set<keyof typeof questionTypes>());
const maxQuestions = ref(20);
const score = ref(0);
const showTestResult = ref(false);
const currentInstance = getCurrentInstance();

const testState = ref<{
    sa: {
        question: string;
        answer: string;
        correctAnswer: string;
        // We only grade the answer at the end, so this gets filled in when the user submits their answer
        // falsy = no status, true = correct, string = incorrect (the string is the correct answer)
        validation?: string | boolean;
        index: number;
    }[];
    mc: {
        question: string;
        answers: string[];
        // We know the correct answer beforehand
        correctIndex: number;
        isCorrect: boolean;
    }[];
    mt: {
        questions: (readonly [string, number])[];
        answers: (readonly [string, number])[];
        correctMatches: number;
        allAnswered: boolean;
    };
    tf: {
        question: string;
        correctAnswer: boolean;
        isCorrect: boolean;
    }[];
}>({
    mc: [],
    sa: [],
    mt: {
        questions: [],
        answers: [],
        correctMatches: 0,
        allAnswered: false
    },
    tf: []
});

function restart() {
    // If the user unchecks all question types, check all of them
    if (selectedQuestionTypes.value.size === 0) {
        for (const k of Object.keys(questionTypes) as (keyof typeof questionTypes)[]) {
            selectedQuestionTypes.value.add(k);
        }
    }

    // Make sure we have enough starred terms
    const onlyStarred = onlyStarredCheck.value && props.starredTerms.length >= 4;
    if (onlyStarredCheck.value && !onlyStarred) {
        showWarningToast("You don't have enough starred terms.", currentInstance?.appContext, 5000);
        onlyStarredCheck.value = false;
    }

    const termsList = onlyStarred ? props.starredTerms : props.currentSet.terms.map((_, i) => i);
    const groups = makeRandomGroups(selectedQuestionTypes.value.size, termsList.length, maxQuestions.value || 20);   

    // SA
    if (selectedQuestionTypes.value.has("sa")) {
        const group = groups.shift()!;
        testState.value.sa = group.map(i => {
            const term = props.currentSet.terms[termsList[i]];
            return {
                question: styleAndSanitize(term[questionWith.value], true),
                answer: "",
                validation: false,
                index: i,
                correctAnswer: term[answerWith.value]
            };
        });
    } else {
        testState.value.sa = [];
    }

    // MC
    if (selectedQuestionTypes.value.has("mc")) {
        const group = groups.shift()!;
        testState.value.mc = group.map(i => {
            // Generate four random numbers from 0 to length of termsList. i is an index of termsList
            const answers = getRandomChoices(3, termsList.length, i);
            const correctIndex = answers.indexOf(i);

            const renderedAnswers = answers.map(j => {
                const term = props.currentSet.terms[termsList[j]];
                return styleAndSanitize(term[answerWith.value]);
            });

            return {
                question: styleAndSanitize(props.currentSet.terms[termsList[i]][questionWith.value]),
                answers: renderedAnswers,
                correctIndex,
                isCorrect: false
            };
        });
    } else {
        testState.value.mc = [];
    }

    // MT
    if (selectedQuestionTypes.value.has("mt")) {
        const group = groups.shift()!;
        // Render the questions and anwers and shuffle them
        const questions = group.map(i => [styleAndSanitize(props.currentSet.terms[termsList[i]][questionWith.value]), i] as const);
        const answers = group.map(i => [styleAndSanitize(props.currentSet.terms[termsList[i]][answerWith.value]), i] as const);
        shuffle(questions);
        shuffle(answers);
        testState.value.mt = {
            questions,
            answers,
            correctMatches: 0,
            allAnswered: false
        };
    } else {
        testState.value.mt = {
            questions: [],
            answers: [],
            correctMatches: 0,
            allAnswered: true // This needs to be true so that we don't prevent the user from submitting tests with no matching questions
        };
    }

    // TF
    if (selectedQuestionTypes.value.has("tf")) {
        const group = groups.shift()!;
        testState.value.tf = group.map(i => {
            const term = styleAndSanitize(props.currentSet.terms[termsList[i]][questionWith.value], true);
            const isTrue = Math.random() < 0.5;
            // Get a random term that is not the same as the current term if isTrue is false
            const otherTerm = styleAndSanitize(props.currentSet.terms[termsList[isTrue ? i : Math.floor(Math.random() * termsList.length)]][answerWith.value], true);
            return {
                question: `${term} = ${otherTerm}`,
                correctAnswer: isTrue,
                isCorrect: false
            };
        });
    } else {
        testState.value.tf = [];
    }

    showTestResult.value = false;
}

function onTestSubmit() {
    if (!testState.value.mt.allAnswered) {
        showWarningToast("You must answer all of the matching questions.", currentInstance?.appContext, 5000);
        return;
    }

    const totalQuestions = testState.value.sa.length + testState.value.mc.length + testState.value.mt.questions.length + testState.value.tf.length;

    // Grade the short answer questions
    for (const question of testState.value.sa) {
        if (checkAnswers(question.answer, question.correctAnswer)) {
            question.validation = true;
        } else {
            question.validation = styleAndSanitize(question.correctAnswer);
        }
    }

    const totalCorrect =
        testState.value.sa.filter(q => q.validation === true).length +
        testState.value.mc.filter(q => q.isCorrect).length +
        testState.value.mt.correctMatches +
        testState.value.tf.filter(q => q.isCorrect).length;

    showTestResult.value = true;
    score.value = Math.round(totalCorrect / totalQuestions * 100);
}

onMounted(() => {
    restart();
});
</script>

<style>
img {
    @apply shadow;
    max-width: 320px;
    border-radius: 0.375rem;
}

@media (max-width: 768px) {
    img {
        max-width: 256px;
    }
}

@media (max-width: 640px) {
    img {
        max-width: 128px;
    }
}

body {
    overflow: hidden;
}
</style>