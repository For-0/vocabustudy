import { fileURLToPath, URL } from 'node:url'
import { serviceWorkerPlugin } from "./service-worker-plugin";
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function getEmulatorUrl(mode: string, port: number) {
    if (process.env.CODESPACES) return `https://${process.env.CODESPACE_NAME!}-${port.toString()}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN!}:443`
    else if (process.env.GITPOD_WORKSPACE_URL) return `https://${port.toString()}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}:443`;
    else if (mode !== "production") return `http://localhost:${port.toString()}`;
    else return null;
}

async function getSiteAnalytics(env: Record<string, string>) {
    const fromDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.CF_API_TOKEN}`
        },
        body: JSON.stringify({
            query: "query SiteAnalytics($from:Date,$zoneTag:string){viewer{zones(filter:{zoneTag:$zoneTag}){httpRequests1dGroups(filter:{date_gt:$from},limit:1){sum{countryMap{clientCountryName}pageViews}uniq{uniques}}}}}",
            variables: {
                from: `${fromDate.getFullYear().toString().padStart(4, "0")}-${(fromDate.getMonth() + 1).toString().padStart(2, "0")}-${fromDate.getDate().toString().padStart(2, "0")}`,
                zoneTag: env.CF_ZONE_ID
            }
        })
    });
    const responseJson = await response.json() as {
        data: { viewer: { zones: { httpRequests1dGroups: { sum: { countryMap: { __typename: string }[], pageViews: number }, uniq: { uniques: number } }[] }[] } },
        errors?: { message: string }[]
    };
    if ("errors" in responseJson && responseJson.errors) throw new Error(responseJson.errors[0].message);
    const data = responseJson.data.viewer.zones[0].httpRequests1dGroups[0];
    const pageViews = data.sum.pageViews;
    const uniqueVisitors = data.uniq.uniques;
    const numCountries = data.sum.countryMap.length;

    return { pageViews, uniqueVisitors, numCountries };
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        build: {
            // https://github.com/vitejs/vite/issues/5189
            modulePreload: {
                resolveDependencies: (_url, _deps, _context) => {
                    return [];
                }
            },
            rollupOptions: {
                output: {
                    sourcemapExcludeSources: true,
                    manualChunks: (id: string) => {
                        const url = new URL(id, import.meta.url);
                        const chunkName = url.searchParams.get("chunkName");
                        if (chunkName) return chunkName;
                        // Force these files to be in the index chunk
                        if (
                            id.includes("Loader.vue") ||
                            id.includes("default-pfp.svg") ||
                            id.endsWith("index.html") ||
                            id.endsWith("src/store.ts") ||
                            id.includes("src/firebase-rest-api") ||
                            id.endsWith("src/utils.ts") ||
                            id.includes("vite:asset") ||
                            id.includes("SetCard.vue") ||
                            id.includes("SetPagination.vue") ||
                            id.includes("Flashcard.vue")) {
                            return "index";
                        } else if (id.includes("node_modules")) {
                            return "vendor";
                        }
                    }
                }
            }
        },
        plugins: [
            vue(),
            serviceWorkerPlugin
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        define: {
            YEAR: new Date().getFullYear(),
            VERSION: JSON.stringify(process.env.npm_package_version),
            AUTH_EMULATOR_URL: JSON.stringify(getEmulatorUrl(mode, 9099)),
            FIRESTORE_EMULATOR_URL: JSON.stringify(getEmulatorUrl(mode, 8080)),
            WORKERS_ENDPOINT: JSON.stringify(process.env.NODE_ENV === "production" ? "https://api.vocabustudy.org/" : "http://localhost:8787/"),
            DD_URL: JSON.stringify(env.USE_LOCAL_DD ? "http://localhost:8091/" : "https://dd.vocabustudy.org/"),
            SITE_ANALYTICS: JSON.stringify(mode === "production" && env.CF_API_TOKEN ? await getSiteAnalytics(env) : { pageViews: 0, uniqueVisitors: 0, numCountries: 0 }),
        }
    };
});
