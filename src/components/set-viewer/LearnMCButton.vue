<template>
    <button :disabled="state !== 'clickable'" type="button" class="break-words transition-colors max-h-36 md:max-h-64 inline-flex items-center border focus:outline-none focus:ring-4 rounded-lg text-lg px-4 py-3.5" :class="classes[state]" @click="$emit('click')">
        <slot />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="min-w-0 overflow-auto custom-scrollbar is-thumb-only max-h-full" v-html="content" />
    </button>
</template>

<script setup lang="ts">
type ButtonState = "clickable" | "correct" | "incorrect" | "unclickable";

defineProps<{
    state: ButtonState,
    content: string
}>();

defineEmits<{
    click: []
}>();

const classes: Record<ButtonState, string> = {
    clickable: "text-zinc-900 bg-white border-zinc-300 hover:bg-zinc-100 focus:ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700",
    correct: "text-emerald-500 border-emerald-500 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-400",
    incorrect: "text-rose-500 border-rose-500 bg-rose-100 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-400",
    unclickable: "text-zinc-900 bg-white border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 opacity-50"
};
</script>