<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div v-if="userProfile" class="my-3">
            <div class="flex items-center gap-4">
                <img class="w-10 h-10 rounded-full" :src="userProfile.photoUrl || defaultPfp" alt="User profile picture">
                <div class="min-w-0">
                    <h2 class="text-2xl font-bold leading-7 text-zinc-900 truncate sm:text-3xl sm:tracking-tight dark:text-white">{{ userProfile.displayName }}</h2>
                    <p class="mt-1">
                        <span v-if="userProfile.roles.includes('admin')" class="bg-emerald-100 text-emerald-800 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-emerald-800/25 dark:text-emerald-400 border border-emerald-400">
                            <ShieldCheckIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                            Admin
                        </span>
                    </p>
                </div>
            </div>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
            <SetPagination class="w-full" :sets="sets" :show-edit-controls="true" :has-next-page="hasNextPage" :most-recent-timing="mostRecentTiming" :is-loading="isLoading" :group-by-month="true" @load-more="loadNext" />
        </div>
        <div v-else class="w-full h-full flex items-center justify-center dark:text-white text-3xl">
            <Loader class="w-10 h-10 mr-3" :size="2" />
            Loading...
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';
import { VocabSet, QueryBuilder, Firestore } from '../firebase-rest-api/firestore';
import { showErrorToast } from '../utils';
import SetPagination from '../components/SetPagination.vue';
import type { UserProfile } from '../types';
import { useCacheStore } from '../store';
import { ShieldCheckIcon } from '@heroicons/vue/20/solid';
import Loader from '../components/Loader.vue';
import defaultPfp from "../assets/images/default-pfp.svg";

const userProfile = ref<UserProfile | null>(null);
const cacheStore = useCacheStore();
const route = useRoute();
const isLoading = ref(true);
const currentInstance = getCurrentInstance();
const mostRecentTiming = ref(0);
const sets = ref<VocabSet[]>([]);
const hasNextPage = ref(true);

async function loadNext() {
    isLoading.value = true;
    if (userProfile.value && hasNextPage.value) {
        const query = new QueryBuilder()
            .select("collections", "likes", "name", "numTerms", "creationTime")
            .orderBy(["creationTime", "__name__"], "DESCENDING")
            .where("visibility", "EQUAL", 2)
            .where("uid", "EQUAL", route.params.uid)
            .from(VocabSet.collectionKey)
            .limit(10);

        if (sets.value.length > 0) {
            const lastSet = sets.value[sets.value.length - 1];
            query.startAt([lastSet.creationTime, lastSet.pathParts.join("/")]);
        }
        try {
            const start = Date.now();
            const results = VocabSet.fromMultiple(await Firestore.getDocuments(query.build()));
            mostRecentTiming.value = Date.now() - start;
            if (results.length < 10) {
                hasNextPage.value = false;
            }
            sets.value = sets.value.concat(results);
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isLoading.value = false;
}

void cacheStore.getProfile(route.params.uid as string).then(async profile => {
    userProfile.value = profile;
    document.title = `${profile.displayName} - Vocabustudy`;
    await loadNext();
})
</script>