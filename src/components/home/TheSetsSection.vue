<template>
    <section class="bg-gray-200 dark:bg-stone-900">
        <div class="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6">
            <div class="max-w-screen-md mb-8 lg:mb-16">
                <h2 class="mb-4 text-3xl tracking-tight font-extrabold text-stone-900 dark:text-white">From History to Biology, Vocabustudy has you covered.</h2>
                <p class="text-zinc-600 sm:text-xl dark:text-zinc-400">Explore our hundreds of sets today!</p>
            </div>
            <div class="space-y-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
                <SetCard v-for="set, i in featureSets" :key="set.id" :set="set" :creator="profiles[i]" />
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
import SetCard from '../SetCard.vue';

const featureSets = [
    { id: "Pm4jGqMQQjGTncfCxbbx", name: "Unit 6 Vocab: US History", collections: ["3:0"], numTerms: 16, likes: 1, createTime: new Date(1672977414555), uid: "nWasbt2yvXewc8AhGSqwmfT4gVu2" },
    { id: "UvecvkGJic1gp7HFKAw3", name: "Unit 6 Advanced Biology ", collections: ["5:4"], numTerms: 22, likes: 1, createTime: new Date(1674228853036), uid: "bcNOi4FCxUcJaAxUglAVBrm5FTr1" },
    { id: "D3NQ1SrKusHR4Bgmwx6Y", name: "Geometry Unit 2", collections: ["0:5"], numTerms: 42, likes: 2, createTime: new Date(1672977414555), uid: "mnDmw8WhAGSup4W2kH0EsRCgb072" },
];
// hardcode profiles to reduce number of requests
const profiles = [
    {"displayName":"Ruhan Gupta","photoUrl":"https://lh3.googleusercontent.com/a/ALm5wu0HlFfEYrj6KtjhIVVAmo4islLn0KujjTjSPFYl=s96-c","roles":["admin"]},
    {"displayName":"William Langdon","photoUrl":"https://lh3.googleusercontent.com/a/AEdFTp6xvn7yqC08ZEJ_hXP08ldW_PCODY-TS2OuKk-CKg=s96-c","roles":[]},
    {"displayName":"Omkar Admin","photoUrl":"https://lh3.googleusercontent.com/a-/ACNPEu_QwBsJ2IQHKbAsJmSRZqOHQOIDYz0IpfP4XpHepQ=s96-c","roles":["admin"]}
];
</script>