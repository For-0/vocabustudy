<template>
    <nav class="z-20 fixed top-0 left-0 w-full bg-primary">
        <div class="flex flex-wrap items-stretch">
            <RouterLink to="/" class="flex items-center bg-white bg-opacity-0 hover:bg-opacity-10 px-4 h-12">
                <img src="/icons/icon-192.png" class="h-6 w-6 mr-3 sm:h-7 sm:w-7 rounded-lg shadow shadow-white/25" alt="Vocabustudy Logo" height="28"
                    width="28" />
                <span class="self-center text-lg font-semibold whitespace-nowrap text-white">Vocabustudy</span>
            </RouterLink>
            <div class="flex md:order-2 ml-auto items-center mr-2">
                <button type="button" class="w-6 h-6 flex text-sm rounded-full focus:ring-4 hover:ring-2 hover:ring-opacity-50 ring-gray-300 items-center justify-center"
                    id="account-menu-button" :aria-expanded=accountMenuOpen @click.stop="{ accountMenuOpen = !accountMenuOpen; navbarExpanded = false; }">
                    <span class="sr-only">{{ accountMenuOpen ? "Close" : "Open" }} account menu</span>
                    <UserCircleIcon class="w-6 h-6 text-white" />
                </button>
                <div class="z-50 text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-800 dark:divide-gray-600 py-0 absolute right-0 top-12" id="account-dropdown" :class="{ 'hidden': !accountMenuOpen }" @click.stop>
                    <ul class="py-2">
                        <NavbarAccountMenuLink to="/saved/">Saved Sets</NavbarAccountMenuLink>
                        <NavbarAccountMenuLink to="/my-sets/" v-if="authStore.currentUser">My Sets</NavbarAccountMenuLink>
                    </ul>
                    <ul class="py-2">
                        <NavbarAccountMenuLink to="/account/" v-if="authStore.currentUser">My Account</NavbarAccountMenuLink>
                        <NavbarAccountMenuLink to="/logout/" v-if="authStore.currentUser">Log Out</NavbarAccountMenuLink> <!-- TODO: make this a button -->
                        <NavbarAccountMenuLink to="/login/" v-if="!authStore.currentUser">Log In</NavbarAccountMenuLink>
                    </ul>
                </div>
                <button @click.stop="{ navbarExpanded = !navbarExpanded; accountMenuOpen = false; }" type="button"
                    class="inline-flex items-center p-2 text-sm text-white bg-white bg-opacity-0 rounded-lg md:hidden hover:bg-opacity-10 focus:outline-none"
                    aria-controls="navbar-cta" :aria-expanded=navbarExpanded>
                    <span class="sr-only">{{ navbarExpanded ? "Close" : "Open" }} main menu</span>
                    <Bars3Icon class="w-6 h-6" />
                </button>
            </div>
            <div class="items-center justify-between w-full md:flex md:w-auto md:order-1 md:h-12 bg-white md:bg-transparent" id="navbar-cta" :class="{ 'hidden': !navbarExpanded }">
                <ul
                    class="flex flex-col p-2 m-4 md:m-0 md:py-0 border border-gray-100 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 md:flex-row md:space-x-2 md:mt-0 md:border-0 md:bg-transparent md:dark:bg-transparent md:items-center md:h-full">
                    <NavbarLink to="/browse/">Browse Sets</NavbarLink>
                    <NavbarLink to="/support-us/">Support Us</NavbarLink>
                    <NavbarLink to="/help-center/">Help</NavbarLink>
                </ul>
            </div>
        </div>
    </nav>
</template>
  
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router'
import NavbarLink from './NavbarLink.vue';
import { Bars3Icon } from '@heroicons/vue/24/outline';
import { UserCircleIcon } from '@heroicons/vue/24/outline';
import NavbarAccountMenuLink from './NavbarAccountMenuLink.vue';
import { useAuthStore } from '../../store';

const accountMenuOpen = ref(false);
const navbarExpanded = ref(false);
const authStore = useAuthStore();

function onDocumentClick() {
    accountMenuOpen.value = false;
    navbarExpanded.value = false;
}

onMounted(() => {
    document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick);
});
</script>