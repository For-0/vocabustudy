<template>
    <div class="shadow dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 dark:bg-zinc-900 border rounded-md p-3 group flex flex-col">
        <div class="mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
            <input
                v-model="questionComputed.question" type="text" placeholder="Question" required
                class="text-base bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-100 rounded focus:ring-0 focus:border-primary focus:dark:border-primary p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50"
            >
        </div>
        <div v-for="_, i in questionComputed.answers" :key="i" class="flex items-center gap-3 mb-3">
            <!-- correct checkbox for multiple choice -->
            <input
                v-if="questionComputed.type === 0" v-model.number="questionComputed.correct" type="checkbox" title="correct"
                :value="i"
                class="w-4 h-4 text-emerald-600 bg-zinc-100 border-zinc-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
            >
            <input
                v-model="questionComputed.answers[i]" type="text" 
                :placeholder="getInputPlaceholder(i)" required
                class="text-sm bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-100 rounded focus:ring-0 focus:border-primary focus:dark:border-primary p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50 grow"
            >
        </div>

        <div class="mb-3 flex">
            <div class="flex items-center mr-4">
                <input :id="`question-mc-${id}`" :checked="questionComputed.type === 0" type="radio" :name="`question-types-${id}`" class="w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600" @change="handleRadioChange($event, 0)">
                <label :for="`question-mc-${id}`" class="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Multiple Choice</label>
            </div>
            <div class="flex items-center mr-4">
                <input :id="`question-sa-${id}`" :checked="questionComputed.type === 1" type="radio" :name="`question-types-${id}`" class="w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600" @change="handleRadioChange($event, 1)">
                <label :for="`question-sa-${id}`" class="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Short Answer</label>
            </div>
        </div>

        <div class="flex items-center justify-between mt-auto">
            <button type="button" title="Move left" class="group-first:invisible bg-transparent border border-zinc-300 hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="$emit('move-left')">
                <ChevronUpIcon class="w-4 h-4 md:-rotate-90" />
                <span class="sr-only">Move left</span>
            </button>
            <div>
                <button type="button" title="Add answer choice" class="mr-2 bg-transparent border dark:text-zinc-400 text-zinc-600 border-zinc-300 hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="questionComputed.answers.push('')">
                    <PlusCircleIcon class="w-4 h-4" />
                    <span class="sr-only">Add answer choice</span>
                </button>
                <button type="button" title="Remove" class="bg-transparent border border-red-700 hover:bg-red-800 text-red-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm p-2.5 dark:border-red-800 dark:text-red-800 dark:hover:text-white dark:hover:bg-red-700 dark:focus:ring-red-900/75 transition-colors" @click="$emit('remove')">
                    <TrashIcon class="w-4 h-4" />
                    <span class="sr-only">Remove</span>
                </button>
            </div>
            <button type="button" title="Move right" class="group-[:nth-last-child(2)]:invisible bg-transparent border border-zinc-300 hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="$emit('move-right')">
                <ChevronDownIcon class="w-4 h-4 md:-rotate-90" />
                <span class="sr-only">Move Right</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon, PlusCircleIcon } from "@heroicons/vue/20/solid";
import type { StudyGuideQuiz } from '../types';

const props = defineProps<{
    question: StudyGuideQuiz["questions"][0];
}>();

const id = crypto.randomUUID();

const emit = defineEmits<{
    "update:question": [value: typeof props["question"]];
    "move-left": [];
    "move-right": [];
    "remove": [];
}>();

const questionComputed = computed({
    get() {
        return props.question;
    },
    set(value) {
        emit("update:question", value);
    }
});

function getInputPlaceholder(index: number) {
    if (questionComputed.value.type === 0) {
        // Multiple choice
        if (index === 0) return "Answer choice";
        else return "Answer choice";
    } else {
        // Short answer
        if (index === 0) return "Correct answer";
        else return "Alternative answer";
    }
}

function handleRadioChange(e: Event, value: 0 | 1) {
    if ((e.target! as HTMLInputElement).checked) {
        questionComputed.value.type = value;
    }
}

onMounted(() => {
    if (props.question.type === 0 && !props.question.correct) {
        // default to the first one being correct
        emit("update:question", {
            ...props.question,
            correct: [0]
        });
    }
});
</script>