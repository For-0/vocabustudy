<template>
    <main class="grow">
        <section class="striped-background h-[calc(50vh)]">
            <div class="max-w-screen-xl px-4 py-8 mx-auto lg:py-16 text-center flex items-center justify-center flex-col h-full">
                <h1 class="max-w-2xl mb-4 text-4xl font-extrabold md:text-5xl xl:text-6xl text-white mx-auto"><span class="text-primary">Help</span> Center</h1>
                <p class="max-w-2xl mb-6 font-light text-white lg:mb-8 md:text-lg lg:text-xl dark:text-zinc-200 mx-auto">Vocabustudy's help center has high-quality articles to help you get started studying.</p>         
            </div>
        </section>
        <section class="bg-white dark:bg-stone-900">
            <div class="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
                <div class="max-w-screen-lg text-gray-500 sm:text-lg dark:text-gray-400">
                    <h2 class="mb-4 text-4xl tracking-tight font-bold text-gray-900 dark:text-white">Featured Articles</h2>
                    <div class="grid grid-cols-4 gap-4">
                        <FeaturedArticle v-for="article in articles" :title="article.title" :description="article.description" :link="article.link" />
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>
<script setup lang="ts">
    import FeaturedArticle from "../components/FeaturedArticle.vue";
    const articles = [
    {
        id: 1,
        title: "Coming soon!",
        description: "New Help Center articles are on their way. Check back soon!",
        link: "/help-center/#",
    },
    {
        id: 2,
        title: "Coming soon!",
        description: "New Help Center articles are on their way. Check back soon!",
        link: "/help-center/#",
    },
    {
        id: 3,
        title: "Coming soon!",
        description: "New Help Center articles are on their way. Check back soon!",
        link: "/help-center/#",
    },
    {
        id: 4,
        title: "Coming soon!",
        description: "New Help Center articles are on their way. Check back soon!",
        link: "/help-center/#",
    },
    ]
</script>