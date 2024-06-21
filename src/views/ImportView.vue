<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow py-3">
        <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">Import</h2>
        <p class="mt-1 text-zinc-500 dark:text-zinc-400">View a set from Quizlet, Quizizz, or Kahoot</p>
        <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
        
        <dl class="max-w-md text-gray-900 divide-y divide-gray-200 dark:text-white dark:divide-gray-700">
            <div class="flex flex-col pb-3">
                <dt class="mb-1 font-semibold text-lg">Quizlet:</dt>
                <dd class="md:text-lg text-gray-500 dark:text-gray-400">
                    Install the Quizlet converter extension:
                    <a class="inline-block mr-2" href="https://chrome.google.com/webstore/detail/eghgpfmnjfjhpfiipnpgmpfiggiejgop/" target="_blank">
                        <img src="../assets/images/chrome-web-store.png" height="72" /> 
                    </a>
                    <a class="inline-block" href="https://go.vocabustudy.org/quizlet-set-converter-firefox" target="_blank">
                        <img src="../assets/images/firefox-get-addon.svg" height="72" />
                    </a>
                    
                </dd>
            </div>
            <div class="flex flex-col py-3">
                <dt class="mb-1 text-gray-500 md:text-lg dark:text-gray-400">Kahoot</dt>
                <dd class="text-lg font-semibold">wip - create and challenges</dd>
            </div>
            <div class="flex flex-col pt-3">
                <dt class="mb-1 text-gray-500 md:text-lg dark:text-gray-400">Quizizz</dt>
                <dd class="text-lg font-semibold">wip</dd>
            </div>
        </dl>
    </main>
</template>
<script setup lang="ts">

</script>
