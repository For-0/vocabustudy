<template>
    <main class="px-6 bg-white dark:bg-zinc-900 grow">
        <div class="sm:max-w-6xl mx-auto sm:flex sm:justify-center sm:flex-col sm:h-full mt-6">
            <div class="lg:flex lg:items-center lg:justify-between">
                <div class="min-w-0 flex-1">
                    <h2 class="text-2xl font-bold leading-7 text-zinc-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">My Account</h2>
                    <p class="mt-1 text-zinc-500 dark:text-zinc-400">
                        {{ authStore.currentUser?.email }}
                        <span
                            class="inline-flex items-center text-xs font-medium mr-3 px-2.5 py-0.5 rounded-full"
                            :class="authStore.currentUser?.emailVerified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'"
                        >
                            <span class="w-2 h-2 mr-1 rounded-full" :class="authStore.currentUser?.emailVerified ? 'bg-green-500' : 'bg-red-500'" />
                            Email {{ authStore.currentUser?.emailVerified ? 'Verified' : 'Not Verified' }}
                        </span>
                    </p>
                    <p class="mt-1 text-zinc-400 dark:text-zinc-500">Account created: {{ authStore.currentUser?.created.toLocaleString() || "?" }}</p>
                    <p class="mt-1 text-zinc-400 dark:text-zinc-500">Last login: {{ authStore.currentUser?.lastLogin.toLocaleString() || "?" }}</p>
                    <p class="mt-1 text-zinc-400 dark:text-zinc-500">Login methods: {{ authProviders }}</p>
                </div>
                <div class="mt-5 flex lg:ml-4 lg:mt-0">
                    <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="authStore.logout()">Log Out</button>
                </div>
            </div>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
            <h2 class="text-xl font-bold leading-7 text-zinc-900 dark:text-white mb-3">Settings:</h2>
            <label for="display-name" class="font-semibold text-zinc-900 dark:text-white mb-2 block">Display Name</label>
            <div class="flex items-center mb-3">   
                <input id="display-name" ref="displayNameInput" v-model="displayName" type="text" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" required>
                <button :disabled="displayNameLoading" type="button" title="Save" class="p-2.5 ml-2 text-sm font-medium text-white bg-green-700 rounded-lg border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" @click="saveDisplayName">
                    <Loader v-if="displayNameLoading" class="w-4 h-4 !block" :size="1" />
                    <CheckIcon v-else class="w-4 h-4" aria-hidden="true" />
                    <span class="sr-only">Save</span>
                </button>
            </div>
            <label for="photo-url" class="font-semibold text-zinc-900 dark:text-white mb-2 block">Profile Picture URL <span class="text-sm font-normal text-zinc-700 dark:text-zinc-200">(optional)</span></label>
            <div class="flex items-center mb-3">   
                <input id="photo-url" ref="photoUrlInput" v-model="photoUrl" type="url" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                <button :disabled="photoUrlLoading" type="button" title="Save" class="p-2.5 ml-2 text-sm font-medium text-white bg-green-700 rounded-lg border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" @click="savePhotoUrl">
                    <Loader v-if="photoUrlLoading" class="w-4 h-4 !block" :size="1" />
                    <CheckIcon v-else class="w-4 h-4" aria-hidden="true" />
                    <span class="sr-only">Save</span>
                </button>
            </div>
            <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-700">
            <div class="mt-5 flex lg:mt-0 justify-end">
                <button type="button" class="text-zinc-900 bg-white border border-zinc-300 focus:outline-none hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 dark:focus:ring-zinc-700" @click="openReauthModal('change-password')">Change Password</button>
                <button type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" @click="openReauthModal('delete-account')">Delete Account</button>
            </div>
            <h2 class="text-xl font-bold leading-7 text-zinc-900 dark:text-white mb-3">Your Data:</h2>
            <p class="text-zinc-900 dark:text-white mb-2">
                Your <span class="font-bold text-emerald-600"><EnvelopeIcon class="w-3 h-3 inline" /> Email</span> is private and will never be shared with anyone.
            </p>
            <p class="text-zinc-900 dark:text-white mb-2">
                Your <span class="font-bold text-violet-600"><UserIcon class="w-3 h-3 inline" /> Display Name</span> and <span class="font-bold text-violet-600"><PhotoIcon class="w-3 h-3 inline" /> Profile Picture</span> will be displayed on all public interactions. <span class="font-semibold">You can change these at any time.</span>
            </p>
            <p class="text-zinc-900 dark:text-white mb-2">Have more questions about your data? See our <router-link :to="{ name: 'privacy' }" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">Privacy Policy</router-link>.</p>
        </div>
        
        <div v-if="currentModal" class="bg-zinc-900 bg-opacity-50 dark:bg-opacity-80 fixed inset-0 z-30">
            <!-- empty -->
        </div>
        <div v-show="currentModal === 'reauth'" tabindex="-1" aria-hidden="true" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <!-- Modal content -->
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="closeModals">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="px-6 py-6 lg:px-8">
                        <h3 class="mb-3 text-xl font-medium text-zinc-900 dark:text-white">Reauthenticate</h3>
                        <p class="text-zinc-500 dark:text-zinc-400 mb-2">For your security, you must reauthenticate to continue</p>
                        <form class="space-y-3" @submit.prevent="onReauthSubmit">
                            <div v-show="authStore.currentUser?.providers.includes('google.com')" class="w-full flex justify-center">
                                <div ref="gsiButtonContainer" />
                            </div>
                            <div v-show="(authStore.currentUser?.providers.length || 0) >= 2" class="inline-flex items-center justify-center w-full relative">
                                <hr class="w-64 h-px bg-zinc-200 border-0 dark:bg-zinc-700">
                                <span class="absolute px-3 font-medium text-zinc-700 -translate-x-1/2 bg-white left-1/2 dark:text-white dark:bg-zinc-800">or</span>
                            </div>
                            <div v-show="authStore.currentUser?.providers.includes('password')">
                                <label for="password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Password</label>
                                <input id="password" v-model="reauthPassword" type="password" placeholder="••••••••" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:border-zinc-500 dark:bg-zinc-600 dark:placeholder-zinc-400 dark:text-white" required>
                            </div>
                            <button v-show="authStore.currentUser?.providers.includes('password')" :disabled="reauthenticateLoading" type="submit" class="flex items-center w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                                <Loader v-if="reauthenticateLoading" class="w-4 h-4 mr-1" :size="1" />
                                Reauthenticate
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <div v-show="currentModal === 'change-password'" tabindex="-1" aria-hidden="true" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="closeModals">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="px-6 py-6 lg:px-8">
                        <h3 class="mb-3 text-xl font-medium text-zinc-900 dark:text-white">Change Password</h3>
                        <p v-show="!authStore.currentUser?.providers.includes('password')" class="text-zinc-500 dark:text-zinc-400 mb-2">
                            Filling out this form will allow you to sign in with your email and password as well as with Google.
                        </p>
                        <form class="space-y-3" @submit.prevent="onChangePasswordSubmit">
                            <div>
                                <label for="new-password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">New Password</label>
                                <input id="new-password" v-model="newPassword" type="password" placeholder="••••••••" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:border-zinc-500 dark:bg-zinc-600 dark:placeholder-zinc-400 dark:text-white" required>
                            </div>
                            <div>
                                <label for="confirm-new-password" class="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Confirm Password</label>
                                <input id="confirm-new-password" v-model="confirmNewPassword" type="password" placeholder="••••••••" class="bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 dark:border-zinc-500 dark:bg-zinc-600 dark:placeholder-zinc-400 dark:text-white" required>
                            </div>
                            <button :disabled="changePasswordLoading" type="submit" class="flex items-center w-full text-white bg-primary hover:bg-primary-alt focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
                                <Loader v-if="changePasswordLoading" class="w-4 h-4 mr-1" :size="1" />
                                Change Password
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <div v-show="currentModal === 'delete-account'" tabindex="-1" class="fixed top-0 left-0 right-0 z-40 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full justify-center items-center flex">
            <div class="relative w-full max-w-md max-h-full">
                <div class="relative bg-white rounded-lg shadow dark:bg-zinc-800">
                    <button type="button" class="absolute top-3 right-2.5 text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="closeModals">
                        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
                        <span class="sr-only">Close modal</span>
                    </button>
                    <div class="p-6 text-center">
                        <ExclamationCircleIcon class="mx-auto mb-4 text-zinc-400 w-12 h-12 dark:text-zinc-200 stroke-2" />
                        <h3 class="mb-5 text-lg font-normal text-zinc-500 dark:text-zinc-400">
                            <span class="font-bold mr-2">Are you sure you want to delete your account?</span>
                            Your sets will not be deleted.
                        </h3>
                        <button type="button" class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center mr-2" @click="deleteAccount">
                            Yes, I'm sure
                        </button>
                        <button type="button" class="text-zinc-500 bg-white hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-200 rounded-lg border border-zinc-200 text-sm font-medium px-5 py-2.5 hover:text-zinc-900 focus:z-10 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-500 dark:hover:text-white dark:hover:bg-zinc-600 dark:focus:ring-zinc-600" @click="closeModals">No, cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, ref, getCurrentInstance } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../store';
