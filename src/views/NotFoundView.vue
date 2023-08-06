<template>
    <main class="fixed z-30 inset-0 bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white flex-col p-3 text-center">
        <section>
            <div ref="featureFlashcardContainer" class="w-[calc(40vh)] max-w-screen-xl lg:mt-0 lg:col-span-5 lg:flex flex-col items-center aspect-video self-center justify-self-stretch p-6 bg-white/25 rounded-lg" @mouseleave="{ clientX = null; clientY = null; }">
                <Flashcard
                    :style="{ '--x': animX, '--y': animY }"
                    v-bind="featureFlashcardValue"
                    :flipped="featureFlashcardFlipped"
                    class="feature-flashcard transition-transform preserve-3d ease-linear duration-100"
                    @click="featureFlashcardFlipped = !featureFlashcardFlipped"
                    @mousemove="onFlashcardMouseMove"
                />
                <button
                    type="button"
                    class="mt-3 flex text-zinc-900 bg-white border border-stone-300 focus:outline-none hover:bg-stone-100 focus:ring-4 focus:ring-stone-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-stone-800 dark:text-white dark:border-stone-600 dark:hover:bg-stone-700 dark:hover:border-stone-600 dark:focus:ring-stone-700"
                    @click="featureFlashcardFlipped = !featureFlashcardFlipped"
                >
                    <ArrowPathIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                    Flip
                </button>
            </div>
        </section>
        <a href="/" class="mt-3 flex text-zinc-900 bg-white border border-stone-300 focus:outline-none hover:bg-stone-100 focus:ring-4 focus:ring-stone-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-stone-800 dark:text-white dark:border-stone-600 dark:hover:bg-stone-700 dark:hover:border-stone-600 dark:focus:ring-stone-700">Go Home</a>
    </main>
</template>
<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import Flashcard from '../components/Flashcard.vue';

const featureFlashcardValue = { front: "Oops...", back: "This page doesn't exist. 404!" };

const featureFlashcardFlipped = ref(false);
const featureFlashcardContainer = ref<HTMLElement | null>(null);
const animX = computed(() => clientY.value ? (clientY.value - centerY.value) / -15 : 0); // random constant to make sure it doesn't rotate too much
const animY = computed(() => clientX.value ? (clientX.value - centerX.value) / 15 : 0);
const clientX = ref<number | null>(null);
const clientY = ref<number | null>(null);
const centerX = ref(0);
const centerY = ref(0);

function onFlashcardMouseMove(e: MouseEvent) {
    clientX.value = e.clientX;
    clientY.value = e.clientY;
}

function updateFeatureFlashcardCenter() {
    if (!featureFlashcardContainer.value) return;
    const { left, top, width, height } = featureFlashcardContainer.value.getBoundingClientRect();
    centerX.value = left + width / 2;
    centerY.value = top + height / 2;
}

onMounted(() => {
    window.addEventListener('resize', updateFeatureFlashcardCenter);
    document.getElementById("app")?.addEventListener('scrollend', updateFeatureFlashcardCenter);
    updateFeatureFlashcardCenter();
});

onUnmounted(() => {
    window.removeEventListener('resize', updateFeatureFlashcardCenter);
    document.getElementById("app")?.removeEventListener('scrollend', updateFeatureFlashcardCenter);
});
</script>
<style scoped>
.feature-flashcard {
    transform: perspective(1000px) rotateX(calc(1deg * var(--x, 0))) rotateY(calc(1deg * var(--y, 0)));
}
</style>
