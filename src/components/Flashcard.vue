<template>
    <div class="group w-full h-full font-normal text-zinc-900 dark:text-white text-xl bg-transparent perspective">
        <div class="relative w-full h-full transition-transform duration-300 preserve-3d" :class="{ 'rotate-y-180': flipped }">
            <div class="flex absolute w-full h-full backface-hidden items-center justify-center p-6 cursor-pointer bg-white border border-zinc-200 rounded-lg shadow hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700">
                <p>{{ front }}</p>
            </div>
            <div class="rotate-y-180 flex absolute w-full h-full backface-hidden items-center justify-center p-6 cursor-pointer bg-white border border-zinc-200 rounded-lg shadow hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700">
                <p>{{ back }}</p>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
    defineProps<{
        front: string;
        back: string;
        flipped?: boolean;
    }>();
</script>