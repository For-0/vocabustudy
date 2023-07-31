import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        /*VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico", "apple-touch-icon.png"],
            injectRegister: "inline",
            manifest: {
                name: "Vocabustudy",
                short_name: "Vocabustudy",
                theme_color: "#795548",
                background_color: "#fff",
                display: "standalone",
                scope: "/",
                start_url: "/bands/",
                description: "Study vocab, for free",
                icons: [
                    { src: "icons/icon-192.png", type: "image/png", sizes: "192x192" },
                    { src: "icons/icon-512.png", type: "image/png", sizes: "512x512" },
                    { src: "icons/icon-192-maskable.png", type: "image/png", sizes: "192x192", purpose: "maskable" },
                    { src: "icons/icon-512-maskable.png", type: "image/png", sizes: "512x512", purpose: "maskable" }
                ],
                shortcuts: [
                    {
                        name: "Create Set",
                        short_name: "Set",
                        description: "Create a set",
                        url: "/set/new/edit/",
                        icons: [
                            { src: "icons/shortcut-add-96.png", type: "image/png", sizes: "96x96" },
                            { src: "icons/shortcut-add-96-maskable.png", type: "image/png", sizes: "96x96" }
                        ]
                    }
                ]
            },
            filename: "sw.js"
        })*/
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    define: {
        'import.meta.env.YEAR': new Date().getFullYear()
    }
})