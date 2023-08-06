<template>
    <div class="flex items-center">
        <input v-model="inputValue" :id="`collection-${id}`" type="checkbox" class="w-4 h-4 bg-zinc-100 border-zinc-300 rounded text-primary focus:ring-primary dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600" />
        <label :for="`collection-${id}`" class="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300">{{ name }}</label>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    id: string;
    name: string;
    modelValue: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

const inputValue = computed<boolean>({
    get() {
        return props.modelValue;
    },
    set(value) {
        emit("update:modelValue", value);
    }
});
</script>