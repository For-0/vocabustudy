<template>
    <section class="text-gray-900 dark:text:white ml-10 mr-10 lg:ml-20 mt-5" style="max-width: 800px;">
        <h1 class="text-2xl font-extrabold leading-tight text-gray-900 sm:text-xl dark:text-white">{{ title }}</h1>
        <p>{{ description }}</p>
    </section>
</template>
<script setup lang="ts">
defineProps<{
    title?: string,
    description?: string
}>();
</script>