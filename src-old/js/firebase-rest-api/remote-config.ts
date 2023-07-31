import type { IDBPDatabase } from "idb";
import { getLocalDb } from "../utils";
import { installationsSdkVersion, projectId, appId, apiKey, installationsAuthVersion } from "./project-config.json";

const installationsEndpoint = `https://firebaseinstallations.googleapis.com/v1/projects/${projectId}/installations`;
const rcEndpoint = `https://firebaseremoteconfig.googleapis.com/v1/projects/${projectId}/namespaces/firebase:fetch?key=${apiKey}`;

async function registerNewInstallationInfo(db: IDBPDatabase) {
    const fid = generateFid();
    const generateReq = await fetch(installationsEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        },
        body: JSON.stringify({ fid, sdkVersion: installationsSdkVersion, appId, authVersion: installationsAuthVersion })
    });
    const { refreshToken, authToken: { token, expiresIn } } = await generateReq.json();
    const newExpirationTime = parseInt(expiresIn) * 1000 + Date.now();
    const newFidInfo = { fid, refreshToken, authToken: token, expirationTime: newExpirationTime };
    await db.put("general", newFidInfo, "fid");
    return { fid, authToken: token };
}

/** Get the FID and auth token for remote config. Generate it or refresh it if required */
async function getInstallationInfo(): Promise<{fid: string, authToken: string}> {
    const db = await getLocalDb();
    const existingFidInfo = await db.get("general", "fid");
    if (existingFidInfo) {
        if (existingFidInfo.expirationTime > Date.now())
            return { fid: existingFidInfo.fid, authToken: existingFidInfo.authToken };
        else {
            try {
                const refreshReq = await fetch(`${installationsEndpoint}/${existingFidInfo.fid}/authTokens:generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey,
                        Authorization: `${installationsAuthVersion} ${existingFidInfo.refreshToken}`
                    },
                    body: JSON.stringify({ installation: { sdkVersion: installationsSdkVersion, appId } })
                });
                if (!refreshReq.ok) throw new Error("Refresh token request failed");
                const { expiresIn, token } = await refreshReq.json();
                if (!token) throw new Error("No token in response");
                const newExpirationTime = parseInt(expiresIn) * 1000 + Date.now();
                existingFidInfo.authToken = token;
                existingFidInfo.expirationTime = newExpirationTime;
                await db.put("general", existingFidInfo, "fid");
                return { fid: existingFidInfo.fid, authToken: token };
            } catch {
                return registerNewInstallationInfo(db);
            }
        }
    } else return registerNewInstallationInfo(db);
}

function generateFid() {
    // An Firebabase Installation ID is a 22 base64 character string. (16.5 bytes rounded up to 17)
    const byteArr = new Uint8Array(17);
    crypto.getRandomValues(byteArr);
    // Replace the first four bits with 0111 for the constant FID header
    byteArr[0] = 0b01110000 + (byteArr[0] % 0b00010000);
    return encode(byteArr);
}

/** Convert a FID Uint8Array into a base64 string */
function encode(arr: Uint8Array) {
    const b64 = window.btoa(String.fromCharCode(...arr));
    const urlSafe = b64.replace(/\+/g, "-").replace(/\//g, "_");
    // Removes the 23rd character because FIDs are 22 characters long
    return urlSafe.substring(0, 22);
}

function getLanguage() {
    return (navigator.languages && navigator.languages[0]) || navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || "en-US";
}

/** Fetches the remote config. Makes an installation if needed. */
export async function getRemoteConfig() {
    try {
        const db = await getLocalDb();
        const existingRemoteConfig: { expirationTime: number, config: object } = await db.get("general", "remote-config");
        if (existingRemoteConfig && existingRemoteConfig.expirationTime > Date.now()) return existingRemoteConfig.config;
        const { fid, authToken } = await getInstallationInfo();
        const req = await fetch(rcEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                app_instance_id: fid,
                app_id: appId,
                app_instance_id_token: authToken,
                language_code: getLanguage(),
                sdk_version: "9.14.0"
            })
        });
        const { entries }: { entries: object } = await req.json();
        if (!entries) return {};
        await db.put("general", { config: entries, expirationTime: Date.now() + 86400000 }, "remote-config");  // 24 hours
        return entries;
    } catch (e) {
        return {};
    }
}