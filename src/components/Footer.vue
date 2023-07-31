<template>
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
</template>

<script setup lang="ts">
    const currentYear = import.meta.env.YEAR;
</script>