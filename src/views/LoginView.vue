<template>
    <main class="min-h-0 striped-background">
        <div class="flex flex-col items-center justify-center px-6 py-2 mx-auto lg:py-0 h-full">
            <div class="md:flex items-center justify-between mb-3 hidden">
                <div class="flex items-start">
                    <div class="flex items-center">
                        <img class="w-8 h-8 mr-4 rounded-lg shadow shadow-white/25" src="/icons/icon-192.png" alt="Vocabustudy Logo">
                    </div>
                </div>
                <h1 class="text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">
                    Vocabustudy
                </h1>
            </div>
            <div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-zinc-800 dark:border-zinc-700 overflow-y-auto custom-scrollbar">
                <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <h1 class="text-xl font-bold leading-tight tracking-tight text-zinc-900 md:text-2xl dark:text-white text-center">
                        {{ currentMode === "login" ? "Log in to Vocabustudy" : currentMode === "signup" ? "Sign up for Vocabustudy" : "Forgot password" }}
                    </h1>
                    <!-- <button type="submit"
                            class="w-full text-white bg-zinc-100 hover:bg-zinc-200 focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center"> 
                            {{ currentMode === "login" ? "Log in with Google" : "Sign up with Google" }}
                    </button> -->
                    
                    <!-- 'or' divider below -->
                    <!-- <div class="relative flex py-1 items-center">
                        <div class="flex-grow border-t border-gray-400"></div>
                        <span class="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                        <div class="flex-grow border-t border-gray-400"></div>
                    </div> -->
                    <div v-show="currentMode !== 'forgot'" class="w-full flex justify-center text-white">
                        <div ref="gsiButtonContainer">
                            <!-- empty -->
                        </div>
                    </div>
                    <div v-show="currentMode !== 'forgot'" class="inline-flex items-center justify-center w-full relative">
                        <hr class="w-64 h-px bg-zinc-200 border-0 dark:bg-zinc-700">
                        <span class="absolute px-3 font-medium text-zinc-700 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-zinc-800">or</span>
                    </div>
                    <form class="space-y-4 md:space-y-6" @submit.prevent="onSubmit">
                        <div v-if="currentMode === 'signup'">
                            <label for="display-name" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Display name</label>
                            <input
                                id="display-name" v-model="displayName" type="text" placeholder="John Doe" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                            >
                        </div>
                        <div>
                            <label for="email" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Your email</label>
                            <input
                                id="email" v-model="email" type="email" placeholder="user@vocabustudy.org" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                            >
                        </div>
                        <div v-if="currentMode !== 'forgot'">
                            <label for="password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Password</label>
                            <input
                                id="password" v-model="password" type="password" placeholder="••••••••" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                            >
                        </div>
                        <div v-if="currentMode === 'signup'">
                            <label for="confirm-password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Confirm Password</label>
                            <input
                                id="confirm-password" v-model="confirmPassword" type="password" placeholder="••••••••" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                            >
                        </div>

                        <p v-if="currentMode === 'signup'" class="mt-3 text-zinc-400 dark:text-zinc-500 italic text-sm">You must be at least 13 or have parental permission to create and use an account.</p>
                    
                        <button
                            type="submit" :disabled="loading"
                            class="w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center"
                        >
                            <Loader v-show="loading" class="h-4 w-4 mr-3" :size="1" />
                            {{ currentMode === "login" ? "Log in" : currentMode === "signup" ? "Sign up" : "Send email" }}
                        </button>
                        <div class="flex items-center justify-between">
                            <div class="flex items-start">
                                <p class="text-sm font-light text-zinc-500 dark:text-zinc-400">
                                    {{ currentMode === "login" ? "Don't have an account?" : "Already have an account?" }}
                                    <button type="button" class="font-medium text-primary hover:underline  dark:text-primary-alt" @click="currentMode = currentMode === 'login' ? 'signup' : 'login'">{{ currentMode === "login" ? "Sign up" : "Log in" }}</button>
                                </p>
                            </div>
                            <button type="button" class="text-sm font-medium text-primary hover:underline dark:text-primary-alt" @click="currentMode = 'forgot'">Forgot password?</button>
                        </div>

                        <p class="text-zinc-400 dark:text-zinc-500 italic text-sm">By using Vocabustudy, you agree to the <router-link :to="{ name: 'terms' }" class=" text-blue-600 dark:text-blue-500 hover:underline">Terms of Service</router-link> and <router-link :to="{ name: 'privacy' }" class=" text-blue-600 dark:text-blue-500 hover:underline">Privacy Policy</router-link>.</p>
                    </form> 
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, onMounted } from 'vue';
import Loader from '../components/Loader.vue';
import { sendPasswordResetEmail, loadGoogleSignIn, renderGoogleButton, errorMessages } from '../firebase-rest-api/auth';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils';
import { useAuthStore } from '../store';
import { useRouter, useRoute } from 'vue-router';

