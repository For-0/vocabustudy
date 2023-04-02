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

const converterExtensionId = ""; // TODO: do this

function sendMessagePromise(extensionId: string, message: unknown) {
    return new Promise((resolve, reject) =>
        window.chrome?.runtime?.sendMessage(extensionId, message, response => {
            if (window.chrome.runtime.lastError) reject(window.chrome.runtime.lastError);
            else resolve(response);
        })
    );
}

export async function getQuizletSet(setId: string): Promise<VocabSet<TermDefinition[]>> {
    const res = await sendMessagePromise(converterExtensionId, { type: "fetch-set", setId });
    return res as VocabSet<TermDefinition[]>;
}

export async function detectAvailability() {
    if (!("chrome" in window) || !("runtime" in window.chrome) || !("sendMessage" in window.chrome.runtime)) return false;
    try {
        const res = await sendMessagePromise(converterExtensionId, { type: "ping" });
        if (!res || !(res instanceof Object) || !("type" in res) || res.type !== "pong") return false;
        return true;
    } catch {
        return false;
    }
}