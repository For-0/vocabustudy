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
                    {{ mode === "resetPassword" ? "Reset Password" : mode === "verifyEmail" ? "Verify Email" : "Loading" }}
                </h1>
            </div>
            <div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-zinc-800 dark:border-zinc-700 overflow-y-auto custom-scrollbar">
                <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <h1 class="text-xl font-bold leading-tight tracking-tight text-zinc-900 md:text-2xl dark:text-white text-center">
                        {{ currentEmail || "Loading email..." }}
                    </h1>
                    <form v-if="mode === 'resetPassword'" class="space-y-4 md:space-y-6" @submit.prevent="onSubmit">
                        <div>
                            <label for="password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Password</label>
                            <input
                                id="password" v-model="password" type="password" placeholder="••••••••" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                            >
                        </div>
                        <div>
                            <label for="confirm-password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Confirm Password</label>
                            <input
                                id="confirm-password" v-model="confirmPassword" type="password" placeholder="••••••••" required
                                class="bg-zinc-50 border border-zinc-300 text-zinc-900 sm:text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-700 dark:border-zinc-600 dark:placeholder-zinc-400 dark:text-white"
                            >
                        </div>
                    
                        <button
                            type="submit" :disabled="loading"
                            class="w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center"
                        >
                            <Loader v-show="loading" class="h-4 w-4 mr-3" :size="1" />
                            Change Password
                        </button>
                    </form> 
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue';
import Loader from '../components/Loader.vue';
import { useRoute, useRouter } from 'vue-router';
import { resetPassword, verifyEmail, errorMessages } from '../firebase-rest-api/auth';
import { showErrorToast, showSuccessToast, showWarningToast } from '../utils';
import { useAuthStore } from '../store';

const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const route = useRoute();
const router = useRouter();
const currentInstance = getCurrentInstance();
const authStore = useAuthStore();
const currentEmail = ref("");

function handleError(errorMessage: string) {
    const [message, duration, type] = errorMessages[errorMessage.split(" ")[0]] as [string, number, string] | undefined ?? ["An unknown error occurred", 5000, "error"]; 
    if (type === "error") {
        showErrorToast(message, currentInstance?.appContext, duration);
    } else {
        showWarningToast(message, currentInstance?.appContext, duration);
    }
}

const { oobCode, mode } = route.query as { oobCode: string; mode: string };

if (!oobCode || !mode || !["resetPassword", "verifyEmail"].includes(mode)) {
    void router.push({ name: "home" });
}

if (mode === "verifyEmail") {
    verifyEmail(oobCode).then(({ email }) => {
        currentEmail.value = email;
        return authStore.refreshCurrentUser(true);
    }).then(() => {
        showSuccessToast("Email verified successfully!", currentInstance?.appContext, 3000);
    }).catch((err: Error) => {
        handleError(err.message);
    });
} else if (mode === "resetPassword") {
    resetPassword(oobCode, undefined).then(({ email }) => {
        currentEmail.value = email;
    }).catch((err: Error) => {
        handleError(err.message);
    });
}

function onSubmit() {
    if (password.value !== confirmPassword.value) {
        showErrorToast("Passwords do not match!", currentInstance?.appContext, 5000);
        return;
    }
    loading.value = true;
    resetPassword(oobCode, password.value).then(() => {
        showSuccessToast("Password changed successfully!", currentInstance?.appContext, 3000);
        void router.push({ name: "login" });
    }).catch((err: Error) => {
        handleError(err.message.split(" ")[0]);
    }).finally(() => {
        loading.value = false;
    });
}
</script>