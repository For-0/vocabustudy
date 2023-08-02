<script setup lang="ts">
import { RouterView } from 'vue-router';
import { ref } from 'vue';
import Navbar from './components/navbar/Navbar.vue'
import Footer from './components/Footer.vue';

const loadGsi = ref(false);
</script>

<template>
    <header>
        <Navbar />
    </header>

    <RouterView v-slot="{ Component }" class="pt-12" @loadGsi="loadGsi = true">
        <component :is="Component" />
    </RouterView>

    <footer>
        <Footer />
    </footer>

    <div id="toast-container" class="fixed bottom-3 right-3"></div>
</template>