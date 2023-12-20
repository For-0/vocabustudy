<template>
    <header>
        <nav class="bg-primary">
            <div class="flex flex-wrap items-stretch relative">
                <RouterLink to="/" class="flex items-center bg-white bg-opacity-0  px-4 h-12">
                    <img
                        src="/icons/icon-192.png" class="h-6 w-6 mr-3 sm:h-7 sm:w-7 rounded-lg shadow shadow-white/25" alt="Vocabustudy Logo" height="28"
                        width="28"
                    >
                    <span class="self-center text-lg font-semibold whitespace-nowrap text-white">Vocabustudy</span>
                </RouterLink>
                <div class="flex md:order-2 ml-auto items-center mr-2 lg:mr-6">
                    <button
                        id="account-menu-button" type="button"
                        class="w-6 h-6 flex text-sm rounded-full focus:ring-2 hover:ring-1 hover:ring-opacity-50 ring-zinc-300 items-center justify-center" :aria-expanded="accountMenuOpen" @click.stop="{ accountMenuOpen = !accountMenuOpen; navbarExpanded = false; }"
                    >
                        <span class="sr-only">{{ accountMenuOpen ? "Close" : "Open" }} account menu</span>
                        <Loader v-if="currentNavigationProgress !== null && currentNavigationProgress < 1" class="h-6 w-6 text-white" :size="1" />
                        <div v-else-if="authStore.currentUser && authStore.currentUser.photoUrl" class="pfp-loader">
                            <img :src="authStore.currentUser.photoUrl" class="w-6 h-6 rounded-full" alt="">
                        </div>
                        <UserCircleIcon v-else class="w-6 h-6 text-white" />
                    </button>
                    <div id="account-dropdown" class="z-50 text-base list-none bg-white divide-y divide-zinc-100 rounded-lg shadow dark:bg-zinc-800 dark:divide-zinc-600 py-0 absolute right-0 top-12" :class="{ 'hidden': !accountMenuOpen }">
                        <ul class="py-2">
                            <NavbarAccountMenuLink :to="{ name: 'saved-sets' }">Saved Sets</NavbarAccountMenuLink>
                            <NavbarAccountMenuLink v-if="authStore.currentUser && preferencesStore.isOnline" :to="{ name: 'my-sets' }">My Sets</NavbarAccountMenuLink>
                            <NavbarAccountMenuLink v-if="authStore.currentUser && preferencesStore.isOnline" :to="{ name: 'my-collections' }">My Collections</NavbarAccountMenuLink>
                        </ul>
                        <ul class="py-2">
                            <div class="flex items-center justify-evenly text-gray-900 dark:text-white">
                                <button
                                    :class="{ 'border border-primary': preferencesStore.theme === 'light' }"
                                    class="h-6 w-6 flex items-center justify-center hover:bg-primary hover:bg-opacity-25 rounded-lg"
                                    @click="preferencesStore.setTheme('light')"
                                >
                                    <SunIcon class="h-4 w-4" />
                                </button>
                                <button
                                    :class="{ 'border border-primary': preferencesStore.theme === 'dark' }"
                                    class="h-6 w-6 flex items-center justify-center hover:bg-primary hover:bg-opacity-25 rounded-lg"
                                    @click="preferencesStore.setTheme('dark')"
                                >
                                    <MoonIcon class="h-4 w-4" />
                                </button>
                                <button
                                    :class="{ 'border border-primary': preferencesStore.theme === 'system' }"
                                    class="h-6 w-6 flex items-center justify-center hover:bg-primary hover:bg-opacity-25 rounded-lg"
                                    @click="preferencesStore.setTheme('system')"
                                >
                                    <ComputerDesktopIcon class="h-4 w-4" />
                                </button>
                            </div>
                        </ul>
                        <ul class="py-2">
                            <NavbarAccountMenuLink v-if="authStore.currentUser && preferencesStore.isOnline" :to="{ name: 'account' }">My Account</NavbarAccountMenuLink>
                            <li v-if="authStore.currentUser">
                                <a
                                    class="cursor-pointer block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-white"
                                    @click="authStore.logout()"
                                >
                                    Log Out
                                </a>
                            </li>
                            <NavbarAccountMenuLink v-if="!authStore.currentUser && preferencesStore.isOnline" :to="{ name: 'login' }">Log In</NavbarAccountMenuLink>
                        </ul>
                    </div>
                    <button
                        type="button" class="ml-4 inline-flex items-center p-2 text-sm text-white bg-white bg-opacity-0 rounded-lg md:hidden hover:bg-opacity-10 focus:outline-none"
                        aria-controls="navbar-cta"
                        :aria-expanded="navbarExpanded" @click.stop="{ navbarExpanded = !navbarExpanded; accountMenuOpen = false; }"
                    >
                        <span class="sr-only">{{ navbarExpanded ? "Close" : "Open" }} main menu</span>
                        <Bars3Icon class="w-6 h-6" />
                    </button>
                </div>
                <div id="navbar-cta" class="items-center justify-between w-full md:flex md:w-auto md:order-1 md:h-12 bg-white dark:bg-stone-800 md:bg-transparent md:dark:bg-transparent" :class="{ 'hidden': !navbarExpanded }">
                    <ul
                        v-if="preferencesStore.isOnline"
                        class="flex flex-col p-2 m-4 md:m-0 md:py-0 border border-zinc-100 rounded-lg bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 md:flex-row md:space-x-2 md:mt-0 md:border-0 md:bg-transparent md:dark:bg-transparent md:items-center md:h-full"
                    >
                        <NavbarLink :to="{ name: 'search' }">Search Sets</NavbarLink>
                        <NavbarLink v-if="authStore.currentUser" :to="{ name: 'my-sets' }">My Sets</NavbarLink>
                        <NavbarLink :to="{ name: 'support-us' }">Support Us</NavbarLink>
                        <NavbarLink :to="{ name: 'help-center' }">Help</NavbarLink>
                    </ul>
                </div>
            </div>
        </nav>
        
        <div v-if="currentNavigationProgress !== null" class="bg-gradient-to-r from-primary-alt to-primary h-1">
            <div class="bg-secondary h-full transition-transform" :style="{ transform: `translateX(-50%)scaleX(${currentNavigationProgress})translateX(50%)` }" />
        </div>

        <div v-if="!verifyEmailHidden && authStore.currentUser && !authStore.currentUser.emailVerified && preferencesStore.isOnline" tabindex="-1" class="flex flex-col justify-between w-full p-4 border-b border-zinc-200 md:flex-row bg-zinc-50 dark:bg-zinc-700 dark:border-zinc-600">
            <div class="mb-4 md:mb-0 md:mr-4">
                <h2 class="mb-1 text-base font-semibold text-zinc-900 dark:text-white">Please verify your email address</h2>
                <p class="flex items-center text-sm font-normal text-zinc-500 dark:text-zinc-400">Verifying your email address allows you to use the full features of Vocabustudy</p>
            </div>
            <div class="flex items-center flex-shrink-0">
                <button type="button" class="inline-flex items-center justify-center px-3 py-2 mr-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-alt focus:ring-4 focus:ring-primary/50 focus:outline-none" @click="verifyEmail()">Verify email</button>
                <button type="button" class="flex-shrink-0 inline-flex justify-center w-7 h-7 items-center text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm p-1.5 dark:hover:bg-zinc-600 dark:hover:text-white" @click="verifyEmailHidden = true">
                    <XMarkIcon class="w-3 h-3 stroke-2" aria-hidden="true" />
                    <span class="sr-only">Close banner</span>
                </button>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { RouterLink } from 'vue-router'
