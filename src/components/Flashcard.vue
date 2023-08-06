<template>
    <div ref="root" class="group w-full h-full font-normal text-stone-900 dark:text-white text-xl bg-transparent perspective">
        <div class="relative w-full h-full transition-transform duration-300 preserve-3d" :class="{ 'rotate-y-180': flipped }">
            <div class="flex absolute w-full h-full backface-hidden items-center justify-center p-6 cursor-pointer bg-white border border-stone-200 rounded-lg shadow hover:bg-stone-100 dark:bg-stone-800 dark:border-stone-700 dark:hover:bg-zinc-800">
                <p>{{ front }}</p>
            </div>
            <div class="rotate-y-180 flex absolute w-full h-full backface-hidden items-center justify-center p-6 cursor-pointer bg-white border border-stone-200 rounded-lg shadow hover:bg-stone-100 dark:bg-stone-800 dark:border-stone-700 dark:hover:bg-zinc-800">
                <p>{{ back }}</p>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
defineProps<{
    front: string;
    back: string;
    flipped?: boolean;
}>();

const root = ref<HTMLElement | null>(null);
</script>