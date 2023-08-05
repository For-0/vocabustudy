import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
//import { VitePWA } from "vite-plugin-pwa";

function getAuthEmulatorUrl(mode: string) {
    if (process.env.CODESPACES) return `https://${process.env.CODESPACE_NAME}-9099.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/:443`
    else if (mode !== "production") return "http://localhost:9099";
    // else if (process.env.GITPOD_WORKSPACE_URL) return `https://${9099}-${process.env.GITPOD_WORKSPACE_URL.replace("https://", "")}/:443`;
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
                from: `${fromDate.getFullYear()}-${(fromDate.getMonth() + 1).toString().padStart(2, "0")}-${fromDate.getDate().toString().padStart(2, "0")}`,
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
            rollupOptions: {
                output: {
                    manualChunks: {
                        auth: [
                            "./src/views/AccountView.vue",
                            "./src/views/LoginView.vue",
                            "./src/views/MySetsView.vue",
                        ],
                        staticPages: [
                            "./src/views/CreditsView.vue",
                            "./src/views/NotFoundView.vue",
                            "./src/views/PrivacyPolicyView.vue",
                            "./src/views/SocialView.vue",
                            "./src/views/SupportUsView.vue",
                            "./src/views/TOSView.vue",
                        ]
                    },
                },
            },
        },
        plugins: [
            vue(),
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        define: {
            YEAR: new Date().getFullYear(),
            VERSION: JSON.stringify(process.env.npm_package_version),
            AUTH_EMULATOR_URL: JSON.stringify(getAuthEmulatorUrl(mode)),
            WORKERS_ENDPOINT: JSON.stringify(process.env.NODE_ENV === "production" ? "https://api.vocabustudy.org/" : "http://localhost:8787/"),
            DD_URL: JSON.stringify(env.USE_LOCAL_DD ? "http://localhost:8091/" : "https://dd.vocabustudy.org/"),
            SITE_ANALYTICS: JSON.stringify(mode === "production" ? await getSiteAnalytics(env) : { pageViews: 0, uniqueVisitors: 0, numCountries: 0 }),
        }
    };
});