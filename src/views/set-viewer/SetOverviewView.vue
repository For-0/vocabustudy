<template>
    <div class="my-4">
        <!-- Header - title, like -->
        <div class="flex gap-x-3 mb-3 text-zinc-900 dark:text-white">
            <h2 class="text-2xl leading-7 sm:text-3xl font-bold grow text-ellipsis overflow-hidden">
                {{ currentSet.name }}
            </h2>
            <span class="bg-blue-100 text-blue-800 shrink-0 text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded dark:bg-blue-800/25 dark:text-blue-300 border border-blue-300">
                <QueueListIcon class="w-2.5 h-2.5 mr-1.5" aria-hidden="true" />
                {{ pluralizeWord("term", currentSet.terms.length) }}
            </span>
        </div>
        <div class="flex flex-wrap gap-x-3 mb-3 text-zinc-900 dark:text-white items-start">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p v-if="currentSet.description" class="grow prose prose-zinc dark:prose-invert max-w-none prose-a:hover:no-underline" v-html="styleAndSanitize(currentSet.description, true)" />
        
            <ProfileDate v-if="creator" :profile="creator" :date="currentSet.creationTime" />
        </div>
        <!-- Study Guide -->
        <hr class="h-px my-4 bg-zinc-200 border-0 dark:bg-zinc-800">
        <template v-if="isStudyGuide(currentSet)">
            <!-- Top tab bar -->
            <div class="border-b border-zinc-200 dark:border-zinc-700 mb-4">
                <ul class="flex flex-wrap -mb-px text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <li v-for="page, i in currentSet.terms" :key="i" class="mr-2">
                        <button
                            type="button"
                            class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group"
                            :class="currentStudyGuidePage === i ? 'text-primary border-primary dark:text-primary-light dark:border-primary-light' : 'hover:text-zinc-600 hover:border-zinc-300 dark:hover:text-zinc-300 border-transparent'"
                            @click="currentStudyGuidePage = i"
                        >
                            <DocumentTextIcon v-if="page.type === 0" class="w-4 h-4 mr-2" :class="currentStudyGuidePage === i ? 'text-primary dark:text-primary-light' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'" />
                            <svg v-else class="w-4 h-4 mr-2" :class="currentStudyGuidePage === i ? 'text-primary dark:text-primary-light' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M2 10h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm9-9h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 9a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3zm0-10a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-3zM2 9a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H2zm7 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3zM0 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.354.854a.5.5 0 1 0-.708-.708L3 3.793l-.646-.647a.5.5 0 1 0-.708.708l1 1a.5.5 0 0 0 .708 0l2-2z" />
                            </svg>
                            {{ page.title }}
                        </button>
                    </li>
                </ul>
            </div>
            <div class="text-zinc-700 dark:text-zinc-300">
                <h3 class="text-lg mb-3">{{ currentStudyGuideItem.title }}</h3>
                <p v-if="studyGuideItemIsReading(currentStudyGuideItem!)" class="mb-3 prose lg:prose-xl prose-zinc dark:prose-invert">
                    {{ currentStudyGuideItem.body }}
                </p>
        
                <!-- guide quiz
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <GuideQuestionEditor
                        v-for="(_, index) in currentStudyGuideItem.questions"
                        :key="index" v-model:question="currentStudyGuideItem.questions[index]"
                        @move-left="swap(currentStudyGuideItem.questions, index, index - 1)"
                        @move-right="swap(currentStudyGuideItem.questions, index, index + 1)"
                        @remove="currentStudyGuideItem.questions.splice(index, 1)"
                    />
                    <button class="cursor-pointer border-zinc-400 dark:border-zinc-600 border-dashed hover:border-zinc-500 dark:hover:border-zinc-500 text-zinc-400 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-500 border-2 rounded-md p-3" type="button" @click="currentStudyGuideItem.questions.push({ question: '', type: 0, answers: [''] })">
                        <PlusCircleIcon class="w-9 h-9 mx-auto my-3" />
                        <p class="text-center mb-2">Add a question</p>
                    </button>
                </div>-->
            </div>
        </template>
        <!-- term/definitions -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            <!-- eslint-disable vue/no-v-html -->
            <div v-for="({ term, definition }, index) in currentSet.terms" :key="index" class="shadow-sm dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 dark:bg-zinc-900 border rounded-md p-4 relative">
                <h3 class="text-lg pb-4 border-b border-inherit prose prose-zinc dark:prose-invert" v-html="styleAndSanitize(term, true)" />
                <p class="text-sm mt-3 prose prose-zinc dark:prose-invert" v-html="styleAndSanitize(definition, true)" />
                <button class="text-yellow-700 bg-transparent hover:bg-yellow-600/10 hover:text-yellow-600 p-1 h-7 w-7 rounded-lg text-sm inline-flex items-center absolute top-3 right-3" title="Star" type="button" @click="$emit('toggle-star', index)">
                    <StarSolidIcon v-if="starredTerms.includes(index)" class="w-5 h-5" />
                    <StarOutlineIcon v-else class="w-5 h-5" />
                </button>
            </div>
            <!-- eslint-enable vue/no-v-html -->
        </div>
        <!-- Social menu -->
        <div class="fixed top-0 right-0 z-40 w-full md:w-96 h-screen p-4 flex flex-col duration-75 transition-transform bg-white dark:bg-zinc-800" :class="{ 'translate-x-full': !socialDrawerOpen }" tabindex="-1" @click.stop>
            <h5 class="mb-2 text-base font-semibold text-zinc-500 uppercase dark:text-zinc-400">Likes ({{ currentSet.likes.length }})</h5>
            <div class="mb-3 flex bg-inherit items-cenn">
                <div class="space-x-1 md:-space-x-3 flex md:hover:space-x-1 bg-inherit overflow-hidden min-w-0 grow items-center">
                    <img
                        v-for="uid in currentSet.likes" :key="uid" class="w-6 h-6 inline rounded-full transition-all ease-in-out bg-inherit"
                        :src="cacheStore.userProfileCache.get(uid)?.photoUrl || defaultPfp"
                        :title="cacheStore.userProfileCache.get(uid)?.displayName || 'Unknown User'"
                        alt="Profile picture"
                    >
                </div>
                <button v-if="authStore.currentUser" :disabled="likeLoading" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 p-1 h-7 w-7 rounded-lg text-sm inline-flex items-center dark:hover:bg-zinc-600 dark:hover:text-white" type="button" @click="toggleLike">
                    <Loader v-if="likeLoading" class="w-5 h-5" :size="1" />
                    <HeartSolidIcon v-else-if="currentSet.likes.includes(authStore.currentUser.uid)" class="w-5 h-5" />
                    <HeartOutlineIcon v-else class="w-5 h-5" />
                </button>
            </div>
        
            <h5 class="mb-2 text-base font-semibold text-zinc-500 uppercase dark:text-zinc-400">Comments ({{ Object.keys(currentSet.comments).length }})</h5>
            <button type="button" class="text-zinc-400 bg-transparent hover:bg-zinc-200 hover:text-zinc-900 rounded-lg text-sm p-1.5 absolute top-2.5 right-2.5 inline-flex items-center dark:hover:bg-zinc-600 dark:hover:text-white" @click="socialDrawerOpen = false">
                <XMarkIcon class="w-5 h-5" />
                <span class="sr-only">Close menu</span>
            </button>
            <div class="mb-3 overflow-y-auto custom-scrollbar is-thumb-only grow min-h-0">
                <article v-for="[uid, comment] in Object.entries(currentSet.comments)" :key="uid" class="p-6 mb-4 text-base bg-zinc-50 rounded-lg dark:bg-zinc-900">
                    <footer class="flex justify-between items-center mb-2">
                        <p class="flex items-center min-w-0 mr-3 text-sm text-zinc-900 dark:text-white">
                            <img
                                class="mr-2 w-6 h-6 rounded-full"
                                :src="cacheStore.userProfileCache.get(uid)?.photoUrl || defaultPfp"
                                alt="Profile picture"
                            >
                            <span class="break-words min-w-0">{{ cacheStore.userProfileCache.get(uid)?.displayName || "Unknown User" }}</span>
                        </p>
                        <button v-if="authStore.currentUser?.uid === uid" class="inline-flex items-center p-2 text-sm font-medium text-center text-zinc-400 bg-white rounded-lg hover:bg-zinc-100 focus:ring-4 focus:outline-none focus:ring-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700 dark:focus:ring-zinc-600" type="button" @click="handleEditClick">
                            <Loader v-if="isSavingComment" class="w-2 h-2" :size="1" />
                            <CheckIcon v-else-if="isEditingExistingComment" class="w-5 h-5" />
                            <PencilSquareIcon v-else class="w-5 h-5" />
                            <span class="sr-only">{{ isEditingExistingComment ? "Save" : "Edit" }} comment</span>
                        </button>
                    </footer>
                    <textarea v-if="authStore.currentUser?.uid === uid && isEditingExistingComment" v-model="commentInputValue" rows="2" type="text" placeholder="Write a comment..." class="py-2 px-4 bg-white rounded-lg rounded-t-lg border border-zinc-200 dark:border-zinc-700 w-full text-sm text-zinc-900 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-zinc-400 dark:bg-zinc-800" />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p v-else class="text-zinc-500 dark:text-zinc-400 break-words" v-html="styleAndSanitize(comment, true)" />
                </article>
            </div>
            <form v-if="authStore.currentUser && !(authStore.currentUser.uid in currentSet.comments)" class="w-full border border-gray-200 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600" @submit.prevent="handleAddCommentSubmit">
                <div class="px-4 py-2 bg-white rounded-t-lg dark:bg-zinc-800">
                    <label for="add-comment" class="sr-only">Your comment</label>
                    <textarea id="add-comment" v-model="commentInputValue" rows="2" class="w-full px-0 text-sm text-zinc-900 bg-white border-0 dark:bg-zinc-800 focus:ring-0 dark:text-white dark:placeholder-zinc-400" placeholder="Write a comment..." required />
                </div>
                <div class="flex items-center justify-between px-3 py-2 border-t dark:border-zinc-600">
                    <button
                        :disabled="isSavingComment" type="submit"
                        class="inline-flex items-center py-2.5 px-4 text-xs font-medium text-center text-white bg-primary rounded-lg focus:ring-4 focus:ring-primary/50 hover:bg-primary-alt"
                    >
                        <Loader v-if="isSavingComment" class="w-4 h-4" :size="1" />
                        Post comment
                    </button>
                </div>
            </form>
        </div>
        <button type="button" title="Comments" class="fixed top-20 right-0 text-zinc-300 border shadow focus:outline-none hover:bg-primary-alt font-medium rounded-tl-full rounded-bl-full border-r-0 text-sm pr-1 p-2.5 bg-primary border-primary-alt hover:border-primary" @click.stop="socialDrawerOpen = true">
            <ChatBubbleBottomCenterTextIcon class="w-5 h-5" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { isStudyGuide, showErrorToast, studyGuideItemIsReading, pluralizeWord } from '../../utils';
