<template>
    <li>
        <router-link v-slot="{ isActive, href, navigate }" v-bind="$props" custom>
            <a
                v-bind="$attrs" :href="href" class="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-white"
                :class="{ 'bg-zinc-200 dark:bg-zinc-600': isActive }"
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