import { CheckIcon, EnvelopeIcon, UserIcon, PhotoIcon } from '@heroicons/vue/20/solid';
import Loader from '../components/Loader.vue';
import { showSuccessToast, showWarningToast, showErrorToast } from '../utils';
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline';
import { loadGoogleSignIn, renderGoogleButton, errorMessages } from '../firebase-rest-api/auth';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const displayName = ref('');
const photoUrl = ref('');
const displayNameInput = ref<HTMLInputElement | null>(null);
const photoUrlInput = ref<HTMLInputElement | null>(null);
const displayNameLoading = ref(false);
const photoUrlLoading = ref(false);
const currentInstance = getCurrentInstance();
const currentModal = ref<"reauth" | "change-password" | "delete-account" | null>(null);
const currentReauthAction = ref<"delete-account" | "change-password" | null>(null);
const gsiButtonContainer = ref<HTMLDivElement | null>(null);
const reauthPassword = ref('');
const reauthenticateLoading = ref(false);
const newPassword = ref('');
const confirmNewPassword = ref('');
const changePasswordLoading = ref(false);

const authProviders = computed(() => {
    return authStore.currentUser?.providers.map(provider => {
        switch (provider) {
            case 'google.com':
                return 'Google';
            case 'password':
                return 'Email/Password';
            default:
                return provider;
        }
    }).join(", ");
});

