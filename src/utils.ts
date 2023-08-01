import { openDB } from "idb";
import { c as collectionData } from "./collections.json" assert { type: "json" };

export async function getLocalDb() {
    return await openDB("vocabustudy-database", 2, {
        upgrade(db, oldVersion) {
            if (oldVersion === 0)
                db.createObjectStore("autosave-backups", { keyPath: "setId" });
            db.createObjectStore("general");
        }
    });
}

export function parseCollections(collections: string[]) {
    const parsedCollections = collections.map(el => el.split(":").map(el => parseInt(el)));
    const collectionNames = parsedCollections.map(el => {
        let resolvedName = "Unknown Collection";
        try {
            if (isNaN(el[0])) {
                if (el[1] == 0) resolvedName = "Study Guide : Timeline";
                else if (el[1] == 1) resolvedName = "Study Guide : Notes";
            }
            const collectionName = collectionData[el[0]];
            if (typeof collectionName === "string") resolvedName = collectionName;
            else {
                if (el.length === 1) resolvedName = collectionName.n;
                else if (el.length === 2) resolvedName = `${collectionName.n} : ${collectionName.s[el[1]]}`;
                else if (collectionName.o) resolvedName = `${collectionName.n} : ${collectionName.s[el[1]]} : ${collectionName.o[el[2]]}`;
            }
        } catch { /* empty */ }

        return { name: resolvedName, id: el.join(":") };
    });
    return collectionNames;
}

export function pluralizeWord(word: string, number: number) {
    return `${number} ${word}${number === 1 ? "" : "s"}`;
}

export function humanizeDate(date: Date) {
    // If it's today or yesterday, return "today" or "yesterday"
    // If it's within a week, return the number of days ago
    // Within a month -> return number of weeks ago
    // Within a year -> return number of months ago
    // Otherwise, return number of years ago
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = diff / (1000 * 3600 * 24);
    if (diffDays < 1) return "today";
    if (diffDays < 2) return "yesterday";
    if (diffDays < 7) return `${pluralizeWord("day", Math.floor(diffDays))} ago`;
    if (diffDays < 30) return `${pluralizeWord("week", Math.floor(diffDays / 7))} ago`;
    if (diffDays < 365) return `${pluralizeWord("month", Math.floor(diffDays / 30))} ago`;
    return `${pluralizeWord("year", Math.floor(diffDays / 365))} ago`;
}