<template>
    <main>
        <section class="bg-white dark:bg-stone-900">
            <div class="grid max-w-screen-xl px-4 py-8 mx-auto lg:gap-8 xl:gap-0 lg:py-16 lg:grid-cols-12">
                <div class="mr-auto place-self-center lg:col-span-7">
                    <h1 class="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl dark:text-white">Learn Vocabulary,</h1>
                    <h1 class="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl dark:text-white">For Free.</h1>
                    <p class="max-w-2xl mb-6 font-light text-zinc-500 lg:mb-8 md:text-lg lg:text-xl dark:text-zinc-400">Studying, the way it should be.</p> 
                    <router-link to="/browse/" class="inline-flex items-center justify-center px-5 py-3 mr-3 text-base font-medium text-center text-white rounded-lg bg-primary hover:bg-opacity-75 focus:ring-4 focus:ring-primary/50">
                        <MagnifyingGlassIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                        Browse Sets
                    </router-link>
                    <router-link to="/login/" class="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-center text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-100 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-700 dark:focus:ring-zinc-800">
                        <UserCircleIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                        Sign Up
                    </router-link> 
                </div>
                <TheFeatureFlashcard />           
            </div>
        </section>
        <TheFeaturesSection />
    </main>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/vue/24/outline';
import TheFeatureFlashcard from '../components/home/TheFeatureFlashcard.vue';
import TheFeaturesSection from '../components/home/TheFeaturesSection.vue';


</script>