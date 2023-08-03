<script setup lang="ts">
import { RouterView } from 'vue-router';
import Navbar from './components/navbar/Navbar.vue'
import Footer from './components/Footer.vue';
import { useThemeStore } from './store';
import { onMounted, onUnmounted, ref } from 'vue';

const themeStore = useThemeStore();

const userPrefersDark = ref(false);
let queryList: MediaQueryList | null = null;

function onMediaChange(e: MediaQueryListEvent) {
    userPrefersDark.value = e.matches;
}

onMounted(() => {
    queryList = window.matchMedia('(prefers-color-scheme: dark)');
    queryList.addEventListener('change', onMediaChange);
    userPrefersDark.value = queryList.matches;
});

onUnmounted(() => {
    queryList?.removeEventListener('change', onMediaChange);
});
</script>

<template>
    <div class="contents" :class="{ 'dark': (themeStore.theme === 'system' && userPrefersDark) || themeStore.theme === 'dark' }">
        <Navbar />

        <RouterView v-slot="{ Component }">
            <component :is="Component" />
        </RouterView>

        <footer>
            <Footer />
        </footer>

        <div id="toast-container" class="fixed bottom-3 right-3 z-50"></div>
    </div>
</template>