function handleState(state: (typeof authStore)["$state"]) {
    if (state.currentUser === null) {
        void router.push({ name: 'login', params: { next: route.fullPath } });
    } else {
        displayName.value = state.currentUser.displayName;
        photoUrl.value = state.currentUser.photoUrl;
    }
}

async function saveDisplayName() {
    if (displayNameInput.value?.reportValidity()) {
        displayNameLoading.value = true;
        await authStore.updateProfile({ displayName: displayName.value });
        displayNameLoading.value = false;
        showSuccessToast("Display name saved successfully", currentInstance?.appContext, 5000);
    }
}

async function savePhotoUrl() {
    if (photoUrlInput.value?.reportValidity()) {
        photoUrlLoading.value = true;
        await authStore.updateProfile({ photoUrl: photoUrl.value });
        photoUrlLoading.value = false;
        showSuccessToast("Profile picture saved successfully", currentInstance?.appContext, 5000);
    }
}

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

async function openReauthModal(reason: "delete-account" | "change-password") {
    currentModal.value = 'reauth';
    currentReauthAction.value = reason;
    if (gsiButtonContainer.value && !gsiButtonContainer.value.innerHTML) { // only render the button if we haven't before
        if (import.meta.env.PROD) {
            await loadGoogleSignIn();
            renderGoogleButton(gsiButtonContainer.value, async response => {
                if (response.credential && currentReauthAction.value !== null) {
                    console.log(response);
                    const { email } = JSON.parse(atob(response.credential.split(".")[1])) as { email: string };
                    if (email !== authStore.currentUser?.email) {
                        showErrorToast("You didn't choose the correct account", currentInstance?.appContext, 3000);
                    } else {
                        try {
                            await authStore.signInWithGoogleCredential(response.credential);
                            reauthContinue();
                        } catch (err) {
                            reportToastResult((err as Error).message);
                        }
                    }
                }
            });
        } else {
            gsiButtonContainer.value.innerHTML = "Continue with google emulator";
            gsiButtonContainer.value.addEventListener("click", async () => {
                try {
                    await authStore.showGooglePopup(true);
                    reauthContinue();
                } catch (err) {
                    reportToastResult((err as Error).message);
                }
            });
        }
    }
}

async function onReauthSubmit() {
    reauthenticateLoading.value = true;
    if (currentReauthAction.value !== null && authStore.currentUser) {
        try {
            await authStore.signInWithEmailAndPassword(authStore.currentUser.email, reauthPassword.value);
            reauthContinue();
        } catch {
            showErrorToast("Incorrect password", currentInstance?.appContext, 3000);
        }
    }
    reauthenticateLoading.value = false;
}

async function onChangePasswordSubmit() {
    changePasswordLoading.value = true;
    if (newPassword.value === confirmNewPassword.value) {
        try {
            await authStore.updatePassword(newPassword.value);
            showSuccessToast("Password changed successfully", currentInstance?.appContext, 5000);
            closeModals();
        } catch (err) {
            reportToastResult((err as Error).message);
        }
    } else {
        showErrorToast("Passwords do not match", currentInstance?.appContext, 3000);
    }
    changePasswordLoading.value = false;
}

async function deleteAccount() {
    try {
        await authStore.deleteCurrentUser();
        closeModals();
        showSuccessToast("Account deleted successfully", currentInstance?.appContext, 5000);
    } catch (err) {
        reportToastResult((err as Error).message);
    }
}

function reauthContinue() {
    const reauthAction = currentReauthAction.value;
    closeModals();
    currentModal.value = reauthAction;
}

function closeModals() {
    currentModal.value = null;
    currentReauthAction.value = null;
}

handleState(authStore);

// Redirect to login if user gets logged out
authStore.$subscribe((_, state) => {
    handleState(state);
});
</script>