<script setup lang="ts">
import { RouterView } from 'vue-router';
import Navbar from './components/navbar/Navbar.vue'
import Footer from './components/Footer.vue';
</script>

<template>
    <Navbar />

    <RouterView v-slot="{ Component }">
        <component :is="Component" />
    </RouterView>

    <footer>
        <Footer />
    </footer>

    <div id="toast-container" class="fixed bottom-3 right-3 z-50"></div>
</template>