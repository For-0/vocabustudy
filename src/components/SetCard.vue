<template>
    <div class="max-w-sm flex flex-col items-start p-6 bg-white border border-stone-200 rounded-lg shadow dark:bg-stone-800 dark:border-stone-700 transition duration-300 hover:scale-105">
        <router-link :to="{ name: 'set-detail', params: { id: set.id } }">
            <h5 class="mb-2 text-2xl font-bold tracking-tight text-stone-900 dark:text-white">{{ set.name }}</h5>
        </router-link>
        <div class="flex items-center space-x-4 mb-3">
            <img class="w-10 h-10 rounded-full" :src="creator.photoUrl || defaultPfp" alt="User profile picture">
            <div class="font-medium dark:text-white">
                <div>
                    {{ creator.displayName }}
                    <span class="inline-flex items-center justify-center w-6 h-6 ml-1 text-sm font-semibold text-green-800 bg-green-100 dark:bg-green-700/25 dark:text-green-400 rounded-full" v-if="creator.roles.includes('admin')" title="Admin">
                        <ShieldCheckIcon class="w-3 h-3" />
                        <span class="sr-only">Admin</span>
                    </span>
                </div>
                <div class="text-sm text-stone-500 dark:text-stone-400" :title="set.createTime.toLocaleString()">Created {{ humanizeDate(set.createTime) }}</div>
            </div>
        </div>
        <div class="mb-2 flex flex-row flex-wrap gap-1">
            <span class="bg-green-100 text-green-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-green-800/25 dark:text-green-400 border border-green-400">
                <HandThumbUpIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                {{ pluralizeWord("like", set.likes) }}
            </span>
            <span class="bg-yellow-100 text-yellow-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-yellow-800/25 dark:text-yellow-300 border border-yellow-300">
                <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                {{ pluralizeWord("term", set.numTerms) }}
            </span>
            <router-link v-for="collection in parseCollections(set.collections)" :key="collection.id" :to="{ name: 'collection-detail', params: { id: collection.id } }" class="bg-primary/20 text-primary dark:bg-secondary/10 text-xs font-medium px-2.5 py-0.5 rounded border border-primary">
                {{ collection.name }}
            </router-link>
        </div>
        <router-link :to="{ name: 'set-detail', params: { id: set.id } }" class="mt-auto inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50">
            View
            <ArrowRightIcon class="w-3.5 h-3.5 ml-2" />
        </router-link>
    </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon, HandThumbUpIcon, QueueListIcon, ShieldCheckIcon } from '@heroicons/vue/20/solid';
import type { UserProfile } from '../types';
import { VocabSet } from '../firebase-rest-api/firestore';
import { humanizeDate, parseCollections, pluralizeWord } from '../utils';
import defaultPfp from "../assets/images/default-pfp.svg";

defineProps<{
    set: Pick<VocabSet, "name" | "id" | "collections" | "numTerms" | "likes" | "id" | "createTime">,
    creator: UserProfile
}>();
</script>