import NavbarLink from './NavbarLink.vue';
import { Bars3Icon, UserCircleIcon, XMarkIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/vue/24/outline';
import NavbarAccountMenuLink from './NavbarAccountMenuLink.vue';
import { useAuthStore, usePreferencesStore } from '../../store';
import { sendEmailVerification } from "../../firebase-rest-api/auth";
import { showSuccessToast } from '../../utils';
import Loader from '../Loader.vue';

const accountMenuOpen = ref(false);
const navbarExpanded = ref(false);
const verifyEmailHidden = ref(false);
const authStore = useAuthStore();
const preferencesStore = usePreferencesStore();
const currentInstance = getCurrentInstance();
const totalNavigationTime = 5000; // 5 seconds
const currentNavigationProgress = ref<number | null>(null); // percentage (0-1)
let navigationUpdateInterval = 0;
let navigationClearTimeout = 0;

function onDocumentClick() {
    accountMenuOpen.value = false;
    navbarExpanded.value = false;
}

const unsubscribe = preferencesStore.$onAction(({ name, after }) => {
    if (name === "startNavigation") {
        after(() => {
            clearInterval(navigationUpdateInterval);
            clearTimeout(navigationClearTimeout);
            currentNavigationProgress.value = 0;
            navigationUpdateInterval = window.setInterval(() => {
                const msIntoNavigation = Date.now() - preferencesStore.navigationStartedAt;
                currentNavigationProgress.value = Math.min(msIntoNavigation / totalNavigationTime, 1);
            }, 100);
        });
    } else if (name === "stopNavigation") {
        after(() => {
            clearInterval(navigationUpdateInterval);
            clearTimeout(navigationClearTimeout);
            currentNavigationProgress.value = 1;
            navigationClearTimeout = window.setTimeout(() => {
                currentNavigationProgress.value = null; // remove the progress bar after 0.1 seconds
            }, 300);
        });
    }
});

onMounted(() => {
    document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick);
    unsubscribe();
});

async function verifyEmail() {
    try {
        await sendEmailVerification();
        showSuccessToast("Verification email sent!", currentInstance?.appContext, 3000);
    } catch (error) {
        console.error(error);
    }
}
</script>