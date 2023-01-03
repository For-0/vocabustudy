// disabled because this file is WIP
/* eslint-disable no-unused-vars */
import {manifest, version} from "@parcel/service-worker";

async function install() {
    const cache = await caches.open(version);
    //await cache.addAll(manifest);
}

async function activate() {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => key !== version && caches.delete(key)));
}

addEventListener("install", e => e.waitUntil(install()));
addEventListener("activate", e => e.waitUntil(activate()));