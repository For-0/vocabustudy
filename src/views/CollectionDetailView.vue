<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div v-if="isLoading" class="w-full h-full flex items-center justify-center dark:text-white text-3xl">
            <Loader class="w-10 h-10 mr-3" :size="2" />
            Loading...
        </div>
        <template v-else-if="collection">
            <!-- Header - title, like -->
            <div class="flex gap-x-3 my-3 text-zinc-900 dark:text-white">
                <h2 class="text-2xl leading-7 sm:text-3xl font-bold grow text-ellipsis overflow-hidden">
                    {{ collection.name }}
                </h2>
                <span class="bg-blue-100 text-blue-800 shrink-0 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-blue-800/25 dark:text-blue-300 border border-blue-300">
                    <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                    {{ pluralizeWord("set", collection.sets.length) }}
                </span>
            </div>
            <div class="flex flex-wrap gap-x-3 mb-3 text-zinc-900 dark:text-white items-start">
                <ProfileDate v-if="creator" :profile="creator" :date="collection.createTime" />
            </div>
            <div class="flex flex-row gap-5 flex-wrap mb-5">
                <SetCard v-for="set in sets" :key="set.id" :set="set" :show-edit-controls="false" />
            </div>
        </template>
        <div v-else class="w-full h-full flex flex-col gap-y-3 md:flex-row items-center justify-center dark:text-white text-3xl">
            <span class="font-bold">Error</span>
            <span class="mx-2 hidden md:inline">|</span>
            This collection could not be found
        </div>
    </main>
</template>

<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Firestore, CustomCollection, VocabSet } from '../firebase-rest-api/firestore';
import { QueueListIcon } from "@heroicons/vue/20/solid";
import Loader from "../components/Loader.vue";
import { pluralizeWord, showErrorToast } from '../utils';
import { type UserProfile } from '../types';
import { useAuthStore, useCacheStore } from "../store";
import ProfileDate from '../components/ProfileDate.vue';
import SetCard from '../components/SetCard.vue';

const collection = ref<CustomCollection | null>(null);
const route = useRoute();
const isLoading = ref(true);
const sets = ref<VocabSet[]>([]);
const currentInstance = getCurrentInstance();
const creator = ref<UserProfile | null>(null);
const cacheStore = useCacheStore();
const authStore = useAuthStore();

async function loadCollection() {
    isLoading.value = true;
    if (route.params.id && typeof route.params.id === "string") {
        collection.value = CustomCollection.fromSingle(await Firestore.getDocument(CustomCollection.collectionKey, route.params.id));
        if (!collection.value) return;
        try {
            const [rawSets, _creator] = await Promise.all([
                // fetch all of the sets
                Firestore.getDocumentsForIds(VocabSet.collectionKey, collection.value.sets, ["name", "numTerms", "collections", "likes", "uid", "nameWords", "creationTime"], authStore.currentUser?.token.access),
                // get the creator's profile
                cacheStore.getProfile(collection.value.uid)
            ]);
            sets.value = VocabSet.fromMultiple(rawSets);
            creator.value = _creator;
            document.title = `${collection.value.name} - Vocabustudy`;
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
    }
    isLoading.value = false;
}

void loadCollection();
</script>