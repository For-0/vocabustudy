<template>
    <div class="shadow dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 dark:bg-zinc-900 border rounded-md p-3 group">
        <textarea
            v-model="termComputed" type="text" placeholder="Term"
            rows="2" required
            class="mb-3 custom-scrollbar is-thumb-only text-lg bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-100 rounded focus:ring-0 focus:border-primary focus:dark:border-primary p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50"
        />
        <textarea
            v-model="definitionComputed" type="text" placeholder="Definition"
            rows="3" required
            class="mb-3 custom-scrollbar is-thumb-only text-sm bg-transparent w-full hover:bg-zinc-100 focus:bg-zinc-100 border-2 border-zinc-100 rounded focus:ring-0 focus:border-primary focus:dark:border-primary p-2.5 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:placeholder-zinc-400 dark:border-zinc-800/50"
        />

        <div class="flex items-center justify-between">
            <button type="button" class="group-first:invisible bg-transparent border border-zinc-300 hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:border-gray-600 dark:focus:ring-gray-700" @click="$emit('move-left')">
                <ChevronUpIcon class="w-4 h-4 md:-rotate-90" />
                <span class="sr-only">Move left</span>
            </button>
            <button type="button" class="bg-transparent border border-red-700 hover:bg-red-800 text-red-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm p-2.5 dark:border-red-800 dark:text-red-800 dark:hover:text-white dark:hover:bg-red-700 dark:focus:ring-red-900/75 transition-colors" @click="$emit('remove')">
                <TrashIcon class="w-4 h-4" />
                <span class="sr-only">Remove</span>
            </button>
            <button type="button" class="group-[:nth-last-child(2)]:invisible bg-transparent border border-zinc-300 hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:border-gray-600 dark:focus:ring-gray-700" @click="$emit('move-right')">
                <ChevronDownIcon class="w-4 h-4 md:-rotate-90" />
                <span class="sr-only">Move Right</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
    term: string;
    definition: string;
}>();

const emit = defineEmits<{
    "update:term": [value: string];
    "update:definition": [value: string];
    "move-left": [];
    "move-right": [];
    "remove": [];
}>();

const termComputed = computed({
    get() {
        return props.term;
    },
    set(value) {
        emit("update:term", value);
    }
});

const definitionComputed = computed({
    get() {
        return props.definition;
    },
    set(value) {
        emit("update:definition", value);
    }
});
</script>