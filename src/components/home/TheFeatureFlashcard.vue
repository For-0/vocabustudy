<template>
    <div ref="featureFlashcardContainer" class="hidden lg:mt-0 lg:col-span-5 lg:flex flex-col items-center aspect-video self-center justify-self-stretch p-6 bg-white/25 rounded-lg" @mouseleave="{ clientX = null; clientY = null; }">
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
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import Flashcard from '../Flashcard.vue';

// Note: No pictures because they mess up the initial homepage load time
const featureFlashcardValues = [
    { front: "What is a hurricane?", back: "An intense tropical storm, typically forming in late summer over warm, tropical ocean water." },
    { front: "When does water reach its boiling point?", back: "Water reaches its boiling point at 100° Celsius, or 212° Fahrenheit." },
    { front: "Why are giraffes' tongues black?", back: "Giraffes have extra melanin on their tongues, protecting them from sunburns." },
    { front: "When was the Grand Canyon declared a UNESCO World Heritage Site?", back: "It was granted UNESCO status in 1979." },
    { front: "What is sublimation?", back: "Sublimation is the transition of a substance directly from a solid state to a gas state." },
    { front: "Approximately how much of plastic produced is recycled?", back: "Only 9%!" },
    { front: "What was the lowest temperature ever recorded on Earth?", back: "The lowest temperature ever recorded on Earth was -89.2 °C (-128.6 °F; 184.0 K) on July 21, 1983 in Antartica." },
];

const featureFlashcardValue = featureFlashcardValues[Math.floor(Math.random() * featureFlashcardValues.length)];

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