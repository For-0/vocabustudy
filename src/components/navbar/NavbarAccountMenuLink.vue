<template>
    <li>
        <router-link v-bind="$props" custom v-slot="{ isActive, href, navigate }">
            <a v-bind="$attrs" :href="href" @click="navigate"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 dark:hover:text-white"
                :class="{ 'bg-gray-200 dark:bg-gray-600': isActive }">
                <slot />
            </a>
        </router-link>
    </li>
</template>
<script setup lang="ts">
// @ts-nocheck
import { RouterLink } from 'vue-router';

defineProps(RouterLink.props)
</script>