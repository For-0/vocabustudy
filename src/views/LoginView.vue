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
                    <div class="w-full flex justify-center" v-show="currentMode !== 'forgot'">
                        <div ref="gsiButtonContainer"></div>
                    </div>
                    <div class="inline-flex items-center justify-center w-full relative" v-show="currentMode !== 'forgot'">
                        <hr class="w-64 h-px bg-zinc-200 border-0 dark:bg-zinc-700">
                        <span class="absolute px-3 font-medium text-zinc-700 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-zinc-800">or</span>
                    </div>
                    <form class="space-y-4 md:space-y-6" @submit.prevent="onSubmit">
                        <div v-if="currentMode === 'signup'">
                            <label for="display-name" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Display name</label>
                            <input type="text" id="display-name" v-model="displayName" placeholder="John Doe" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white">
                        </div>
                        <div>
                            <label for="email" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Your email</label>
                            <input type="email" id="email" v-model="email" placeholder="user@vocabustudy.org" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white">
                        </div>
                        <div v-if="currentMode !== 'forgot'">
                            <label for="password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Password</label>
                            <input type="password" id="password" placeholder="••••••••" v-model="password" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white">
                        </div>
                        <div v-if="currentMode === 'signup'">
                            <label for="confirm-password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Confirm Password</label>
                            <input type="password" id="confirm-password" placeholder="••••••••" v-model="confirmPassword" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white">
                        </div>

                        <p class="mt-3 text-zinc-400 dark:text-zinc-600 italic text-sm" v-if="currentMode === 'signup'">You must be at least 13 or have parental permission to create and use an account.</p>
                    
                        <button type="submit" :disabled="loading"
                            class="w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center">
                            <Loader class="h-4 w-4 mr-3" :size="1" v-show="loading" />
                            {{ currentMode === "login" ? "Log in" : currentMode === "signup" ? "Sign up" : "Send email" }}
                        </button>
                        <div class="flex items-center justify-between">
                            <div class="flex items-start">
                                <p class="text-sm font-light text-zinc-500 dark:text-zinc-400">
                                    {{ currentMode === "login" ? "Don't have an account?" : "Already have an account?" }}
                                    <button @click="currentMode = currentMode === 'login' ? 'signup' : 'login'" type="button" class="font-medium text-primary hover:underline  dark:text-primary-alt">{{ currentMode === "login" ? "Sign up" : "Log in" }}</button>
                                </p>
                            </div>
                            <button @click="currentMode = 'forgot'" type="button" class="text-sm font-medium text-primary hover:underline dark:text-primary-alt">Forgot password?</button>
                        </div>

                        <p class="text-zinc-400 dark:text-zinc-600 italic text-sm">By using this service, you agree to the <router-link :to="{ name: 'terms' }" class="hover:underline">Terms of Service</router-link> and <router-link :to="{ name: 'privacy' }" class="hover:underline">Privacy Policy</router-link>.</p>
                    </form> 
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, onMounted } from 'vue';
import Loader from '../components/Loader.vue';
import { sendPasswordResetEmail, loadGoogleSignIn, renderGoogleButton } from '../firebase-rest-api/auth';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils';
import { useAuthStore } from '../store';
import { useRouter } from 'vue-router';

const currentMode = ref<'login' | 'signup' | 'forgot'>('login');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const displayName = ref('');
const loading = ref(false);
const currentInstance = getCurrentInstance();
const authStore = useAuthStore();
const router = useRouter();
const gsiButtonContainer = ref<HTMLDivElement | null>(null);
let navigatingAway = false;

const errorMessages: Record<string, [string, number, "error" | "warning"]> = {
    "EMAIL_NOT_FOUND": ["There is no user with that email address", 7000, "error"],
    "INVALID_PASSWORD": ["Incorrect password", 5000, "error"],
    "TOO_MANY_ATTEMPTS_TRY_LATER": ["Too many attempts! Please try again later", 7000, "warning"],
    "USER_DISABLED": ["Your account has been disabled", 5000, "warning"],
    "RESET_PASSWORD_EXCEED_LIMIT": ["Too many attempts! Please try again later", 7000, "warning"],
    "UNAUTHORIZED_DOMAIN": ["Invalid domain", 5000, "warning"],
    "popup-closed": ["Popup closed", 5000, "warning"],
    "EMAIL_EXISTS": ["An account with that email address already exists", 7000, "error"],
    "WEAK_PASSWORD": ["Your password must be at least 6 characters", 5000, "warning"],
};

function reportToastResult(errorMessage: string) {
    if (!currentInstance) return;
    if (errorMessage in errorMessages) {
        const [message, duration, type] = errorMessages[errorMessage];
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
                reportToastResult((err as Error)?.message);
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
                reportToastResult((err as Error)?.message.split(" ")[0]);
            }
            break;
        }
        case "forgot": {
            try {
                await sendPasswordResetEmail(email.value);
                showSuccessToast("Email sent!", currentInstance.appContext, 3000);
            } catch (err) {
                reportToastResult((err as Error)?.message);
            }
            break;
        }
    }
    loading.value = false;
}

const unsubscribe = authStore.$subscribe((_, state) => {
    if (state.currentUser) {
        router.push({ name: "account" });
        unsubscribe();
    }
});

// redirect to /account if user is logged in
if (authStore.currentUser) {
    router.push({ name: "account" });
    unsubscribe();
}

onMounted(async () => {
    if (!gsiButtonContainer.value) return;
    if (import.meta.env.PROD) {
        await loadGoogleSignIn();
        renderGoogleButton(gsiButtonContainer.value, async response => {
            try {
                await authStore.signInWithGoogleCredential(response.credential);
            } catch (err) {
                reportToastResult((err as Error)?.message);
            }
        });
    } else {
        gsiButtonContainer.value.innerHTML = "Click to sign in with Google";
        gsiButtonContainer.value.addEventListener("click", async () => {
            try {
                await authStore.showGooglePopup();
            } catch (err) {
                reportToastResult((err as Error)?.message);
            }
        });
    }    
});
</script>