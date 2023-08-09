import type { VocabSet } from "../firebase-rest-api/firestore";
import type { TermDefinition } from "../types";

declare global {
    interface Window {
        chrome?: {
            runtime: {
                sendMessage?: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void;
                lastError?: object;
            }
        }
    }
}

export class FirefoxAddonMessager {
    channel: MessageChannel;
    receivedPong: boolean;
    floatingSetPromise?: {
        resolve(value: VocabSet<TermDefinition[]>): void;
        reject(reason: unknown): void;
    };
    floatingPongPromise?: {
        resolve(): void;
    };
    constructor() {
        this.channel = new MessageChannel();
        this.channel.port1.addEventListener("message", (e: MessageEvent<{ type: "pong" } | { type: "set-fetched", set: VocabSet<TermDefinition[]> } | { type: "unknown" }>) => {
            if (!("type" in e.data)) return;
            if (e.data.type === "pong") {
                this.receivedPong = true;
                this.floatingPongPromise?.resolve();
                this.floatingPongPromise = undefined;
            } else if (e.data.type === "set-fetched") {
                this.floatingSetPromise?.resolve(e.data.set);
                this.floatingSetPromise = undefined;
            }
        });
        this.channel.port1.start();
        window.postMessage({ type: "send-firefox-messaging-port" }, "*", [this.channel.port2]);
        this.receivedPong = false;
    }
    /** Wait for the firefox content script to be registered */
    waitForPong(timeout=1000) {
        if (this.receivedPong) return Promise.resolve();
        return Promise.race([
            new Promise((_resolve, reject) => setTimeout(() => { reject("timed out"); }, timeout)),
            new Promise<void>(resolve => this.floatingPongPromise = { resolve })
        ]);
    }
    fetchSet(setId: string) {
        this.channel.port1.postMessage({ type: "fetch-set", setId });
        return new Promise((resolve: (value: VocabSet<TermDefinition[]>) => void, reject) => this.floatingSetPromise = { resolve, reject })
    }
}

const converterExtensionId = "eghgpfmnjfjhpfiipnpgmpfiggiejgop";

function sendMessagePromise(extensionId: string, message: unknown) {
    return new Promise((resolve, reject) => {
            window.chrome?.runtime.sendMessage?.(extensionId, message, response => {
                if (window.chrome!.runtime.lastError) reject(window.chrome!.runtime.lastError);
                else resolve(response);
            });
        }
    );
}

async function getQuizletSet(setId: string, firefoxAddonMessager: FirefoxAddonMessager) {
    if (firefoxAddonMessager.receivedPong) return await firefoxAddonMessager.fetchSet(setId);
    const res = await sendMessagePromise(converterExtensionId, { type: "fetch-set", setId });
    return res as VocabSet<TermDefinition[]> | undefined;
}

async function detectAvailability(firefoxAddonMessager: FirefoxAddonMessager) {
    if (!("chrome" in window)) {
        try {
            await firefoxAddonMessager.waitForPong();
            return true;
        } catch {
            return false;
        }
    } else if (!(window.chrome && "runtime" in window.chrome && "sendMessage" in window.chrome.runtime)) return false;
    try {
        const res = await sendMessagePromise(converterExtensionId, { type: "ping" });
        if (!res || !(res instanceof Object) || !("type" in res) || res.type !== "pong") return false;
        return true;
    } catch {
        return false;
    }
}

export async function detectAndGetQuizletSet(setId: string) {
    const firefoxAddonMessager = new FirefoxAddonMessager();
    if (await detectAvailability(firefoxAddonMessager)) {
        const quizletSet = await getQuizletSet(setId, firefoxAddonMessager);
        if (!quizletSet) return "not-found";
        else return quizletSet;
    } else return "quizlet-not-supported";
}