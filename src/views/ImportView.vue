<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow py-3">
        <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">Import</h2>
        <p class="mt-1 text-zinc-500 dark:text-zinc-400">View a set from Quizlet, Quizizz, or Kahoot</p>
        <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
        
        <dl class="max-w-md text-zinc-900 divide-y divide-zinc-200 dark:text-white dark:divide-zinc-700">
            <div class="flex flex-col pb-3">
                <dt class="mb-1 font-semibold text-lg">Quizlet:</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">
                    <p>Install the Quizlet converter extension:</p>
                    <a class="inline-block mr-2 mb-1" href="https://chrome.google.com/webstore/detail/eghgpfmnjfjhpfiipnpgmpfiggiejgop/" target="_blank">
                        <img src="../assets/images/chrome-web-store.png" class="h-16" /> 
                    </a>
                    <a class="inline-block mb-1" href="https://go.vocabustudy.org/quizlet-set-converter-firefox" target="_blank">
                        <img src="../assets/images/firefox-get-addon.svg" class="h-16" />
                    </a>
                    <p class="mb-1">Then, go to <kbd class="px-1.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded-lg dark:bg-zinc-600 dark:text-zinc-100 dark:border-zinc-500">https://vocabustudy.org/quizlet/&lt;ID&gt;</kbd>.</p>
                    <p>If you can't install extensions, try the <router-link to="/quizlet/source" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">source import</router-link>.</p>
                </dd>
            </div>
            <div class="flex flex-col py-3">
                <dt class="mb-1 font-semibold text-lg">Kahoot:</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">
                    We support URLs of these formats:<br>
                    <kbd class="px-1.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded-lg dark:bg-zinc-600 dark:text-zinc-100 dark:border-zinc-500">https://create.kahoot.it/details/&lt;ID&gt;/</kbd><br>
                    <kbd class="px-1.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded-lg dark:bg-zinc-600 dark:text-zinc-100 dark:border-zinc-500">https://kahoot.it/challenge/&lt;ID&gt;/</kbd><br>
                    <kbd class="px-1.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded-lg dark:bg-zinc-600 dark:text-zinc-100 dark:border-zinc-500">https://kahoot.it/challenge/&lt;CODE&gt;?challenge-id=&lt;ID&gt;/</kbd><br>
                    
                    <!-- prompt the user to input a url here -->
                    <form class="max-w-md mx-auto mt-3" id="kahoot-form" @submit.prevent="onKahootSubmit">   
                        <div class="relative">
                            <input v-model="kahootUrl" type="url" class="block w-full p-4 text-sm text-zinc-900 border border-zinc-300 rounded-lg bg-zinc-50 focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white" placeholder="Kahoot URL" required />
                            <button type="submit" class="text-white absolute end-2.5 bottom-2.5 bg-primary hover:bg-primary-alt dark:bg-primary-alt dark:hover:bg-primary focus:ring-4 focus:ring-primary/50 focus:outline-none font-medium rounded-lg text-sm px-4 py-2">Go</button>
                        </div>
                    </form>
                </dd>
            </div>
            <div class="flex flex-col pt-3">
                <dt class="mb-1 font-semibold text-lg">Kahoot:</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">wip - create and challenges</dd>
            </div>
        </dl>
    </main>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const kahootUrl = ref("");
const router = useRouter();

function b64URLEncode(data: string) {
    return window.btoa(data).replaceAll("+", "-").replaceAll("/", "_");
}

function onKahootSubmit() {
    router.push(`/import/${b64URLEncode(kahootUrl.value)}`)
}
</script>
