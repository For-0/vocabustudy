<template>
    <div class="flex flex-row gap-3 flex-wrap mb-5">
        <SetCard v-for="set in sets" :key="set.id" :set="set" :show-edit-controls="showEditControls" @delete-set="$emit(&quot;delete-set&quot;, set.id)" />
    </div>
    <p v-if="isLoading" class="flex items-center text-zinc-600 dark:text-zinc-300 mb-3 text-lg">
        <Loader :size="2" class="w-6 h-6 mr-2" />
        Loading...
    </p>
    <div v-if="sets.length > 0" class="text-zinc-500 dark:text-zinc-400">
        <button v-if="!isLoading && hasNextPage" type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="$emit('load-more')">Load More</button>
        Loaded <span class="font-bold">{{ sets.length }}</span> sets. ({{ mostRecentTiming }} ms)
    </div>
</template>

<script setup lang="ts">
import SetCard from "./SetCard.vue";
import Loader from "./Loader.vue";
import { type VocabSet } from "../firebase-rest-api/firestore";
import { ref } from "vue";

const isLoading = ref(false);

defineProps<{
    sets: VocabSet[];
    showEditControls: boolean;
    hasNextPage: boolean;
    mostRecentTiming: number;
}>();

defineEmits<{
    "delete-set": [id: string];
    "load-more": []
}>();
</script>