<template>
    <div class="flex sm:gap-48 gap-8 justify-between max-w-screen-xl relative">
        <!-- eslint-disable vue/no-v-html -->
        <div ref="questionsDiv">
            <button
                v-for="[question, i], idx in questions" :key="i" type="button"
                class="p-6 block w-full text-left cursor-pointer transition-colors border-2 text-zinc-900 bg-white focus:outline-none hover:bg-zinc-100 focus:ring-2 focus:ring-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-900 dark:focus:ring-zinc-700 rounded-lg mb-6"
                :class="selectedItemLeft === idx ? 'border-primary' : ' border-zinc-200 dark:border-zinc-700'" @click="onSelectItemLeft(idx)" v-html="question"
            />
        </div>
        <div ref="answersDiv">
            <button
                v-for="[answer, i], idx in answers" :key="i" type="button"
                class="p-6 block w-full text-left cursor-pointer transition-colors border-2 text-zinc-900 bg-white focus:outline-none hover:bg-zinc-100 focus:ring-2 focus:ring-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-900 dark:focus:ring-zinc-700 rounded-lg mb-6"
                :class="selectedItemRight === idx ? 'border-primary' : ' border-zinc-200 dark:border-zinc-700'" @click="onSelectItemRight(idx)" v-html="answer"
            />
        </div>
        <!-- eslint-enable vue/no-v-html -->

        <div :style="{ '--x1': questionDivRight, '--x2': answerDivLeft }" class="contents">
            <button
                v-for="[q, a] of matches" :key="`${q}-${a}`" :style="{ '--y1': questionDivPositions[q], '--y2': answerDivPositions[a] }" type="button"
                class="match transition-colors border-y-2"
                :class="{
                    'hover:border-rose-300 hover:bg-rose-50 hover:dark:bg-rose-950 hover:dark:border-rose-800 bg-zinc-100 border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600': !showResult,
                    'border-rose-300 bg-rose-50 dark:bg-rose-950 dark:border-rose-800': showResult && questions[q][1] !== answers[a][1],
                    'border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800': showResult && questions[q][1] === answers[a][1]
                }"
                :disabled="showResult"
                @click="{ matches.delete(q); matchesReverse.delete(a); }"
            />
        </div>
    </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
    questions: (readonly [string, number])[];
    answers: (readonly [string, number])[];
    showResult: boolean;
}>();

const emit = defineEmits<{
    "update:num-correct": [numCorrect: number];
    "update:all-answered": [allAnswered: boolean];
}>();

// Two way mapping of question index to answer index
const matches = ref<Map<number, number>>(new Map()); // Left to right
const matchesReverse = ref<Map<number, number>>(new Map()); // Right to left
const selectedItemLeft = ref(-1);
const selectedItemRight = ref(-1);
const questionsDiv = ref<HTMLDivElement | null>(null);
const answersDiv = ref<HTMLDivElement | null>(null);
const questionDivPositions = ref<number[]>([]);
const answerDivPositions = ref<number[]>([]);
const questionDivRight = ref<number>(0);
const answerDivLeft = ref<number>(0);

function match() {
    if (selectedItemLeft.value === -1 || selectedItemRight.value === -1) {
        return;
    }
    matches.value.set(selectedItemLeft.value, selectedItemRight.value);
    matchesReverse.value.set(selectedItemRight.value, selectedItemLeft.value);
    selectedItemLeft.value = -1;
    selectedItemRight.value = -1;
}

function onSelectItemLeft(i: number) {
    selectedItemLeft.value = i;

    // If we already have a match, remove it
    if (matches.value.has(i)) {
        const j = matches.value.get(i)!;
        matches.value.delete(i);
        matchesReverse.value.delete(j);
    }

    if (selectedItemRight.value !== -1) {
        match();
    }
}

function onSelectItemRight(i: number) {
    selectedItemRight.value = i;

    // If we already have a match, remove it
    if (matchesReverse.value.has(i)) {
        const j = matchesReverse.value.get(i)!;
        matches.value.delete(j);
        matchesReverse.value.delete(i);
    }

    if (selectedItemLeft.value !== -1) {
        match();
    }
}

function updateDivPositions() {
    // Iterate through all the questions and answers and get their positions
    questionDivPositions.value = [...questionsDiv.value!.children].map(question => {
        const el = question as HTMLDivElement;
        return el.offsetTop + el.offsetHeight / 2;
    });

    answerDivPositions.value = [...answersDiv.value!.children].map(answer => {
        const el = answer as HTMLDivElement;
        return el.offsetTop + el.offsetHeight / 2;
    });

    // Get the right edge of the questions div
    questionDivRight.value = questionsDiv.value!.offsetLeft + questionsDiv.value!.offsetWidth;
    answerDivLeft.value = answersDiv.value!.offsetLeft;
}

watch(() => props.questions, () => {
    matches.value = new Map();
    matchesReverse.value = new Map();
    void nextTick().then(updateDivPositions);
});
watch(matches, () => {
    // Iterate through all the matches and check if they are correct by comparing the question and answer
    const numCorrect = [...matches.value.entries()].filter(([q, a]) => props.questions[q][1] === props.answers[a][1]).length;
    emit("update:num-correct", numCorrect);
    emit("update:all-answered", matches.value.size === props.questions.length);
}, { deep: true });

onMounted(() => {
    updateDivPositions();
    window.addEventListener("resize", updateDivPositions);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateDivPositions);
});
</script>

<style>
.match {
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
</style>