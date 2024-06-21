<template>
    <div class="mb-3">
        <div class="mb-2 flex gap-1 items-center">
            <CheckIcon v-if="showResult && correctIndices.has(selectedIndex)" class="w-6 h-6 text-emerald-800 dark:text-emerald-400 shrink-0" />
            <XMarkIcon v-else-if="showResult && !correctIndices.has(selectedIndex)" class="w-6 h-6 text-rose-800 dark:text-rose-400 shrink-0" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="font-semibold text-zinc-900 dark:text-white" v-html="question" />
        </div>
        <div class="flex flex-row justify-stretch items-start gap-3 flex-wrap">
            <label
                v-for="answer, i in answers" :key="i"
                class="flex items-center px-4 border rounded"
                :class="getRadioContainerClass(i)"
            >
                <input
                    :id="`${id}-${i}`" v-model="selectedIndex" :value="i" type="radio" :name="id" required :disabled="props.showResult"
                    class="w-4 h-4 outline-none" :class="getRadioClass()"
                >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p :for="`${id}-${i}`" class="w-full py-4 ml-2 text-sm font-medium" v-html="answer" />
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { CheckIcon, XMarkIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
    question: string;
    answers: string[];
    correctIndices: Set<number>;
    showResult: boolean;
}>();

const emit = defineEmits<{
    "update:correct": [value: boolean];
}>();

const id = crypto.randomUUID();
const selectedIndex = ref(-1);

function getRadioContainerClass(i: number) {
    if (props.showResult) {
        if (props.correctIndices.has(i)) {
            return "text-emerald-800 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800";
        } else if (selectedIndex.value === i) {
            return "text-rose-800 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800";
        }
    }
    return "border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";
}

function getRadioClass() {
    return props.showResult ? "text-inherit bg-inherit border-inherit" :
        "text-primary bg-zinc-100 border-zinc-300 focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:focus:border-primary";
}

watch(selectedIndex, (value) => {
    emit("update:correct", props.correctIndices.has(value));
});

// Reset selectedIndex when we hide the result
watch(() => props.showResult, value => {
    if (!value) {
        selectedIndex.value = -1;
    }
});
</script>