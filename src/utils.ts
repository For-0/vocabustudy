import { openDB } from "idb";
import collectionData from "./assets/collections.json" assert { type: "json" };
import type { VocabustudyDB } from "./types";
import { type Component, createVNode, render, type AppContext } from "vue";
import BaseToast from "./components/BaseToast.vue";
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

export async function getLocalDb() {
    return await openDB<VocabustudyDB>("vocabustudy-database", 2, {
        upgrade(db, oldVersion) {
            if (oldVersion === 0)
                db.createObjectStore("autosave-backups", { keyPath: "setId" });
            db.createObjectStore("general");
        }
    });
}

export function parseCollections(collections: string[]) {
    const parsedCollections = collections.map(el => el.split(":").map(el => parseInt(el)));
    const collectionNames = parsedCollections.map(el => {
        let resolvedName = "Unknown Collection";
        try {
            if (isNaN(el[0])) {
                if (el[1] == 0) resolvedName = "Study Guide : Timeline";
                else if (el[1] == 1) resolvedName = "Study Guide : Notes";
            }
            const collectionName = collectionData.c[el[0]];
            if (typeof collectionName === "string") resolvedName = collectionName;
            else {
                if (el.length === 1) resolvedName = collectionName.n;
                else if (el.length === 2) resolvedName = `${collectionName.n} : ${collectionName.s[el[1]]}`;
                else if (collectionName.o) resolvedName = `${collectionName.n} : ${collectionName.s[el[1]]} : ${collectionName.o[el[2]]}`;
            }
        } catch { /* empty */ }

        return { name: resolvedName, id: el.join(":") };
    });
    return collectionNames;
}

export function pluralizeWord(word: string, number: number) {
    return `${number} ${word}${number === 1 ? "" : "s"}`;
}

export function humanizeDate(date: Date) {
    // If it's today or yesterday, return "today" or "yesterday"
    // If it's within a week, return the number of days ago
    // Within a month -> return number of weeks ago
    // Within a year -> return number of months ago
    // Otherwise, return number of years ago
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = diff / (1000 * 3600 * 24);
    if (diffDays < 1) return "today";
    if (diffDays < 2) return "yesterday";
    if (diffDays < 7) return `${pluralizeWord("day", Math.floor(diffDays))} ago`;
    if (diffDays < 30) return `${pluralizeWord("week", Math.floor(diffDays / 7))} ago`;
    if (diffDays < 365) return `${pluralizeWord("month", Math.floor(diffDays / 30))} ago`;
    return `${pluralizeWord("year", Math.floor(diffDays / 365))} ago`;
}

/**
 * Get a list of all alphanumeric words in a string
 * @param string The string to get words from
 */
export function getWords(string: string): string[] {
    const alphaNum = string.replace(/\W/g, " ").toLowerCase();
    return alphaNum.split(" ").map(el => el.trim()).filter(el => el);
}

export function generateDocumentId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const targetLength = 20;
    const maxMultiple = 248; // Math.floor(256 / chars.length) * chars.length; - largest multiple of chars.length that is smaller than 256 (largest possible byte value)
    let id = "";
    while (id.length < targetLength) {
        const bytes = new Uint8Array(40);
        window.crypto.getRandomValues(bytes);
        for (const byte of bytes) {
            if (id.length >= targetLength) break;
            if (byte < maxMultiple) id += chars.charAt(byte % chars.length);
        }
    }
    return id;
}

export function showToast(props: { icon: Component, iconColor: string, iconSrText: string, text: string }, appContext: AppContext | undefined, duration: number) {
    if (!appContext) return;
    const toastContainer = document.getElementById("toast-container");
    const toastRenderEl = toastContainer?.appendChild(document.createElement("div"));
    if (toastRenderEl) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const vnode = createVNode(BaseToast, { ...props, isHidden: true, closeEarly() {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            render(null, toastRenderEl);
            toastRenderEl.remove();
        } });
        vnode.appContext = { ...appContext };
        render(vnode, toastRenderEl);
        const t1 = setTimeout(() => {
            if (vnode.component) vnode.component.props.isHidden = false
        }, 0);
        const t2 = setTimeout(() => {
            if (vnode.component) vnode.component.props.isHidden = true; 
        }, duration + 150);
        const t3 = setTimeout(() => {
            render(null, toastRenderEl);
            toastRenderEl.remove();
        }, duration + 300);
    }
}

export function showSuccessToast(text: string, appContext: AppContext | undefined, duration: number) {
    showToast({ icon: CheckIcon, iconColor: "green", iconSrText: "Success", text }, appContext, duration);
}

export function showErrorToast(text: string, appContext: AppContext | undefined, duration: number) {
    showToast({ icon: XMarkIcon, iconColor: "red", iconSrText: "Error", text }, appContext, duration);
}

export function showWarningToast(text: string, appContext: AppContext | undefined, duration: number) {
    showToast({ icon: ExclamationTriangleIcon, iconColor: "yellow", iconSrText: "Warning", text }, appContext, duration);
}

export function swap<T>(array: T[], i: number, j: number) {
    if (i === j || i < 0 || j < 0 || i >= array.length || j >= array.length) return;
    [array[i], array[j]] = [array[j], array[i]];
}