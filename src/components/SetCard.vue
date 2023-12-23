<template>
    <div class="max-w-sm flex flex-col items-start p-6 bg-white border border-zinc-200 rounded-lg shadow dark:bg-zinc-800 dark:border-zinc-700 transition duration-300 hover:scale-105">
        <router-link :to="{ name: 'set-detail', params: resolvedId }" class="max-w-full">
            <h3 class="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate" :title="set.name">{{ set.name }}</h3>
        </router-link>
        <!-- Search page - we have the creator -->
        <ProfileDate v-if="creator" class="mb-3" :date="resolvedCreationTime" :profile="creator" />
        <!-- My sets - we have the visibility -->
        <div v-else-if="set.visibility !== undefined" class="text-sm text-zinc-500 dark:text-zinc-400 mb-3" :title="resolvedCreationTime.toLocaleString()">
            Created {{ humanizeDate(resolvedCreationTime) }}
            <span
                class="inline-flex items-center text-xs font-medium mr-3 px-2.5 py-0.5 rounded-full opacity-75"
                :class="visibilityBadgeColors[getVisibility(set.visibility)][0]"
            >
                <span class="w-2 h-2 mr-1 rounded-full" :class="visibilityBadgeColors[getVisibility(set.visibility)][1]" />
                {{ getVisibility(set.visibility) }}
            </span>
        </div>
        <!-- Custom collection, sets by user - we only have creation time -->
        <p v-else class="text-sm text-zinc-500 dark:text-zinc-400 mb-3" :title="resolvedCreationTime.toLocaleString()">Created {{ humanizeDate(resolvedCreationTime) }}</p>
        <div class="mb-3 flex flex-row flex-wrap gap-1 max-h-14 overflow-y-auto custom-scrollbar is-thumb-only opacity-75">
            <span class="bg-emerald-100 text-emerald-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-emerald-800/25 dark:text-emerald-400 border border-emerald-400">
                <HandThumbUpIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                {{ pluralizeWord("like", set.likes.length) }}
            </span>
            <span class="bg-blue-100 text-blue-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-blue-800/25 dark:text-blue-300 border border-blue-300">
                <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                {{ pluralizeWord("term", set.numTerms) }}
            </span>
            <!-- <router-link v-for="collection in parseCollections(set.collections)" :key="collection.id" :to="{ name: 'collection-detail', params: { id: collection.id } }" class="bg-primary/20 text-primary dark:bg-primary/15 text-xs font-medium px-2.5 py-0.5 rounded border border-primary">
                {{ collection.name }}
            </router-link> -->
            <router-link v-for="collection in parseCollections(set.collections)" :key="collection.id" :to="{ name: 'collection-detail', params: { id: collection.id } }" class="bg-violet-100 text-violet-800 dark:text-violet-300 dark:bg-violet-800/25  text-xs font-medium px-2.5 py-0.5 rounded border border-violet-400">
                {{ collection.name }}
            </router-link>
        </div>
        <div v-if="showEditControls" class="flex flex-row flex-wrap gap-2 mt-auto opacity-75">
            <router-link :to="{ name: 'set-detail', params: { id: set.id, type: 'set' } }" class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50">
                View
                <ArrowRightIcon class="w-3.5 h-3.5 ml-2" />
            </router-link>
            <router-link :to="{ name: 'set-editor', params: { id: set.id, type: 'set' } }" class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center border text-yellow-800 border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800 hover:text-yellow-900 hover:bg-yellow-100 hover:border-yellow-400 dark:hover:bg-yellow-900 dark:hover:border-yellow-700 dark:hover:text-yellow-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-yellow-200 dark:focus:ring-yellow-700">
                Edit
                <PencilSquareIcon class="w-3.5 h-3.5 ml-2" />
            </router-link>
            <button class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center border text-rose-800 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 hover:text-rose-900 hover:bg-rose-100 hover:border-rose-400 dark:hover:bg-rose-900 dark:hover:border-rose-700 dark:hover:text-rose-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-red-200 dark:focus:ring-red-700" @click="$emit('delete-set')">
                Delete
                <TrashIcon class="w-3.5 h-3.5 ml-2" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon, PencilSquareIcon, TrashIcon, HandThumbUpIcon, QueueListIcon } from '@heroicons/vue/20/solid';
import type { UserProfile } from '../types';
import { VocabSet } from '../firebase-rest-api/firestore';
import { humanizeDate, parseCollections, pluralizeWord } from '../utils';
import { computed } from 'vue';
import ProfileDate from './ProfileDate.vue';

const visibilityBadgeColors = {
    Public: ["bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", "bg-green-500"],
    Private: ["bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", "bg-yellow-500"],
    Shared: ["bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", "bg-blue-500"],
    Unlisted: ["bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300", "bg-teal-500"],
};

function getVisibility(setVisibility: VocabSet["visibility"]) {
    if (Array.isArray(setVisibility)) {
        return "Shared";
    } else if (setVisibility === 0) {
        return "Private";
    } else if (setVisibility === 1) {
        return "Unlisted";
    } else {
        return "Public";
    }
}

const props = defineProps<{
    set: Pick<VocabSet, "name" | "id" | "collections" | "numTerms" | "likes"   | "createTime"> & Partial<Pick<VocabSet, "visibility" | "creationTime">>
    creator?: UserProfile,
    showEditControls?: boolean
}>();

defineEmits<{
    "delete-set": []
}>();

const resolvedCreationTime = computed(() => props.set.creationTime ?? props.set.createTime);
const resolvedId = computed(() => {
    const parts = props.set.id.split("/");
    if (parts.length === 1) return { id: parts[0], type: "set" };
    else return { id: parts[1], type: parts[0] };
});
</script>