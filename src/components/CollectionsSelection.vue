<template>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div v-for="collection, i in collections.c" :key="i" class="space-y-2">
            <h5 class="text-black dark:text-white uppercase font-bold text-lg" v-if="typeof collection === 'object'">{{ collection.n }}</h5>
            <CollectionCheckbox
                :modelValue="modelValue.includes(i.toString())" :id="i.toString()"
                @update:modelValue="newValue => updateSingleState(newValue, i.toString())"
                :name="(typeof collection === 'string' ? collection : 'General')" />
            <template v-if="typeof collection === 'object'">
                <CollectionCheckbox
                    :modelValue="modelValue.includes(`${i}-${j}`)"
                    @update:modelValue="newValue => updateSingleState(newValue, `${i}-${j}`)"
                    v-for="subcollection, j in collection.s" :key="`${i}-${j}`"
                    :id="`${i}:${j}`" :name="subcollection" />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import collections from "../assets/collections.json";
import CollectionCheckbox from "./CollectionCheckbox.vue";

const props = defineProps<{
    modelValue: string[];
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string[]];
}>();

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
</script>