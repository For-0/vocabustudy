<template>
    <footer class="bg-zinc-100 dark:bg-zinc-800">
        <div class="mx-auto w-full max-w-screen-xl p-4 py-6">
            <div class="md:flex md:justify-between">
                <div class="mb-6 md:mb-0">
                    <router-link to="/" class="flex items-center mb-3">
                        <img src="/icons/icon-192.png" alt="Vocabustudy Logo" class="h-8 me-3 rounded-lg">
                        <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Vocabustudy</span>
                    </router-link>
                    <span class="bg-primary text-white text-sm font-medium px-3 py-1 rounded"><span class="text-xs">v</span>{{ currentVersion }}</span>
                </div>
                <div class="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
                    <div>
                        <h2 class="mb-3 text-sm font-semibold text-zinc-900 uppercase dark:text-white">About us</h2>
                        <ul class="text-zinc-500 dark:text-zinc-400 font-medium">
                            <li class="mb-4">
                                <router-link :to="{ name: 'credits' }" class="hover:underline">Credits</router-link>
                            </li>
                            <li class="mb-4">
                                <a href="https://blog.vocabustudy.org/" class="hover:underline" target="_blank">Blog</a>
                            </li>
                            <li>
                                <router-link :to="{ name: 'support-us' }" class="hover:underline">Support us</router-link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h2 class="mb-3 text-sm font-semibold text-zinc-900 uppercase dark:text-white">Get in touch</h2>
                        <ul class="text-zinc-500 dark:text-zinc-400 font-medium">
                            <li class="mb-4">
                                <router-link :to="{ name: 'social' }" class="hover:underline">Social</router-link>
                            </li>
                            <li>
                                <router-link :to="{ name: 'forms' }" class="hover:underline">Contact</router-link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h2 class="mb-3 text-sm font-semibold text-zinc-900 uppercase dark:text-white">Legal</h2>
                        <ul class="text-zinc-500 dark:text-zinc-400 font-medium">
                            <li class="mb-4">
                                <router-link :to="{ name: 'privacy' }" class="hover:underline">Privacy</router-link>
                            </li>
                            <li>
                                <router-link :to="{ name: 'terms' }" class="hover:underline">Terms</router-link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <hr class="mb-3 mt-6 border-zinc-200 sm:mx-auto dark:border-zinc-700">
            <div class="sm:flex sm:items-center sm:justify-between">
                <span class="text-sm text-zinc-500 sm:text-center dark:text-zinc-400">{{ copyright }}</span>
                <div class="flex mt-4 sm:justify-center sm:mt-0">
                    <a href="https://github.com/For-0/vocabustudy" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-white ms-5">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
                        <span class="sr-only">Github repo</span>
                    </a>
                    <a href="https://go.vocabustudy.org/discord" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-white ms-5">
                        <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 21 16">
                            <path d="M16.942 1.556a16.3 16.3 0 0 0-4.126-1.3 12.04 12.04 0 0 0-.529 1.1 15.175 15.175 0 0 0-4.573 0 11.585 11.585 0 0 0-.535-1.1 16.274 16.274 0 0 0-4.129 1.3A17.392 17.392 0 0 0 .182 13.218a15.785 15.785 0 0 0 4.963 2.521c.41-.564.773-1.16 1.084-1.785a10.63 10.63 0 0 1-1.706-.83c.143-.106.283-.217.418-.33a11.664 11.664 0 0 0 10.118 0c.137.113.277.224.418.33-.544.328-1.116.606-1.71.832a12.52 12.52 0 0 0 1.084 1.785 16.46 16.46 0 0 0 5.064-2.595 17.286 17.286 0 0 0-2.973-11.59ZM6.678 10.813a1.941 1.941 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.919 1.919 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045Zm6.644 0a1.94 1.94 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.918 1.918 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045Z" />
                        </svg>
                        <span class="sr-only">Discord community</span>
                    </a>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
    const currentVersion = VERSION;

    const copyright = `© 2022-${YEAR.toString()} Siddhant Kameswar. All Rights Reserved.`
</script>