<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div class="my-3">
            <div>
                <h2 class="text-2xl leading-7 text-zinc-900 sm:text-3xl dark:text-white flex flex-wrap mb-3">
                    <input
                        v-model="setName" type="text" required
                        class="bg-transparent text-2xl sm:text-3xl hover:bg-zinc-50 focus:bg-zinc-50 border-2 border-zinc-50 text-zinc-900 rounded-lg focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2.5 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:border-zinc-800 dark:text-white"
                    >
                    <div class="m-3 relative">
                        <button id="visibility-dropdown" class="text-white border border-primary bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center w-full h-full" type="button" @click.stop="visibilityDropdownOpen = !visibilityDropdownOpen">
                            Visibility
                            <ChevronDownIcon class="w-4 h-4 ml-1" />
                        </button>
                        <div class="z-10 absolute m-0 inset-x-0 inset-y-auto bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 mt-3" :class="visibilityDropdownOpen ? 'block' : 'hidden'">
                            <ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
                                <li id="dropdown-private">
                                    <button type="button" class="block w-full text-left px-4 py-2 hover:bg-yellow-500/50 dark:hover:text-white">Private</button>
                                </li>
                                <li id="dropdown-unlisted">
                                    <button type="button" class="block w-full text-left px-4 py-2 hover:bg-teal-500/50 dark:hover:text-white">Unlisted</button>
                                </li>
                                <!-- <li id="dropdown-shared">
                                    <a class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Shared</a>
                                </li> -->
                                <li id="dropdown-public">
                                    <button type="button" class="block w-full text-left px-4 py-2 hover:bg-green-500/50 dark:hover:text-white">Public</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <button type="button" class="m-3 ml-0 inline-flex items-center text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">
                        Save <DocumentCheckIcon class="w-4 h-4 ml-1" />
                    </button>
                </h2>
                <input
                    v-model="setDescription" type="text"
                    class="text-sm bg-transparent w-full hover:bg-zinc-50 focus:bg-zinc-50 border-2 border-zinc-50 text-zinc-900 rounded-lg focus:ring-0 focus:border-primary focus:dark:border-primary grow p-2.5 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:border-zinc-800 dark:text-white"
                >
            </div>
            <!-- <div class="mt-5 flex lg:ml-4 lg:mt-0">
                <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700">Save <DocumentCheckIcon class="w-4 h-4 inline relative" style="top: -1.4px;" /></button>
            </div> -->
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
            <div class="grid grid-cols-4">
                <div class="group cursor-pointer">
                    <div class="border-zinc-500 border-dashed group-hover:border-zinc-700 dark:group-hover:border-zinc-300 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300  border-2 rounded-md p-3">
                        <PlusCircleIcon class="w-9 h-9 mx-auto my-3" />
                        <p class="text-center mb-2">Add a card</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ChevronDownIcon, DocumentCheckIcon, PlusCircleIcon } from '@heroicons/vue/24/outline';

const setName = ref("Untitled set");
const setDescription = ref("No Description");
const visibilityDropdownOpen = ref(false);

function closeDropdown() {
    visibilityDropdownOpen.value = false;
}

onMounted(() => {
    document.addEventListener("click", closeDropdown);
});

onUnmounted(() => {
    document.removeEventListener("click", closeDropdown);
});
</script>