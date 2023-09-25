<!-- eslint-disable vue/no-v-html -->
<template>
    <div ref="root" class="group w-full h-full lg:aspect-video lg:h-auto font-normal text-zinc-900 dark:text-white text-xl bg-transparent perspective">
        <div class="relative w-full h-full transition-transform duration-300 preserve-3d" :class="{ 'rotate-y-180': flipped }">
            <!-- Front -->
            <div class="flex flex-col lg:flex-row gap-6 absolute w-full h-full backface-hidden items-center p-6 cursor-pointer bg-white border border-zinc-200 rounded-lg shadow-sm hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-stone-800">
                <FlashcardImageCarousel :images="frontImages" />
                <p class="lg:grow max-w-full break-words max-h-full overflow-y-auto custom-scrollbar is-thumb-only text-center my-auto" v-html="parsedFront" />
            </div>
            <!-- Back -->
            <div class="rotate-y-180 flex flex-col lg:flex-row gap-6 absolute w-full h-full backface-hidden items-center p-6 cursor-pointer bg-white border border-zinc-200 rounded-lg shadow-sm hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-stone-800">
                <FlashcardImageCarousel :images="backImages" />
                <p class="lg:grow max-w-full break-words max-h-full overflow-y-auto custom-scrollbar is-thumb-only text-center my-auto" v-html="parsedBack" />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import FlashcardImageCarousel from "./set-viewer/FlashcardImageCarousel.vue";
import { styleAndSanitizeImages } from "../markdown";
const props = defineProps<{
    front: string;
    back: string;
    flipped?: boolean;
}>();

const root = ref<HTMLElement | null>(null);
const parsedFront = ref("");
const frontImages = ref<string[]>([]);
const parsedBack = ref("");
const backImages = ref<string[]>([]);

parseMarkdown();

function parseMarkdown() {
    ({ parsed: parsedFront.value, images: frontImages.value } = styleAndSanitizeImages(props.front, true));
    ({ parsed: parsedBack.value, images: backImages.value } = styleAndSanitizeImages(props.back, true));
}

watch([() => props.front, () => props.back], () => { parseMarkdown(); });
</script>