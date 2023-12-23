<template>
    <div class="flex items-center space-x-2">
        <img class="w-10 h-10 rounded-full" :src="profile.photoUrl || defaultPfp" alt="User profile picture">
        <div class="font-medium dark:text-white max-w-full">
            <div class="flex min-w-0">
                <router-link class="min-w-0 truncate" :to="{ name: 'user-profile', params: { uid: profile.uid } }">{{ profile.displayName }}</router-link>
                <span v-if="profile.roles.includes('admin')" class="shrink-0 inline-flex items-center justify-center w-6 h-6 ml-1 text-sm font-semibold text-green-800 bg-green-100 dark:bg-green-700/25 dark:text-green-400 rounded-full" title="Admin">
                    <ShieldCheckIcon class="w-3 h-3" />
                    <span class="sr-only">Admin</span>
                </span>
            </div>
            <div class="text-sm text-zinc-500 dark:text-zinc-400" :title="date.toLocaleString()">Created {{ humanizeDate(date) }}</div>
        </div>
    </div>
</template>
<script setup lang="ts">
import type { UserProfile } from '../types';
import { ShieldCheckIcon } from '@heroicons/vue/20/solid';
import { humanizeDate } from '../utils';
import defaultPfp from "../assets/images/default-pfp.svg";

defineProps<{
    profile: UserProfile;
    date: Date;
}>();
</script>