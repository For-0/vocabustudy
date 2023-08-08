<template>
    <main>
        <section class="bg-white dark:bg-stone-900 striped-background">
            <div class="grid max-w-screen-xl px-4 py-8 mx-auto lg:gap-8 xl:gap-0 h-[calc(100vh-3rem)] lg:grid-cols-12">
                <div class="mx-auto place-self-center lg:ml-0 lg:col-span-7">
                    <a href="https://github.com/For-0/vocabustudy/releases" class="inline-flex justify-between items-center py-1 px-1 pr-4 mb-4 text-sm text-gray-700 dark:text-white bg-gray-100 dark:bg-stone-900 rounded-full hover:bg-gray-200" role="alert">
                        <span class="text-xs bg-primary rounded-full text-white px-4 py-1 mr-2">UI Refresh</span> <span class="text-sm font-medium">New year, new Vocabustudy.</span>
                    </a>
                    <h1 class="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-white">Learn Vocabulary,</h1>
                    <h1 class="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-white">For Free.</h1>
                    <p class="max-w-2xl mb-6 font-light text-stone-300 lg:mb-8 md:text-lg lg:text-xl">Studying, the way it should be.</p>
                    <router-link to="/search/" class="inline-flex items-center justify-center px-5 py-3 mr-3 text-base font-medium text-center text-white rounded-lg bg-primary hover:bg-primary-alt dark:bg-primary-alt dark:hover:bg-primary focus:ring-4 focus:ring-primary/50">
                        <MagnifyingGlassIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                        Search Sets
                    </router-link>
                    <router-link v-if="!authStore.currentUser" to="/login/" class="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-center text-stone-900 border border-stone-300 rounded-lg bg-stone-100 hover:bg-stone-200 focus:ring-4 focus:ring-stone-100">
                        <UserCircleIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                        Sign Up
                    </router-link> 
                </div>
                <TheFeatureFlashcard />           
            </div>
        </section>
        <section class="bg-zinc-200 dark:bg-stone-900">
            <div class="max-w-screen-xl px-4 py-8 mx-auto text-center lg:py-16 lg:px-6">
                <dl class="grid max-w-screen-md gap-8 mx-auto dark:text-white grid-cols-2 sm:grid-cols-4 text-zinc-900 mb-3">
                    <div class="flex flex-col items-center justify-center">
                        <dt class="mb-2 text-3xl md:text-4xl font-extrabold">{{ stats.uniqueVisitors }}</dt>
                        <dd class="font-light text-zinc-600 dark:text-zinc-400">unique visitors*</dd>
                    </div>
                    <div class="flex flex-col items-center justify-center">
                        <dt class="mb-2 text-3xl md:text-4xl font-extrabold">{{ stats.numCountries }}</dt>
                        <dd class="font-light text-zinc-600 dark:text-zinc-400">countries</dd>
                    </div>
                    <div class="flex flex-col items-center justify-center">
                        <dt class="mb-2 text-3xl md:text-4xl font-extrabold">{{ stats.pageViews }}</dt>
                        <dd class="font-light text-zinc-600 dark:text-zinc-400">views</dd>
                    </div>
                    <div class="flex flex-col items-center justify-center">
                        <dt class="mb-2 text-3xl md:text-4xl font-extrabold">230+</dt>
                        <dd class="font-light text-zinc-600 dark:text-zinc-400">sets created</dd>
                    </div>
                </dl>
                <p class="text-zinc-600 dark:text-zinc-400 mb-3">last 30 days</p>
                <p class="text-zinc-600 dark:text-zinc-400 text-sm">*Number of unique IP addresses</p>
            </div>
        </section>
        <TheFeaturesSection />
        <Suspense v-once>
            <TheSetsSection />
            <template #fallback>
                <div class="bg-stone-200 dark:bg-stone-800">
                    <p class="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6 text-xl text-stone-800 dark:text-stone-200 flex items-center">
                        <Loader class="inline-block h-6 w-6 aspect-square mr-2 text-stone-700 dark:text-stone-300" />
                        Loading featured sets...
                    </p>
                </div>
            </template>
        </Suspense>
    </main>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/vue/24/outline';
import TheFeatureFlashcard from '../components/home/TheFeatureFlashcard.vue';
import TheFeaturesSection from '../components/home/TheFeaturesSection.vue';
import { useAuthStore } from '../store';
import TheSetsSection from '../components/home/TheSetsSection.vue';
import Loader from '../components/Loader.vue';

const authStore = useAuthStore();

const stats = SITE_ANALYTICS;
</script>