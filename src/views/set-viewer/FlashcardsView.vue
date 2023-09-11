<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow">
            <AcademicCapIcon class="w-6 h-46 mr-2" /> <!-- TODO: find a better icon (font awesome) -->
            <p class="font-semibold text-lg">Flashcards</p>
            <div class="text-center mx-auto">
                <h2 class="text-xl font-bold">{{ currentSet.name }}</h2>
                <p class="font-semibold">{{ currentFlashcard }} / {{ currentSet.terms.length }} terms</p>
            </div>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </button>
        </div>
        <div class="grow m-3 flex">
            <div>
                <p class="font-semibold">Answer With:</p>
            </div>
            <div class="gap-3 flex flex-col">
                <div class="grow"><!--flashcards--></div>
                <div class="flex justify-between">
                    <!--buttons-->
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import type { PartialSetForViewer, UserProfile } from "../../types";
import { ref } from "vue";

defineProps<{
    currentSet: PartialSetForViewer;
    creator: UserProfile;
    starredTerms: number[];
}>();

const currentFlashcard = ref(1);
</script>