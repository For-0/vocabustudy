import type { TermDefinitionSet, UserProfile, ViewerExtraSetProperties, ViewerPartialSet } from "../types";

interface RichTextItem { marks?: { type: string }[], type: string, text: string }
interface RichText { type: string, content: { type: string, content: RichTextItem[] }[] }
interface Media { type: number; richText?: RichText; plainText?: string; url?: string }
interface CardSide { media: Media[], label: "word" | "definition" }

/** Convert Quizlet's rich text format into markdown + Vocabustudy classes */
function parseRichTextItem({ marks, text, type }: RichTextItem) {
    if (type !== "text") return "";
    if (!marks) return text;
    marks.forEach(({ type }) => {
        switch (type) {
            case "b": // bold
                text = `**${text}**`;
                break;
            case "u": // underline
                text = `<span class="is-underlined">${text}</span>`;
                break;
            case "i": // italic
                text = `*${text}*`;
                break;
            case "bgY": // yellow bg
                text = `<span class="bg-yellow-100 text-yellow-950">${text}</span>`;
                break;
            case "bgB": // blue bg
                text = `<span class="bg-blue-100 text-blue-950">${text}</span>`;
                break;
            case "bgP": // purple bg
                text = `<span class="bg-purple-100 text-purple-950">${text}</span>`;
                break;
        }
    });
    return text;
}

/** Iterate over a rich text document, and call parseRichTextItem on each item inside each paragraph */
function parseRichText({ type, content }: RichText) {
    if (type !== "doc") return "";
    return content.map(({ type, content }) => {
        if (type !== "paragraph") return "";
        else return content.map(parseRichTextItem).join("");
    }).join("\n");
}

/** parse the media of a single card side */
function parseMedia(media: Media[]) {
    return media.map(({ type, richText, plainText, url }) => {
        if (type === 2) return `![image](${url})`;
        else if (richText) return parseRichText(richText);
        else if (plainText) return plainText;
        return null;
    }).filter(Boolean).join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getReduxState(nextData: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return JSON.parse(nextData.props.pageProps.dehydratedReduxStateKey);
}

/** Find the __NEXT_DATA__ script JSON element and parse it */
function getNextData(htmlString: string) {
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    const script = doc.querySelector<HTMLScriptElement>("script#__NEXT_DATA__");
    if (!script) return null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(script.innerText);
  }

export function parseQuizletSource(quizletSource: string): { set: Omit<ViewerPartialSet, "accents">, creator: UserProfile } | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const nextData = getNextData(quizletSource);
    if (!nextData) return null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const reduxState = getReduxState(nextData);
    if (!reduxState) return null;
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const { title: name, description, timestamp, lastModified } = reduxState.setPage.set as {
        title: string; description: string; numTerms: number;
        timestamp: number; lastModified: number;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const { username, id: uid, _imageUrl: photoUrl } = reduxState.setPage.creator as {
        username: string; id: number; _imageUrl?: string;
    };
    // timestamp and lastModified are in seconds
    const creationTime = new Date(timestamp * 1000);
    const updateTime = new Date(lastModified * 1000);
    const pathParts = ["quizlet", "source"];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const terms = (reduxState.studyModesCommon.studiableData.studiableItems as { cardSides: CardSide[] }[]).map(({ cardSides }) => {
        const { media: wordMedia } = cardSides.find(({ label }) => label === "word")!;
        const { media: definitionMedia } = cardSides.find(({ label }) => label === "definition")!;
        return {
            term: parseMedia(wordMedia),
            definition: parseMedia(definitionMedia)
        }

    });
    const quizletSet: TermDefinitionSet & Omit<ViewerExtraSetProperties, "accents"> = {
        collections: [],
        comments: {} as Record<string, string>,
        creationTime,
        description,
        likes: [] as string[],
        name,
        pathParts,
        terms,
        uid: uid.toString(),
        updateTime,
        visibility: 2
    };
    return {
        set: quizletSet,
        creator: {
            photoUrl: photoUrl?.includes("http") ? photoUrl : "",
            roles: [],
            displayName: username
        }
    };
}
