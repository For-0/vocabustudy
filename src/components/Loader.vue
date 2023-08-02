<template>
    <div class="spinner animate-spin inline-block border-current border-b-transparent" :class="size ? (size === 1 ? 'border': `border-${size}`) : 'border-4'"></div>
</template>
<style>
.spinner {
    border-radius: 50%;
    animation-duration: 0.5s;
}
</style>
<script setup lang="ts">
defineProps<{
    size?: number
}>();
</script>