const currentMode = ref<'login' | 'signup' | 'forgot'>('login');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const displayName = ref('');
const loading = ref(false);
const currentInstance = getCurrentInstance();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const gsiButtonContainer = ref<HTMLDivElement | null>(null);

function reportToastResult(errorMessage: string) {
    if (!currentInstance) return;
    if (errorMessage.split(" ")[0] in errorMessages) {
        const [message, duration, type] = errorMessages[errorMessage.split(" ")[0]];
        switch (type) {
            case "error":
                showErrorToast(message, currentInstance.appContext, duration);
                break;
            case "warning":
                showWarningToast(message, currentInstance.appContext, duration);
                break;
        }
    } else {
        showErrorToast(`An unknown error occurred: ${errorMessage}`, currentInstance.appContext, 5000);
    }
}

async function onSubmit() {
    if (!currentInstance) return;
    loading.value = true;
    switch (currentMode.value) {
        case "login": {
            try {
                await authStore.signInWithEmailAndPassword(email.value, password.value);
            } catch(err) {
                reportToastResult((err as Error).message);
            }
            break;
        }
        case "signup": {
            if (password.value !== confirmPassword.value) {
                showErrorToast("Passwords do not match", currentInstance.appContext, 5000);
                loading.value = false;
                return;
            }
            try {
                await authStore.createUserWithEmailAndPassword(email.value, password.value, displayName.value);
            } catch (err) {
                reportToastResult((err as Error).message.split(" ")[0]);
            }
            break;
        }
        case "forgot": {
            try {
                await sendPasswordResetEmail(email.value);
                showSuccessToast("Email sent!", currentInstance.appContext, 3000);
            } catch (err) {
                reportToastResult((err as Error).message);
            }
            break;
        }
    }
    loading.value = false;
}

function handleState(state: typeof authStore["$state"]) {
    if (state.currentUser) {
        // redirect to /account if user is logged in
        if (route.query.next) {
            void router.push(route.query.next as string);
        } else {
            void router.push({ name: "account" });
        }
        loading.value = false;
        unsubscribe();
    }
}

const unsubscribe = authStore.$subscribe((_, state) => {
    handleState(state);
});

handleState(authStore.$state);

onMounted(async () => {
    if (!gsiButtonContainer.value) return;
    if (import.meta.env.PROD) {
        await loadGoogleSignIn();
        renderGoogleButton(gsiButtonContainer.value, async response => {
            try {
                await authStore.signInWithGoogleCredential(response.credential);
            } catch (err) {
                reportToastResult((err as Error).message);
            }
        });
    } else {
        gsiButtonContainer.value.innerHTML = "Sign in with Google";
        gsiButtonContainer.value.addEventListener("click", async () => {
            try {
                await authStore.showGooglePopup();
            } catch (err) {
                reportToastResult((err as Error).message);
            }
        });
    }    
});
</script>