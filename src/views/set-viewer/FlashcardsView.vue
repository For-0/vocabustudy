<template>
    <div class="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 z-10 flex flex-col text-zinc-800 dark:text-white">
        <!-- Header -->
        <div class="bg-white dark:bg-zinc-800 py-3 px-5 flex items-center shadow z-30 lg:z-auto">
            <AcademicCapIcon class="w-6 h-46 mr-2" /> <!-- TODO: find a better icon (font awesome) -->
            <p class="font-semibold text-lg hidden lg:block">Flashcards</p>
            <div class="text-center mx-auto">
                <h2 class="text-xl font-bold">{{ currentSet.name }}</h2>
                <p class="font-semibold">{{ currentListIndex + 1 }} / {{ currentList.length }} terms</p>
            </div>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white">
                <XMarkIcon class="w-6 h-6" aria-hidden="true" />
                <span class="sr-only">Close</span>
            </button>
        </div>
        <div class="grow flex relative s">
            <div class="w-full absolute lg:static lg:w-48 lg:pb-6 z-30 lg:z-auto">
                <!-- Configuration -->
                <div class="p-3 lg:block bg-zinc-100 dark:bg-zinc-900 flex flex-col items-start" :class="{ 'hidden': !optionsExpanded }">
                    <p class="font-semibold mb-2">Answer With:</p>
                    <div class="flex items-center mb-2">
                        <input id="flashcard-answer-with-term" v-model="answerWith" type="radio" value="term" name="flashcard-answer-with" class="cursor-pointer w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                        <label for="flashcard-answer-with-term" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Term</label>
                    </div>
                    <div class="flex items-center mb-4">
                        <input id="flashcard-answer-with-definition" v-model="answerWith" type="radio" value="definition" name="flashcard-answer-with" class="cursor-pointer w-4 h-4 text-primary bg-zinc-100 border-zinc-300 focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                        <label for="flashcard-answer-with-definition" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Definition</label>
                    </div>
                    <div class="flex items-center mb-4">
                        <input id="flashcard-only-starred" v-model="onlyStarred" type="checkbox" class="cursor-pointer w-4 h-4 text-yellow-500 bg-zinc-100 border-zinc-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600">
                        <label for="flashcard-only-starred" class="cursor-pointer ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">Only Starred</label>
                    </div>
                    <button type="button" class="text-zinc-900 bg-white border mb-4 border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="shuffleList">Shuffle</button>
                    <form class=" mt-auto z-30" @submit.prevent="goToTerm(gotoInputValue! - 1)">
                        <label for="flashcards-goto" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Go To:</label>
                        <div class="relative">
                            <input id="flashcards-goto" v-model="gotoInputValue" required min="1" :max="currentList.length" type="number" class="block w-full p-2 text-zinc-900 border border-zinc-300 rounded-lg bg-zinc-50 sm:text-xs focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white dark:focus:border-primary">
                            <button type="submit" class="text-white absolute right-1 top-1/2 -translate-y-1/2 hover:bg-primary-alt focus:ring-2 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm p-1.5 bg-primary">
                                <ChevronDoubleRightIcon class="w-3 h-3" />
                            </button>
                        </div>
                    </form>
                </div>
                
                <button class="absolute lg:hidden bottom-0 left-1/2 -translate-x-1/2 text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 p-2 rounded-full text-sm inline-flex items-center" type="button" :class="{ 'translate-y-1/2': optionsExpanded, 'translate-y-full rounded-t-none': !optionsExpanded }" @click="optionsExpanded = !optionsExpanded">
                    <ChevronDownIcon class="w-6 h-6 transition-transform" :class="{ 'rotate-180': optionsExpanded }" />
                </button>
            </div>
            <div class="gap-3 lg:gap-6 flex flex-col grow p-3 lg:p-6">
                <div class="grow relative max-w-6xl w-full mx-auto flex items-center justify-center" @click="flip">
                    <!-- There are two flashcards so we can animate them moving in and out -->
                    <Flashcard
                        class="absolute top-50 -translate-x-1/2 transition-all" :flipped="flashcardEl1.flipped" v-bind="getFrontBack(currentSet.terms[flashcardEl1.term])"
                        :class="`${FlashcardPositionClasses.get(flashcardEl1.position)} ${transitionsDisabled ? 'duration-0' : 'duration-300'}`"
                    />
                    <Flashcard
                        class="absolute top-50 -translate-x-1/2 transition-all" :flipped="flashcardEl2.flipped" v-bind="getFrontBack(currentSet.terms[flashcardEl2.term])"
                        :class="`${FlashcardPositionClasses.get(flashcardEl2.position)} ${transitionsDisabled ? 'duration-0' : 'duration-300'}`"
                    />
                    <button class="text-yellow-600 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-500 absolute right-0 top-0 p-1 h-7 w-7 rounded-lg text-sm inline-flex items-center" title="Star" type="button" @click.stop="$emit('toggle-star', currentFlashcard.term)" @keyup.stop>
                        <StarSolidIcon v-if="starredTerms.includes(currentFlashcard.term)" class="w-5 h-5" />
                        <StarOutlineIcon v-else class="w-5 h-5" />
                    </button>
                </div>
                <div class="flex justify-evenly">
                    <!-- Controls -->
                    <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="goToTerm(currentListIndex - 1)">
                        <ArrowLeftIcon class="w-6 h-6" />
                        <span class="sr-only">Previous</span>
                    </button>
                    <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="flip">
                        <ArrowPathIcon class="w-6 h-6" />
                        <span class="sr-only">Flip</span>
                    </button>
                    <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm p-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="goToTerm(currentListIndex + 1)">
                        <ArrowRightIcon class="w-6 h-6" />
                        <span class="sr-only">Next</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon, ArrowLeftIcon, ArrowPathIcon, ArrowRightIcon, ChevronDownIcon, StarIcon as StarOutlineIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/vue/24/solid";