import { styleAndSanitize } from '../../markdown';
import type { FieldTransform, PartialSetForViewer, StudyGuideQuiz, StudyGuideReading, UserProfile } from "../../types";
import ProfileDate from '../../components/ProfileDate.vue';
import { computed, getCurrentInstance, ref, onMounted } from 'vue';
import { DocumentTextIcon, HeartIcon as HeartOutlineIcon, StarIcon as StarOutlineIcon } from "@heroicons/vue/24/outline";
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from "@heroicons/vue/24/solid";
import { XMarkIcon, ChatBubbleBottomCenterTextIcon, PencilSquareIcon, CheckIcon, QueueListIcon } from "@heroicons/vue/20/solid";
import { useAuthStore, useCacheStore } from '../../store';
import defaultPfp from "../../assets/images/default-pfp.svg";
import Loader from '../../components/Loader.vue';
import { BatchWriter, Firestore, VocabSet } from '../../firebase-rest-api/firestore';

const props = defineProps<{
    currentSet: PartialSetForViewer;
    creator: UserProfile;
    starredTerms: number[];
}>();

const emit = defineEmits<{
    "update-comment": [newComment: string];
    "update-like": [like: boolean];
    "toggle-star": [termIndex: number];
}>();

const socialDrawerOpen = ref(false);
const currentStudyGuidePage = ref(0);
const currentStudyGuideItem = computed(() => props.currentSet.terms[currentStudyGuidePage.value] as StudyGuideQuiz | StudyGuideReading);
const authStore = useAuthStore();
const cacheStore = useCacheStore();
const isEditingExistingComment = ref(false);
const isSavingComment = ref(false);
const likeLoading = ref(false);
const commentInputValue = ref("");
const currentInstance = getCurrentInstance();

