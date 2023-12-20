<template>
    <div class="grid gap-4" :class="gridConfig ?? 'grid-cols-2 md:grid-cols-3'">
        <div v-for="collection, i in collections.c" :key="i" class="space-y-2">
            <h5 v-if="typeof collection === 'object'" class="text-black dark:text-white uppercase font-bold text-lg">{{ collection.n }}</h5>
            <CollectionCheckbox
                :id="i.toString()" :model-value="modelValue.includes(i.toString())"
                :name="(typeof collection === 'string' ? collection : 'General')"
                @update:modelValue="newValue => updateSingleState(newValue, i.toString())"
            />
            <template v-if="typeof collection === 'object'">
                <div v-for="subcollection, j in collection.s" :key="`${i}:${j}`" class="flex flex-row items-center relative">
                    <CollectionCheckbox
                        :id="`${i}:${j}`" :model-value="modelValue.includes(`${i}:${j}`)"
                        :name="subcollection" class="grow"
                        @update:modelValue="newValue => updateSingleState(newValue, `${i}:${j}`)"
                    />
                    <button v-if="'o' in collection" class="p-1 ml-1 text-zinc-400 dark:text-zinc-300 hover:bg-zinc-500/50 rounded-md cursor-pointer" type="button" @click.stop="openLevelDropdown(`${i}:${j}`)">
                        <ChevronDownIcon class="w-3 h-3" />
                    </button>
                    <div v-if="'o' in collection && collection.o" class="absolute z-10 w-full top-6 left-0 bg-white divide-y divide-zinc-100 rounded-lg shadow dark:bg-zinc-700 dark:divide-zinc-600" :class="{ 'hidden': visibleLevelDropdown !== `${i}:${j}` }" @click.stop>
                        <ul class="p-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
                            <li v-for="level, k in collection.o" :key="`${i}:${j}:${k}`">
                                <CollectionCheckbox
                                    :id="`${i}:${j}:${k}`" :model-value="modelValue.includes(`${i}:${j}:${k}`)"
                                    :name="level"
                                    @update:modelValue="newValue => updateSingleState(newValue, `${i}:${j}:${k}`)"
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from "@heroicons/vue/20/solid";
import collections from "../assets/collections.json";
import CollectionCheckbox from "./CollectionCheckbox.vue";
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{
    modelValue: string[];
    gridConfig?: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string[]];
}>();

const visibleLevelDropdown = ref<string | null>("");

function closeLevelDropdown() {
    visibleLevelDropdown.value = null;
}

function openLevelDropdown(id: string) {
    if (visibleLevelDropdown.value === id) {
        visibleLevelDropdown.value = null;
    } else {
        visibleLevelDropdown.value = id;
    }
}

function updateSingleState(checked: boolean, collectionId: string) {
    const newList = props.modelValue.filter(id => id !== collectionId);
    if (checked) {
        newList.push(collectionId);
    }
    // If newList is greater than 10, remove items from the front:
    if (newList.length > 10) {
        newList.splice(0, newList.length - 10);
    }
    emit("update:modelValue", newList);
}

onMounted(() => {
    document.addEventListener("click", closeLevelDropdown);
});

onUnmounted(() => {
    document.removeEventListener("click", closeLevelDropdown);
});
</script>