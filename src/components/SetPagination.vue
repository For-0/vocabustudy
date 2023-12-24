<template>
    <div v-if="groupByMonth" v-bind="$attrs">
        <div v-for="[month, monthSets] of groupedSets!.entries()" :key="month" class="mb-5">
            <div class="flex mb-3 gap-3 items-center">
                <h3 class="text-sm uppercase text-zinc-600 dark:text-zinc-400">{{ month }}</h3>
                <hr class="grow h-px bg-zinc-200 border-0 dark:bg-zinc-700">
            </div>
            <div class="flex flex-row gap-5 flex-wrap mb-5">
                <SetCard v-for="[set, i] in monthSets" :key="set.id" :set="set" :creator="creators?.[i]" :show-edit-controls="showEditControls" @delete-set="$emit('delete-set', set.id)" />
            </div>
        </div>
    </div>
    <div v-else class="flex flex-row gap-5 flex-wrap mb-5" v-bind="$attrs">
        <SetCard v-for="set, i in sets" :key="set.id" :set="set" :creator="creators?.[i]" :show-edit-controls="showEditControls" @delete-set="$emit('delete-set', set.id)" />
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
import { type UserProfile } from "../types";
import { computed } from "vue";

const props = defineProps<{
    sets: VocabSet[];
    creators?: UserProfile[];
    showEditControls: boolean;
    hasNextPage: boolean;
    mostRecentTiming: number;
    isLoading: boolean;
    groupByMonth?: boolean;
}>();

defineEmits<{
    "delete-set": [id: string];
    "load-more": []
}>();

const groupedSets = computed(() => {
    if (props.groupByMonth) {
        const grouped = new Map<string, [VocabSet, number][]>();
        for (const [i, set] of props.sets.entries()) {
            const key = set.creationTime.toLocaleDateString(undefined, { month: "long", year: "numeric" });
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)?.push([set, i]);
        }
        return grouped;
    } else {
        return null;
    }
});

</script>