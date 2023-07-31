<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/navbar/Navbar.vue'
import Footer from './components/Footer.vue';
</script>

<template>
    <header>
        <Navbar />
    </header>

    <RouterView v-slot="{ Component }" class="pt-12">
        <component :is="Component" />
    </RouterView>

    <footer>
        <Footer />
    </footer>
</template>