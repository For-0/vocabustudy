<template>
    <div class="mb-3">
        <div class="flex flex-row justify-stretch gap-3">
            <div class="grow max-w-3xl">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <label :for="id" class="block mb-2 font-semibold text-zinc-900 dark:text-white" v-html="question" />
                <div class="relative">
                    <input
                        :id="id" ref="input" :value="answer" type="text" :disabled="!!validation" required
                        class="border text-sm rounded-lg block w-full p-2.5"
                        :class="{
                            'bg-zinc-50 border-zinc-500 text-zinc-900 focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dark:focus:border-primary': !validation,
                            'text-emerald-800 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800': validation === true,
                            'text-rose-800 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800': typeof validation === 'string'
                        }"
                        @change="$emit('update:answer', (<HTMLInputElement>$event.target).value)" @focus="focused = true" @blur="focused = false"
                    >
                    <CheckIcon v-if="validation === true" class="w-6 h-6 text-emerald-800 dark:text-emerald-400 top-1/2 -translate-y-1/2 right-3 absolute" />
                    <XMarkIcon v-else-if="validation" class="w-6 h-6 text-rose-800 dark:text-rose-400 top-1/2 -translate-y-1/2 right-3 absolute" />
                </div>
            </div>
            <div v-if="(typeof validation === 'string')" class="max-w-3xl p-2.5 mt-8 text-sm grow text-emerald-800 border border-emerald-300 rounded-lg bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 relative">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span class="break-words min-w-0 max-h-full overflow-y-auto custom-scrollbar is-thumb-only" v-html="validation" />
                <CheckIcon class="w-6 h-6 text-emerald-800 dark:text-emerald-400 top-1/2 -translate-y-1/2 right-3 absolute" />
            </div>
        </div>
        <AccentKeyboard v-if="focused && accents.length" :accents="accents" tabindex="-1" class="mt-2" @add-accent="onInputAccent" />
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AccentKeyboard from "../../components/set-viewer/AccentKeyboard.vue";
import { CheckIcon, XMarkIcon } from "@heroicons/vue/20/solid";

defineProps<{
    question: string;
    answer: string;
    validation?: string | boolean; // falsy = no status, true = correct, string = incorrect (the string is the correct answer)
    accents: string[];
}>();

defineEmits<{
    "update:answer": [answer: string];
}>();

const id = crypto.randomUUID();
const input = ref<HTMLInputElement | null>(null);
const focused = ref(false);

function onInputAccent(accent: string) {
    if (input.value) {
        // Insert the accent at the cursor
        const { selectionStart, selectionEnd } = input.value;
        if (selectionStart !== null && selectionEnd !== null) {
            input.value.setRangeText(accent, selectionStart, selectionEnd, (selectionStart === selectionEnd) ? "end" : "preserve");
            input.value.dispatchEvent(new InputEvent("change"));
        }
    }
}
</script>