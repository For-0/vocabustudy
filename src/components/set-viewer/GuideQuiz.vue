<template>
    <form class="divide-y divide-zinc-200 dark:divide-zinc-700" @submit.prevent="onTestSubmit">
        <template v-for="question, i in questions" :key="i">
            <TestMultipleChoice
                v-if="question.type === 0" v-model:correct="question.isCorrect" :answers="question.answers" :correct-index="question.correctIndex"
                :question="question.question" :show-result="showResult" class="py-3"
            />
            <TestShortAnswer
                v-else v-model:answer="question.answer" :accents="props.accents" :validation="question.validation" :question="question.question"
                :show-result="showResult" class="py-3"
            />
        </template>

        <!-- Results -->
        <div v-if="showResult" class="flex pt-3 gap-3 items-stretch">
            <div class="text-emerald-800 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 border font-medium rounded-lg text-sm px-5 py-2.5">
                <strong>Score:</strong> {{ score }}%
            </div>
            <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
        </div>
        
        <button v-else type="submit" class="text-white bg-primary hover:bg-primary-alt mb-4 focus:outline-none focus:ring-4 focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5">Submit</button>
    </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { StudyGuideQuiz } from '../../types';
import TestMultipleChoice from "./TestMultipleChoice.vue";
import TestShortAnswer from './TestShortAnswer.vue';
import { styleAndSanitize } from '../../markdown';
import { shuffle, checkAnswers } from '../../utils';

const props = defineProps<{
    accents: string[];
    quiz: StudyGuideQuiz;
}>();

const questions = ref<({
    type: 0;
    question: string;
    answers: string[];
    correctIndex: number;
    isCorrect: boolean;
} | {
    type: 1;
    question: string;
    answer: string;
    validation: string | boolean;
})[]>([]);

const showResult = ref(false);
const score = ref(0);

// Regenerate the quiz
function restart() {
    questions.value = props.quiz.questions.map(question => {
        if (question.type === 0) {
            // Randomize the answer order
            const answerOrder = question.answers.map((_, i) => i);
            shuffle(answerOrder);

            return {
                type: 0,
                question: styleAndSanitize(question.question, true),
                answers: answerOrder.map(i => styleAndSanitize(question.answers[i], true)),
                correctIndex: answerOrder.indexOf(0), // The correct answer is always the first one
                isCorrect: false
            };
        } else {
            return {
                type: 1,
                question: styleAndSanitize(question.question, true),
                answer: "",
                validation: false
            };
        }
    });

    showResult.value = false;
}

function onTestSubmit() {
    const numCorrect = questions.value.filter((question, i) => {
        if (question.type === 0) {
            /* Multiple choice */
            return question.isCorrect;
        } else {
            /* Short answer - we need to grade these */
            const isCorrect = props.quiz.questions[i].answers.some(answer => checkAnswers(question.answer, answer));
            question.validation = isCorrect ? true : styleAndSanitize(props.quiz.questions[i].answers[0], true);

            return isCorrect;
        }
    }).length;

    score.value = Math.round(numCorrect / questions.value.length * 100);
    showResult.value = true;
}

watch(() => props.quiz, () => { restart() }, { immediate: true });
</script>