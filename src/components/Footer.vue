<template>
    <div class="bg-primary text-white pt-2">
        <div class="mx-auto max-w-screen-xl text-center">
            <div class="mb-2 md-both:pt-6 md-both:mb-4">
                <a href="/" class="flex justify-center items-center md-both:text-2xl font-semibold text-white">
                    <img src="/icons/icon-192.png" alt="Vocabustudy Logo" class="w-4 h-4 md-both:w-8 md-both:h-8 mr-2 shadow shadow-white/25 rounded-lg">
                    Vocabustudy
                    <a href="https://github.com/For-0/vocabustudy/releases" target="_blank">
                        <span class="hidden md-both:inline text-sm px-2 py-1 ml-2 bg-secondary bg-opacity-75 hover:bg-opacity-100 rounded">v{{ currentVersion }}</span>
                        <span class="sr-only">Github releases</span>
                    </a>
                </a>
            </div>
            <ul class="flex flex-wrap justify-center items-center md-both:mb-4 text-white text-sm md-both:text-base gap-x-4 md-both:gap-x-6 mx-10">
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
                <span class="text-xs md-both:text-sm text-white sm:text-center">© 2022-{{ currentYear }} <a href="https://forzero.vocabustudy.org" class="hover:underline">For Zero</a>. All Rights Reserved. 
                    <a href="https://github.com/For-0/vocabustudy" class="text-white hover:text-gray-300 inline-block relative" style="top: 4px;">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
                    </a>
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    const currentYear = YEAR;
    const currentVersion = VERSION;
</script>