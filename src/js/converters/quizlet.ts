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
        resolve(value: void): void;
    };
    constructor() {
        this.channel = new MessageChannel();
        this.channel.port1.addEventListener("message", e => {
            if (e.data.type === "pong") {
                this.receivedPong = true;
                this.floatingPongPromise?.resolve();
                this.floatingPongPromise = undefined;
            } else if (e.data.type === "set-fetched") {
                this.floatingSetPromise?.resolve(e.data.set as VocabSet<TermDefinition[]>);
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
            new Promise((_resolve, reject) => setTimeout(() => reject("timed out"), timeout)),
            new Promise((resolve: (value: void) => void) => this.floatingPongPromise = { resolve })
        ]);
    }
    fetchSet(setId: string) {
        this.channel.port1.postMessage({ type: "fetch-set", setId });
        return new Promise((resolve: (value: VocabSet<TermDefinition[]>) => void, reject) => this.floatingSetPromise = { resolve, reject })
    }
}

const converterExtensionId = "eghgpfmnjfjhpfiipnpgmpfiggiejgop";

function sendMessagePromise(extensionId: string, message: unknown) {
    return new Promise((resolve, reject) =>
        window.chrome?.runtime?.sendMessage(extensionId, message, response => {
            if (window.chrome.runtime.lastError) reject(window.chrome.runtime.lastError);
            else resolve(response);
        })
    );
}

export async function getQuizletSet(setId: string, firefoxAddonMessager: FirefoxAddonMessager): Promise<VocabSet<TermDefinition[]>> {
    if (firefoxAddonMessager.receivedPong) return await firefoxAddonMessager.fetchSet(setId);
    const res = await sendMessagePromise(converterExtensionId, { type: "fetch-set", setId });
    return res as VocabSet<TermDefinition[]>;
}

export async function detectAvailability(firefoxAddonMessager: FirefoxAddonMessager) {
    if (!("chrome" in window)) {
        try {
            await firefoxAddonMessager.waitForPong();
            return true;
        } catch {
            return false;
        }
    } else if (!("runtime" in window.chrome) || !("sendMessage" in window.chrome.runtime)) return false;
    try {
        const res = await sendMessagePromise(converterExtensionId, { type: "ping" });
        if (!res || !(res instanceof Object) || !("type" in res) || res.type !== "pong") return false;
        return true;
    } catch {
        return false;
    }
}