async function updateProfiles() {
    await cacheStore.getAllProfiles([...Object.keys(props.currentSet.comments), ...props.currentSet.likes]);
}

async function saveComment(comment: string) {
    await Firestore.updateDocument(VocabSet.collectionKey, props.currentSet.pathParts[props.currentSet.pathParts.length - 1], {
        comments: comment ? {
            [authStore.currentUser!.uid]: comment
        } : { } // remove the comment
    }, authStore.currentUser!.token.access, [`comments.${authStore.currentUser!.uid}`]);
    emit("update-comment", comment);
}

async function handleEditClick() {
    if (isSavingComment.value || !authStore.currentUser) return;
    const { uid } = authStore.currentUser;
    if (isEditingExistingComment.value) {
        isSavingComment.value = true;
        try {
            await saveComment(commentInputValue.value);
            isEditingExistingComment.value = false;
            commentInputValue.value = "";
        } catch (err) {
            showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
        }
        isSavingComment.value = false;
    } else {
        commentInputValue.value = props.currentSet.comments[uid];
        isEditingExistingComment.value = true;
    }
}

async function handleAddCommentSubmit() {
    if (isSavingComment.value || !authStore.currentUser) return;
    isSavingComment.value = true;
    try {
        await saveComment(commentInputValue.value);
        commentInputValue.value = "";
        await cacheStore.getProfile(authStore.currentUser.uid);
    } catch (err) {
        showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
    }
    isSavingComment.value = false;
}

async function toggleLike() {
    if (likeLoading.value || !authStore.currentUser) return;
    likeLoading.value = true;
    const writer = new BatchWriter();
    const modKey: "appendMissingElements" | "removeAllFromArray" = props.currentSet.likes.includes(authStore.currentUser.uid) ? "removeAllFromArray" : "appendMissingElements";
    writer.update<VocabSet>(props.currentSet.pathParts.slice(-2), {}, [{
        fieldPath: "likes",
        [modKey]: Firestore.createField([authStore.currentUser.uid]).arrayValue
    } as FieldTransform]);
    try {
        await writer.commit(authStore.currentUser.token.access);
        emit("update-like", !props.currentSet.likes.includes(authStore.currentUser.uid));
    } catch (err) {
        showErrorToast(`An unknown error occurred: ${(err as Error).message}`, currentInstance?.appContext, 7000);
    }
    likeLoading.value = false;
}

onMounted(async () => {
    await updateProfiles();
});
</script>