import { ChevronDoubleRightIcon } from "@heroicons/vue/20/solid";
import type { TermDefinitionSet, ViewerExtraSetProperties, UserProfile } from "../../types";
import { ref, onMounted, onUnmounted, watch } from "vue";
import Flashcard from "../../components/Flashcard.vue";
import { shuffle } from "../../utils";

const props = defineProps<{
    currentSet: TermDefinitionSet & ViewerExtraSetProperties;
    creator: UserProfile;
    starredTerms: number[];
}>();

defineEmits<{
    "toggle-star": [term: number]
}>();

const answerWith = ref<"term" | "definition">("definition");
const currentList = ref<number[]>([]);
const onlyStarred = ref(false);
const currentListIndex = ref(0);
const gotoInputValue = ref<number | null>(null);
const optionsExpanded = ref(false);

enum FlashcardElementPosition {
    Left,
    Displayed,
    Right
}

const FlashcardPositionClasses = new Map([
    [FlashcardElementPosition.Left, "opacity-0 -translate-x-screen"],
    [FlashcardElementPosition.Displayed, "opacity-100 translate-x-0"],
    [FlashcardElementPosition.Right, "opacity-0 translate-x-screen"]
]);

const transitionsDisabled = ref(false);

const flashcardEl1 = ref({
    term: 0,
    flipped: false,
    position: FlashcardElementPosition.Displayed
});
const flashcardEl2 = ref({
    term: 0,
    flipped: false,
    position: FlashcardElementPosition.Right
});

let currentFlashcard = flashcardEl1;
let otherFlashcard = flashcardEl2;

const flip = () => currentFlashcard.value.flipped = !currentFlashcard.value.flipped;
const setDefaultList = () => currentList.value = props.currentSet.terms.map((_, i) => i);

function getFrontBack({ term, definition }: TermDefinitionSet["terms"][0]) {
    return answerWith.value === "definition" ? { front: term, back: definition } : { front: definition, back: term };
}

function goToTerm(listIndex: number) {
    if (listIndex < 0 || listIndex >= currentList.value.length) return;

    // Disable transitions so we don't have to wait for the other flashcard to move
    transitionsDisabled.value = true;

    // Move the other flashcard to the side which it will be coming from
    otherFlashcard.value = {
        flipped: false,
        term: currentList.value[listIndex],
        position: listIndex > currentListIndex.value ? FlashcardElementPosition.Right : FlashcardElementPosition.Left
    };

    // Give the other flashcard time to move to the other side if applicable
    setTimeout(() => {
        transitionsDisabled.value = false;

        // Move the current flashcard out.
        // It moves to the left if the term we're going to is greater than the current one
        currentFlashcard.value.position = listIndex > currentListIndex.value ? FlashcardElementPosition.Left : FlashcardElementPosition.Right;
        // Move the other flashcard to the center
        otherFlashcard.value.position = FlashcardElementPosition.Displayed;

        // Switch the references
        [currentFlashcard, otherFlashcard] = [otherFlashcard, currentFlashcard];

        currentListIndex.value = listIndex;
    }, 1);
}

function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowRight") {
        goToTerm(currentListIndex.value + 1);
    } else if (e.code === "ArrowLeft") {
        goToTerm(currentListIndex.value - 1);
    } else if (e.code === "Space") {
        flip();
    }
}

function shuffleList() {
    const list = currentList.value.slice();
    shuffle(list);
    currentList.value = list;
    currentListIndex.value = 0;
    currentFlashcard.value = {
        term: currentList.value[0],
        flipped: false,
        position: FlashcardElementPosition.Displayed
    };
}

onMounted(() => {
    document.body.addEventListener("keyup", onKeyUp);
    setDefaultList();
});

onUnmounted(() => {
    document.body.removeEventListener("keyup", onKeyUp);
});

watch(onlyStarred, value => {
    if (value && props.starredTerms.length > 0) currentList.value = props.starredTerms;
    else setDefaultList();
    currentListIndex.value = 0;
    currentFlashcard.value = {
        term: currentList.value[0],
        flipped: false,
        position: FlashcardElementPosition.Displayed
    };
});
</script>