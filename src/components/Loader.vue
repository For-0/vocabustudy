<template>
    <div class="spinner animate-spin inline-block border-current border-b-transparent" :class="borderClass">
        <!-- empty -->
    </div>
</template>
<script setup lang="ts">
const props = defineProps<{
    size?: number
}>();

let borderClass = "border-4";
if (props.size === 1) {
    borderClass = "border";
} else if (props.size === 2) {
    borderClass = `border-2`;
}
</script>
<style>
.spinner {
    border-radius: 50%;
    animation-duration: 0.5s;
}
</style>