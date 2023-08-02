<template>
  <div :class="isHidden ? 'opacity-0' : 'opacity-100'" class="transition-opacity flex items-center w-screen max-w-xs p-4 text-zinc-500 bg-white rounded-lg shadow dark:text-zinc-400 dark:bg-zinc-800" role="alert">
    <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg" :class="colorVariants[iconColor]">
      <component :is="icon" class="w-4 h-4" aria-hidden="true" />
      <span class="sr-only">{{ iconSrText }}</span>
    </div>
    <div class="ml-3 text-sm font-medium">{{ text }}</div>
    <button @click="closeEarly()" type="button" class="ml-auto -mx-1.5 -my-1.5 bg-white text-zinc-400 hover:text-zinc-900 rounded-lg focus:ring-2 focus:ring-zinc-300 p-1.5 hover:bg-zinc-100 inline-flex items-center justify-center h-8 w-8 dark:text-zinc-500 dark:hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-700" aria-label="close">
      <span class="sr-only">Close</span>
      <XMarkIcon class="w-4 h-4 stroke-2" aria-hidden="true" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { type Component } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";

const colorVariants = {
  "green": "text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200",
  "red": "text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200",
  "yellow": "text-yellow-500 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-200",
};

defineProps<{
  iconColor: "green" | "red";
  icon: Component;
  iconSrText: string;
  text: string;
  isHidden: boolean;
  closeEarly(): void;
}>();
</script>