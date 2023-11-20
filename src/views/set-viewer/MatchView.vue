<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <PuzzlePieceIcon class="w-6 mr-2" />
            <p class="font-semibold text-lg hidden lg:block">Match</p>
            <h2 class="text-xl font-bold mb-1 text-center mx-auto">{{ currentSet.name }}</h2>
            <router-link :to="{ name: 'set-detail', params: { id: currentSet.pathParts[currentSet.pathParts.length - 1] } }" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </router-link>
        </div>
        <div class="grow flex relative min-h-0">
            <StudyModeConfiguration v-model:only-starred="onlyStarredCheck" answer-with="term" :hide-answer-with="true" @submit.prevent>
                <div class="mb-2">
                    <label for="input-max-questions" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Max Questions:</label>
                    <input id="max-questions" v-model="maxQuestions" type="number" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white dark:focus:border-primary">
                </div>
                <p class="mb-2 text-lg">Time: <strong>{{ currentTime }}s</strong></p>
                <button type="button" class="text-zinc-900 bg-white border mb-2 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="restart()">Restart</button>
            </StudyModeConfiguration>
            <div ref="dragContainer" class="grow m-3 lg:m-6 min-w-0 relative" @dragover="dragEvents.over($event)" @drop="dragEvents.drop($event)">
                <!-- eslint-disable vue/no-v-html -->
                <div
                    v-for="{ x, y, z, selected, text, dragging, matched }, i in items" :key="i" type="button" :style="{ '--x': x, '--y': y, 'z-index': z }"
                    class="max-w-screen-md absolute p-6 drag-item cursor-move transition-colors border-2 text-zinc-900 dark:text-white rounded-lg"
                    :class="{
                        'border-primary': selected === 1, 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-800': selected === 0,
                        'border-emerald-300  dark:border-emerald-800': selected === 2, 'border-rose-300 dark:border-rose-800': selected === 3,
                        'bg-zinc-100 dark:bg-zinc-900': selected !== 0,
                        'hidden': dragging || matched, 'transition-transform': startTime === 0
                    }" draggable="true"
                    @dragstart="dragEvents.start($event, i)" @dragover="dragEvents.over($event, i)" @dragenter="dragEvents.enter(i)"
                    @dragleave="dragEvents.leave(i)" @dragend="dragEvents.end(i)" @drop="dragEvents.drop($event, i)" @click.stop.prevent="dragEvents.click(i)"
                    v-html="text"
                />
            </div>
        </div>
        <!-- Completion modal -->
        <div v-if="matchesNeeded === 0" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30" />
        <div v-show="matchesNeeded === 0" tabindex="-1" aria-hidden="true" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="restart">
                        <XMarkIcon class="w-4 h-4" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="px-6 py-6 lg:px-8">
                        <h3 class="mb-3 text-xl font-medium text-zinc-900 dark:text-white">All done!</h3>
                        <p class="text-zinc-600 dark:text-zinc-300 mb-2">You finished match mode in: <strong>{{ currentTime }} seconds</strong></p>
                    </div>
                    <div class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                        <button class="text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center" type="button" @click="restart">Restart</button>
                        <router-link :to="{ name: 'set-detail', params: { id: currentSet.pathParts[currentSet.pathParts.length - 1] } }" class="ms-3 text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">Close</router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>    
</template>

<script setup lang="ts">
import { XMarkIcon, PuzzlePieceIcon } from "@heroicons/vue/24/outline";
import type { TermDefinitionSet, ViewerExtraSetProperties } from "../../types";
import { ref, onMounted, getCurrentInstance, nextTick } from "vue";
import { showWarningToast, shuffle } from "../../utils";
import { styleAndSanitize } from "../../markdown";
import StudyModeConfiguration from "../../components/set-viewer/StudyModeConfiguration.vue";

// A single match item
interface Item {
    text: string;
    index: number;
    x: number;
    y: number;
    z: number;
    selected: number;
    dragging: boolean; // When this is true the original item should be hidden
    matched: boolean;
}

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    starredTerms: number[];
}>();

const onlyStarredCheck = ref(false);
const maxQuestions = ref(10);
const currentInstance = getCurrentInstance();
const dragContainer = ref<HTMLDivElement | null>(null);
const items = ref<Item[]>([]);
const startTime = ref(0);
const currentTime = ref("0");
const matchesNeeded = ref(0);
let currentZIndex = 0;

function prepareItem(rawText: string, index: number, containerRect: DOMRect) {
    const text = styleAndSanitize(rawText);
    return {
        text,
        x: containerRect.width / 2,
        y: containerRect.height / 2,
        z: 0,
        index,
        selected: 0,
        dragging: false,
        matched: false
    };

}

