<template>
    <div class="flex gap-3 overflow-x-auto custom-scrollbar is-thumb-only">
        <button
            v-for="accent, i in accents" :key="i" type="button" tabindex="-1"
            class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700"
            @mousedown.prevent="$emit('add-accent', accent)"
        >
            {{ accent }}
        </button>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    accents: string[]
}>();

defineEmits<{
    "add-accent": [accent: string]
}>();
</script>