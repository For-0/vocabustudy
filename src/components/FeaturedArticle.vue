<template>
    <div class="bg-zinc-100 dark:bg-stone-800 rounded-lg shadow-lg">
        <div class="p-4">
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">{{ title }}</h2>
            <p class="mt-2 mb-5 text-gray-600 dark:text-gray-200">{{ description }}</p>
            <router-link :to="link" class="text-blue-400 hover:text-blue-600">Read More</router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
defineProps<{
    title: string;
    description: string;
    link: string;
}>();
</script>