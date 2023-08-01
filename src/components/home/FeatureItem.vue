<template>
    <div>
        <div class="flex justify-center items-center mb-4 w-10 h-10 lg:h-12 lg:w-12 bg-primary/25 dark:bg-primary/10 rounded-full">
            <component :is="icon" class="w-5 h-5 text-primary lg:w-6 lg:h-6"></component>
        </div>
        <h3 class="mb-2 text-xl font-bold dark:text-white">{{ title }}</h3>
        <p class="text-stone-500 dark:text-stone-400">{{ description }}</p>
    </div>
</template>

<script setup lang="ts">
import type { FunctionalComponent } from 'vue';

defineProps<{
    title: string;
    description: string;
    icon: FunctionalComponent;
}>();
</script>