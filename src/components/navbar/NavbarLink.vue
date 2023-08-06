<template>
    <li>
        <router-link v-slot="{ isActive, href, navigate }" v-bind="$props" custom>
            <a
                class="block py-2 pl-3 pr-4 rounded md:px-2 md:py-1"
                v-bind="$attrs" :href="href" :class="{
                    'text-white bg-primary md:p-0 md:bg-white/10 md:dark:bg-white/10 dark:bg-primary': isActive,
                    'text-gray-900 hover:bg-gray-100 md:hover:bg-white/10 dark:text-white md:text-white md:hover:text-white md:dark:hover:text-white md:dark:hover:bg-white/10 dark:hover:bg-gray-700 dark:hover:text-white': !isActive
                }"
                @click="navigate"
            >
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