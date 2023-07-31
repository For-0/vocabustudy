<template>
    <main>
        <section class="bg-white dark:bg-stone-900 striped-background">
            <div class="grid max-w-screen-xl px-4 py-8 mx-auto lg:gap-8 xl:gap-0 h-[calc(100vh-3rem)] lg:grid-cols-12">
                <div class="mx-auto place-self-center lg:ml-0 lg:col-span-7">
                    <a href="#" class="inline-flex justify-between items-center py-1 px-1 pr-4 mb-4 text-sm text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200" role="alert">
                      <span class="text-xs bg-primary rounded-full text-white px-4 py-1 mr-2">New</span> <span class="text-sm font-medium">UI Overhaul!</span>
                    </a>
                    <h1 class="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-white">Learn Vocabulary,</h1>
                    <h1 class="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-white">For Free.</h1>
                    <p class="max-w-2xl mb-6 font-light text-zinc-300 lg:mb-8 md:text-lg lg:text-xl">Studying, the way it should be.</p>
                    <router-link to="/browse/" class="inline-flex items-center justify-center px-5 py-3 mr-3 text-base font-medium text-center text-white rounded-lg bg-primary hover:bg-primary-alt dark:bg-primary-alt dark:hover:bg-primary focus:ring-4 focus:ring-primary/50">
                        <MagnifyingGlassIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                        Browse Sets
                    </router-link>
                    <router-link to="/login/" class="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-center text-zinc-900 border border-zinc-300 rounded-lg bg-zinc-100 hover:bg-zinc-200 focus:ring-4 focus:ring-zinc-100">
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