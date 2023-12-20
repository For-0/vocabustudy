import type { PluginOption } from "vite";
import { resolve } from "path";
import { join } from "path/posix";
import { readdir } from "fs/promises";
import { createHash } from "crypto";

async function listPublicFiles(subdir: string) {
    const items = await readdir(resolve("public", subdir), { withFileTypes: true });
    // Public files are hosted at the root
    return items.filter(item => item.isFile()).map(item => join("/", subdir, item.name));
}

export const serviceWorkerPlugin: PluginOption = {
    name: "service-worker-plugin",
    async generateBundle(options, bundle) {
        // Cache the homepage, set detail, 404, and saved sets pages
        const chunksToCache = [
            "index",
            "index.css",
            "set-detail.css",
            "set-detail",
            "NotFoundView",
            "SavedSetsView",
            "vendor"
        ];

        const resolvedAssets = Object.values(bundle)
            .filter(item => item.name && chunksToCache.includes(item.name))
            .map(item => join("/", item.fileName));

        // Now get a list of all the files we need to cache in `public`
        const publicFiles = [
            ...await listPublicFiles("icons"),
            ...await listPublicFiles("images"),
            "/favicon.ico",
            "/app.webmanifest",
            "/"
        ];
        
        const fullCacheList = JSON.stringify([...resolvedAssets, ...publicFiles]);
        // Create a 4 byte hash of the cache list
        const cacheHash = createHash("shake256", { outputLength: 4 }).update(fullCacheList).digest("hex");

        const serviceWorker = 
            `const version = "vus-offline-cache-${cacheHash}";
const manifest = ${fullCacheList};
async function install() {
    const cache = await caches.open(version);
    await cache.addAll(manifest);
}

async function activate() {
    const keys = await caches.keys();
    // Delete all caches except the current one
    await Promise.all(keys.map(key => key !== version && caches.delete(key)));
}

async function fetchWithCache(req) {
    const cache = await caches.open(version);

    // If we're navigating to a page, return the homepage so vue-router can handle it
    if (req.destination === "document") return await cache.match("/");

    const res = await cache.match(req);
    if (res) return res;
    else return fetch(req);
}

addEventListener("install", e => e.waitUntil(install()));
addEventListener("activate", e => e.waitUntil(activate()));
addEventListener("fetch", e => e.respondWith(fetchWithCache(e.request)));`;
        
        // Write the service worker to the build directory
        this.emitFile({
            fileName: "service-worker.js",
            type: "asset",
            source: serviceWorker
        });
    }
}