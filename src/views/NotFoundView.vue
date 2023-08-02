<template>
    <main class="fixed z-30 inset-0 bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white flex-col p-3 text-center">
        <h1 class="text-3xl font-semibold mb-3 mt-auto">Oops! That page is <span class="text-6xl rainbow-text-animated">imaginary.</span></h1>
        <RouterLink to="/set/0jYMZFlYRWZER2eIzYeY/view/" class="underline text-xl hover:text-gray-200">But... this is real.</RouterLink>
        <span class="text-gray-400 mt-auto">(Error: 404) - <RouterLink to="/" class="underline hover:text-gray-200">Return to Vocabustudy</RouterLink></span>
    </main>
    <main class="fixed z-30 inset-0 bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white flex-col p-3 text-center">
        <section>
            <div class="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
                <div class="mx-auto max-w-screen-sm text-center">
                    <h1 class="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl rainbow-text-animated">404</h1>
                    <p class="mb-4 text-3xl tracking-tight font-bold text-white md:text-4xl dark:text-gray-900">Oops! That page is imaginary.</p>
                    <p class="mb-4 text-lg font-light text-white dark:text-gray-400"><RouterLink to="/" class="bg-blue-400 hover:bg-blue-500 text-white py-2 px-4 rounded">Return to Vocabustudy</RouterLink></p>
                </div>   
            </div>
        </section>
    </main>
</template>