<template>
    <section class="bg-stone-200 dark:bg-stone-900">
        <div class="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6">
            <div class="max-w-screen-md mb-8 lg:mb-16">
                <h2 class="mb-4 text-4xl tracking-tight font-extrabold text-stone-900 dark:text-white">Check out these high quality sets:</h2>
            </div>
            <div class="space-y-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
                <SetCard v-for="set, i in featureSets" :key="set.id" :set="set" :creator="profiles[i]" />
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
import SetCard from '../SetCard.vue';
import { useUserProfileCacheStore } from "../../store";

const profileStore = useUserProfileCacheStore();
const featureSets = [
    { id: "abc", name: "Example Set 1", collections: ["1", "2"], numTerms: 5, likes: 1, createTime: new Date(), uid: "8XCSWOHK0DNcsopn7Hh2NLC7kTg5" },
    { id: "cde", name: "Example Set 2", collections: ["4:2:1"], numTerms: 7, likes: 3, createTime: new Date(1649739600000), uid: "ILfkwrZknhJLfPkBxPfuiKedGK5I" }
];
const profiles = await profileStore.getAll(featureSets.map(el => el.uid));
</script>