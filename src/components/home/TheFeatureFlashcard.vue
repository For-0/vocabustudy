<template>
    <div class="hidden lg:mt-0 lg:col-span-5 lg:flex flex-col items-center">
        <Flashcard v-bind="featureFlashcardValue" @click="featureFlashcardFlipped = !featureFlashcardFlipped" :flipped="featureFlashcardFlipped" />
        <button
            type="button"
            @click="featureFlashcardFlipped = !featureFlashcardFlipped"
            class="mt-3 flex text-zinc-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">
            <ArrowPathIcon class="w-5 h-5 mr-2" aria-hidden="true" />
            Flip
        </button>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import Flashcard from '../Flashcard.vue';

const featureFlashcardValues = [
    { front: "Civil War", back: "This was America's bloodiest conflict in which over 600,000 people died from 1861 to 1865." },
    { front: "Hurricane", back: "An intense tropical storm, typically forming in late summer over warm, tropical ocean water." },
];

const featureFlashcardValue = featureFlashcardValues[Math.floor(Math.random() * featureFlashcardValues.length)];

const featureFlashcardFlipped = ref(false);
</script>