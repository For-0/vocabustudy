<template>
    <div v-if="images.length > 0" class="relative w-full" :class="{ 'lg:h-full lg:w-auto': !alwaysVertical }">
        <!-- Image -->
        <img :src="images[currentImage]" class="block rounded-lg max-h-96 w-full object-cover" :class="{ 'lg:max-w-2xl lg:h-full lg:min-w-[16rem] lg:max-h-none': !alwaysVertical }">
        <!-- Slider indicators -->
        <div v-if="images.length > 1" class="absolute flex space-x-3 -translate-x-1/2 bottom-5 left-1/2">
            <button v-for="_, i in images" :key="i" type="button" class="w-3 h-3 rounded-full" :class="currentImage === i ? 'bg-white dark:bg-zinc-700' : 'bg-white/50 dark:bg-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800'" @click.stop="currentImage = i" />
        </div>
        <!-- Slider controls -->
        <button v-if="images.length > 1" type="button" class="absolute top-0 left-0 flex items-center justify-center h-full px-4 cursor-pointer group/carousel focus:outline-none" @click.stop="next">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 dark:bg-zinc-800/30 group-hover/carousel:bg-white/50 dark:group-hover/carousel:bg-zinc-800/60 group-focus/carousel:ring-4 group-focus/carousel:ring-white dark:group-focus/carousel:ring-zinc-800/70 group-focus/carousel:outline-none">
                <ChevronLeftIcon class="w-4 h-4" />
                <span class="sr-only">Previous</span>
            </span>
        </button>
        <button v-if="images.length > 1" type="button" class="absolute top-0 right-0 flex items-center justify-center h-full px-4 cursor-pointer group/carousel focus:outline-none" @click.stop="prev">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 dark:bg-zinc-800/30 group-hover/carousel:bg-white/50 dark:group-hover/carousel:bg-zinc-800/60 group-focus/carousel:ring-4 group-focus/carousel:ring-white dark:group-focus/carousel:ring-zinc-800/70 group-focus/carousel:outline-none">
                <ChevronRightIcon class="w-4 h-4" />
                <span class="sr-only">Next</span>
            </span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { mod } from "../../utils";
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
    images: string[],
    alwaysVertical?: boolean
}>();

const currentImage = ref(0);

function next() {
    currentImage.value = mod(currentImage.value + 1, props.images.length);
}
function prev() {
    currentImage.value = mod(currentImage.value - 1, props.images.length);
}
</script>