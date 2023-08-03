<template>
    <!--
    <div class="bg-primary text-white flex items-stretch justify-evenly text-xs h-11">
        <div class="inline-flex divide-x divide-gray-200 items-center">
            <a class="px-2 py-1 bg-secondary bg-opacity-75 hover:bg-opacity-100 rounded" href="https://github.com/For-0/vocabustudy/releases" target="_blank">v1.6.3</a>
            <span class="ml-2 pl-2">&copy; <span class="hidden-mobile">2022-</span>{{ currentYear }}<span class="hidden-mobile"> For Zero.</span></span>
            <router-link class="underline hover:text-gray-200 ml-2 pl-2" to="/credits/">Credits</router-link>
        </div>
        <div class="inline-flex divide-x divide-gray-200 items-center">
            <router-link class="underline hover:text-gray-200" to="/privacy/">Privacy<span class="hidden-mobile"> Policy</span></router-link>
            <router-link class="underline hover:text-gray-200 ml-2 pl-2" to="/social/">Social</router-link>
        </div>
    </div>
    -->
    <div class="bg-primary text-white pt-2">
        <div class="mx-auto max-w-screen-xl text-center">
            <div class="mb-2 md-both:pt-6 md-both:mb-4">
                <router-link to="/" class="flex justify-center items-center md-both:text-2xl font-semibold text-white">
                    <img src="/icons/icon-192.png" alt="Vocabustudy Logo" class="w-4 h-4 md-both:w-8 md-both:h-8 mr-2 shadow shadow-white/25 rounded-lg"> Vocabustudy <span class="hidden md-both:inline text-sm px-2 py-1 ml-2 bg-secondary bg-opacity-75 hover:bg-opacity-100 rounded" href="https://github.com/For-0/vocabustudy/releases" target="_blank">v{{ currentVersion }}</span>
                </router-link>
            </div>
            <ul class="flex flex-wrap justify-center items-center md-both:mb-4 text-white text-sm md-both:text-base gap-x-4 md-both:gap-x-6">
                <li>
                    <router-link :to="{ name: 'credits' }" class="hover:underline">About Us</router-link>
                </li>
                <li>
                    <a href="https://blog.vocabustudy.org/" class="hover:underline" target="_blank">Blog</a>
                </li>
                <li>
                    <router-link to="/forms" class="hover:underline">Contact</router-link>
                </li>
                <li>
                    <router-link :to="{ name: 'privacy' }" class="hover:underline">Privacy</router-link>
                </li>
                <li>
                    <router-link to="/social" class="hover:underline">Social</router-link>
                </li>
                <li>
                    <router-link :to="{ name: 'support-us' }" class="hover:underline">Support Us</router-link>
                </li>
                <li>
                    <router-link :to="{ name: 'terms' }" class="hover:underline">Terms of Service</router-link>
                </li>
            </ul>
            <div class="bg-primary pb-3">
                <span class="text-xs md-both:text-sm text-white sm:text-center">© 2022-{{  currentYear }} <a href="https://forzero.vocabustudy.org" class="hover:underline">For Zero</a>. All Rights Reserved.</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    const currentYear = YEAR;
    const currentVersion = VERSION;
</script>