async function restart() {
    // Make sure we have enough starred terms
    const onlyStarred = onlyStarredCheck.value && props.starredTerms.length > 0;
    if (onlyStarredCheck.value && !onlyStarred) {
        showWarningToast("You don't have any starred terms.", currentInstance?.appContext, 5000);
        onlyStarredCheck.value = false;
    }

    startTime.value = 0;
    currentTime.value = "0";

    const fullTermsList = onlyStarred ? props.starredTerms : props.currentSet.terms.map((_, i) => i);
    shuffle(fullTermsList);

    const containerRect = dragContainer.value?.getBoundingClientRect();
    if (!containerRect) return;

    const termsList = fullTermsList.slice(0, maxQuestions.value);
    items.value = termsList.flatMap(termIndex => [
        prepareItem(props.currentSet.terms[termIndex].term, termIndex, containerRect),
        prepareItem(props.currentSet.terms[termIndex].definition, termIndex, containerRect)
    ]);

    matchesNeeded.value = termsList.length;

    // Wait for all of the items to render
    await nextTick();
    items.value.forEach((item, i) => {
        const element = dragContainer.value?.children[i] as HTMLElement | undefined;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const endX = containerRect.width - rect.width;
        const endY = containerRect.height - rect.height;
        item.x = Math.round(Math.random() * endX);
        item.y = Math.round(Math.random() * endY);
    });

    // Let them move to the new positions befre starting the timer
    await new Promise(resolve => setTimeout(resolve, 150));

    // Start the timer
    startTime.value = Date.now();
    tick();
}

function tick() {
    // If we've matched everything, stop ticking the timer
    if (!matchesNeeded.value) return;
    currentTime.value = ((Date.now() - startTime.value) / 1000).toFixed(1);
    requestAnimationFrame(tick);
}

function match(i: number, j: number) {
    const iItem = items.value[i];
    const jItem = items.value[j];

    if (iItem.index === jItem.index) {
        // Make them green
        iItem.selected = 2;
        jItem.selected = 2;

        matchesNeeded.value--;
        // Fade them out
        dragContainer.value?.children[i].animate([{ opacity: "1" }, { opacity: "0" }], { duration: 300 });
        dragContainer.value?.children[j].animate([{ opacity: "1" }, { opacity: "0" }], { duration: 300 });
    } else {
        iItem.selected = 3;
        jItem.selected = 3;
    }

    setTimeout(() => {
        iItem.selected = 0;
        jItem.selected = 0;

        if (iItem.index === jItem.index) {
            // Hide them
            iItem.matched = true;
            jItem.matched = true;
        }
    }, 300);
}

const dragEvents = {
    start(e: DragEvent, i: number) {
        if (!e.dataTransfer) return;
        // When drag starts

        const item = items.value[i];

        // Make the item look selected (for some reason this stopped working randomly :()
        item.selected = 1;
        // Render it on top
        item.z = ++currentZIndex;
        
        e.dataTransfer.effectAllowed = "linkMove";
        const data = {
            i,
            startX: e.clientX,
            startY: e.clientY
        };
        e.dataTransfer.setData("text/plain", JSON.stringify(data));

        setTimeout(() => item.dragging = true, 0); // If we don't do the settimeout, the drag image will also be hidden
    },
    over(e: DragEvent, dropTarget?: number) {
        e.preventDefault();
        e.stopPropagation();

        if (!e.dataTransfer) return;

        // If the user is dropping on another item, it's like "linking" them
        e.dataTransfer.dropEffect = dropTarget === undefined ? "move" : "link";

        return false;
    },
    end(i: number) {
        items.value[i].dragging = false;
        items.value.filter(item => item.selected === 1).forEach(item => item.selected = 0);
    },
    enter(i: number) {
        items.value[i].selected = 1;
    },
    leave(i: number) {
        items.value[i].selected = 0;
    },
    // dropTarget is undefined if the item wasn't dropped on another item
    drop(e: DragEvent, dropTarget?: number) {
        e.stopPropagation();

        const data = e.dataTransfer?.getData("text/plain");
        if (!data) return;
        const { i, startX, startY } = JSON.parse(data) as { i: number, startX: number, startY: number };

        const src = items.value[i];

        // Move by adding the delta of the mouse position
        src.x += Math.round(e.clientX - startX);
        src.y += Math.round(e.clientY - startY);
        
        if (dropTarget !== undefined && src !== items.value[dropTarget])
            match(i, dropTarget);

        return false;
    },
    click(i: number) {
        // Handle clicks for devices where drag and drop doesn't work
        const existingSelected = items.value.findIndex(item => item.selected === 1);

        if (existingSelected === i) {
            items.value[i].selected = 0;
        } else if (existingSelected === -1) {
            items.value[i].selected = 1;
        } else {
            match(i, existingSelected);
        }
    }
};

onMounted(() => {
    void restart();
});
</script>

<style>
img {
    @apply shadow;
    max-width: 320px;
    border-radius: 0.375rem;
}

@media (max-width: 768px) {
    img {
        max-width: 256px;
    }
}

@media (max-width: 640px) {
    img {
        max-width: 128px;
    }
}

.drag-item {
    transform: translate(calc(var(--x) * 1px), calc(var(--y) * 1px));
}

.drag-item * {
    /* Prevent user from dragging children */
    pointer-events: none;
}
</style>