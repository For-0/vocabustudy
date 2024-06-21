import type { UserProfile, ViewerPartialSet } from "../types";

export async function importGenericSet(importUrl: string): Promise<{ set: Omit<ViewerPartialSet, "accents">, creator: UserProfile } | { error: "not-found" | "server-error" }> {
    try { 
        const res = await fetch(`${WORKERS_ENDPOINT}import-remote-set/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // there's a CF WAF rule that requires some form of authorization header to weed out the spam requests to the worker
                Authorization: "not-required"
            },
            body: JSON.stringify({ url: importUrl })
        });
        if (res.status === 404) return { error: "not-found" };
        else if (!res.ok) return { error: "server-error" };
        else {
            const { set, creator } = await res.json() as { set: Omit<ViewerPartialSet, "accents">, creator: UserProfile };

            return { set, creator };
        }
    } catch {
        return { error: "server-error" };
    }
}