import { createApp, type Component } from 'vue';
import App from './App.vue';
import './assets/main.css';
import { createPinia } from 'pinia';
import createRouter from "./router";

const app = createApp(App as Component);
const pinia = createPinia();

app.use(pinia);
app.use(createRouter());

app.mount('#app');

// Polyfills
if (!("structuredClone" in window)) {
    (window as Window).structuredClone = <T>(obj: T) => JSON.parse(JSON.stringify(obj)) as T;
}

if (!("findLastIndex" in Array.prototype)) {
    Object.defineProperty(Array.prototype, "findLastIndex", {
        value: function <T>(this: T[], predicate: (value: T, index: number, obj: T[]) => unknown) {
            for (let i = this.length - 1; i >= 0; i--) {
                if (predicate.call(this, this[i], i, this)) return i;
            }
            return -1;
        },
        enumerable: false,
        configurable: false,
        writable: false
    });
}

if (!("randomUUID" in crypto)) {
    Object.defineProperty(crypto as Crypto, "randomUUID", {
        value: () => {
            const uuidTemplate = (1e7).toString() + -1e3 + -4e3 + -8e3 + -1e11;
            return uuidTemplate.replace(/[018]/g, c => (parseInt(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4).toString(16));
        },
        enumerable: false,
        configurable: false,
        writable: false
    });
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/service-worker.js");
}
