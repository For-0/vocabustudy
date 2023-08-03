<template>
    <main class="bg-white dark:bg-zinc-900 grow">
        <div>
            <h1 class="text-gray-900 dark:text-white text-3xl font-bold pt-10 text-center">Search Sets</h1>   
            <form class="lg:max-w-2xl mx-auto justify-center">   
                <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                    </div>
                    <input type="search" id="default-search" class="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary focus:border-primary dark:bg-stone-700 dark:border-stone-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary dark:focus:border-primary" placeholder="Search for a set..." required>
                    <button type="submit" class="text-white absolute right-2.5 bottom-2.5 bg-primary hover:bg-primaryalt focus:ring-4 focus:outline-none focus:ring-zinc-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-primaryalt dark:hover:bg-primary dark:focus:ring-white">Search</button>
                </div>
            </form>
        </div>
        <div class="items-center flex justify-center">
            <div class="grid lg:grid-cols-4 gap-4 p-6 lg:p-10">
                <SetCard v-for="set, i in featureSets" :key="set.id" :set="set" :creator="profiles[i]" />
            </div>
        </div>
    </main>
</template>
<script setup lang="ts">
import SetCard from '../components/SetCard.vue';

const featureSets = [
    { id: "Pm4jGqMQQjGTncfCxbbx", name: "Unit 6 Vocab: US History", collections: ["3:0"], numTerms: 16, likes: 1, createTime: new Date(1672977414555), uid: "nWasbt2yvXewc8AhGSqwmfT4gVu2" },
    { id: "UvecvkGJic1gp7HFKAw3", name: "Unit 6 Advanced Biology ", collections: ["5:4"], numTerms: 22, likes: 1, createTime: new Date(1674228853036), uid: "bcNOi4FCxUcJaAxUglAVBrm5FTr1" },
    { id: "Pm4jGqMQQjGTncfCxbbx", name: "Unit 6 Vocab: US History", collections: ["3:0"], numTerms: 16, likes: 1, createTime: new Date(1672977414555), uid: "nWasbt2yvXewc8AhGSqwmfT4gVu2" },
    { id: "UvecvkGJic1gp7HFKAw3", name: "Unit 6 Advanced Biology ", collections: ["5:4"], numTerms: 22, likes: 1, createTime: new Date(1674228853036), uid: "bcNOi4FCxUcJaAxUglAVBrm5FTr1" },
    { id: "Pm4jGqMQQjGTncfCxbbx", name: "Unit 6 Vocab: US History", collections: ["3:0"], numTerms: 16, likes: 1, createTime: new Date(1672977414555), uid: "nWasbt2yvXewc8AhGSqwmfT4gVu2" },
    { id: "UvecvkGJic1gp7HFKAw3", name: "Unit 6 Advanced Biology ", collections: ["5:4"], numTerms: 22, likes: 1, createTime: new Date(1674228853036), uid: "bcNOi4FCxUcJaAxUglAVBrm5FTr1" },
    { id: "D3NQ1SrKusHR4Bgmwx6Y", name: "Geometry Unit 2", collections: ["0:5"], numTerms: 42, likes: 2, createTime: new Date(1672977414555), uid: "mnDmw8WhAGSup4W2kH0EsRCgb072" },
];
// hardcode profiles to reduce number of requests
const profiles = [
    {"displayName":"Ruhan Gupta","photoUrl":"https://lh3.googleusercontent.com/a/ALm5wu0HlFfEYrj6KtjhIVVAmo4islLn0KujjTjSPFYl=s96-c","roles":["admin"]},
    {"displayName":"William Langdon","photoUrl":"https://lh3.googleusercontent.com/a/AEdFTp6xvn7yqC08ZEJ_hXP08ldW_PCODY-TS2OuKk-CKg=s96-c","roles":[]},
    {"displayName":"Ruhan Gupta","photoUrl":"https://lh3.googleusercontent.com/a/ALm5wu0HlFfEYrj6KtjhIVVAmo4islLn0KujjTjSPFYl=s96-c","roles":["admin"]},
    {"displayName":"William Langdon","photoUrl":"https://lh3.googleusercontent.com/a/AEdFTp6xvn7yqC08ZEJ_hXP08ldW_PCODY-TS2OuKk-CKg=s96-c","roles":[]},
    {"displayName":"Ruhan Gupta","photoUrl":"https://lh3.googleusercontent.com/a/ALm5wu0HlFfEYrj6KtjhIVVAmo4islLn0KujjTjSPFYl=s96-c","roles":["admin"]},
    {"displayName":"William Langdon","photoUrl":"https://lh3.googleusercontent.com/a/AEdFTp6xvn7yqC08ZEJ_hXP08ldW_PCODY-TS2OuKk-CKg=s96-c","roles":[]},
    {"displayName":"Omkar Admin","photoUrl":"https://lh3.googleusercontent.com/a-/ACNPEu_QwBsJ2IQHKbAsJmSRZqOHQOIDYz0IpfP4XpHepQ=s96-c","roles":["admin"]}
];
</script>