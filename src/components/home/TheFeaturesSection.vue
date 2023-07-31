<template>
    <section class="bg-zinc-100 dark:bg-zinc-900">
        <div class="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6">
            <div class="max-w-screen-md mb-8 lg:mb-16">
                <h2 class="mb-4 text-4xl tracking-tight font-extrabold text-zinc-900 dark:text-white">Studying, the way it should be.</h2>
                <p class="text-zinc-500 sm:text-xl dark:text-zinc-400">Tired of paywalls, ads, and limited features? We are too. Let's change that.</p>
            </div>
            <div class="space-y-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-12 md:space-y-0">
                <FeatureItem title="Completely free" description="Vocabustudy is part of a mission to create innovative, student-conscious applications for all, for free. We'll never charge you for using our applications." :icon="CurrencyDollarIcon" />
                <FeatureItem title="Simple interface" description="No ads and no promotions. At Vocabustudy, studying is simple and effective, and without distractions." :icon="CursorArrowRaysIcon" />
                <FeatureItem title="Same features" description="Take a test, review flashcards, and even study using our learn mode. The same features at other websites are free at Vocabustudy." :icon="AcademicCapIcon" />
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
import FeatureItem from './FeatureItem.vue';
import { CurrencyDollarIcon, CursorArrowRaysIcon, AcademicCapIcon } from "@heroicons/vue/24/solid"
</script>