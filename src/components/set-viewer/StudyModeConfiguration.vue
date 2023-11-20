<template>
    <div class="w-full absolute lg:static lg:w-48 lg:pb-6 z-30 lg:z-auto shrink-0">
        <!-- Configuration -->
        <div class="p-3 lg:block bg-zinc-100 dark:bg-zinc-900 flex flex-col items-start lg:bg-transparent border-b-4 lg:border-b-0 border-zinc-200 dark:border-zinc-700" :class="{ 'hidden': !optionsExpanded }">
            <p class="font-semibold mb-2">Answer With:</p>
            <div class="flex items-center mb-2">
                <input id="radio-answer-with-term" v-model="_answerWith" type="radio" value="term" name="radio-answer-with" class="cursor-pointer w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                <label for="radio-answer-with-term" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Term</label>
            </div>
            <div class="flex items-center mb-4">
                <input id="radio-answer-with-definition" v-model="_answerWith" type="radio" value="definition" name="radio-answer-with" class="cursor-pointer w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                <label for="radio-answer-with-definition" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Definition</label>
            </div>
            <div class="flex items-center mb-4">
                <input id="check-only-starred" v-model="_onlyStarred" type="checkbox" class="cursor-pointer w-4 h-4 text-yellow-500 bg-zinc-100 border-zinc-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                <label for="check-only-starred" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Only Starred</label>
            </div>
            <slot />
        </div>
        <button class="absolute lg:hidden bottom-0 left-1/2 -translate-x-1/2 text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-2 border-t-0 border-zinc-200 dark:border-zinc-700 p-2 rounded-full text-sm inline-flex items-center" type="button" :class="{ 'translate-y-1/2': optionsExpanded, 'translate-y-full rounded-t-none': !optionsExpanded }" @click="optionsExpanded = !optionsExpanded">
            <ChevronDownIcon class="w-6 h-6 transition-transform" :class="{ 'rotate-180': optionsExpanded }" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDownIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{
    answerWith: "term" | "definition";
    onlyStarred: boolean;
}>();

const emit = defineEmits<{
    "update:answerWith": [value: "term" | "definition"];
    "update:onlyStarred": [value: boolean];
}>();

const optionsExpanded = ref(false);

const _answerWith = computed({
    get() {
        return props.answerWith;
    },
    set(value) {
        emit("update:answerWith", value);
    }
});

const _onlyStarred = computed({
    get() {
        return props.onlyStarred;
    },
    set(value) {
        emit("update:onlyStarred", value);
    }
});
</script>