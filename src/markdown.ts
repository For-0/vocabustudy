import { marked, type RendererExtension, type TokenizerExtension } from "marked";
import katex from "katex";
import DOMPurify, { type Config, type SanitizeAttributeHookEvent } from "dompurify";

const allowedClassesRE = /^(dark:)?(text-[a-z]+-\d+|bg-[a-z]+-\d+|font-(?:normal|medium|semibold|bold)|text-(?:sm|base|lg|xl|2xl)|rounded-(sm|md|lg)|p\w?-\d+|m\w?-\d+)$/i;
const disallowedClasses: string[] = [];
const purifyOptions: Config = { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"], ADD_TAGS: ["annotation", "semantics"] };

const mainPurify = DOMPurify();
const extractImagesPurify = DOMPurify();

function walkLatex(src: string, delim: [string, string]): { raw: string, contents: string } | undefined {
    // start iterating through the string
    let braceLevel = 0;
    for (let i = delim[0].length; i < src.length; i++) {
        // Found closing delimiter
        if (src.slice(i, i + delim[1].length) === delim[1] && braceLevel <= 0) {
            const latex = src.slice(delim[0].length, i);
            return { contents: latex, raw: src.slice(0, i + delim[1].length) };
        }
        switch (src[i]) {
            // Skip over escaped characters
            case "\\": {
                i++;
                break;
            }
            case "{": {
                braceLevel++;
                break;
            }
            case "}": {
                braceLevel--;
                break;
            }
        }
    }
}

function makeLatexExtension(name: string, delims: [string, string][], displayMode: boolean): TokenizerExtension & RendererExtension {
    return {
        name,
        level: displayMode ? "block" : "inline",
        start(src) {
            for (const delim of delims) {
                // Check if the delim is in the string and is part of a full latex expression
                const i = src.indexOf(delim[0]);
                if (i !== -1 && walkLatex(src.substring(i), delim)) return i;
            }
            return -1;
        },
        tokenizer(src, _tokens) {
            // Find the delim at the start
            const delim = delims.find(delim => src.startsWith(delim[0]));
            if (delim) {
                // Parse the latex our
                const latex = walkLatex(src, delim);
                if (latex)
                    return {
                        type: name,
                        ...latex,
                        tokens: []
                    }
            }
        },
        renderer(token) {
            try {
                return katex.renderToString(token.contents as string, { displayMode, output: "mathml" });
            } catch (e) {
                console.log(JSON.stringify(e))
                return `<div class="p-4 text-sm text-rose-800 rounded-lg bg-rose-50 dark:bg-zinc-800 dark:text-rose-400" role="alert">
                    <span class="font-medium">KaTeX Error:</span> ${(e as { rawMessage: string}).rawMessage}
                </div>`;
            }
        }
    }
}

marked.use({
    extensions: [
        makeLatexExtension("latex-block", [["$$", "$$"], ["\\[", "\\]"]], true),
        makeLatexExtension("latex-inline", [["$", "$"], ["\\(", "\\)"]], false)
    ]
})

const nodeIsImage = (node: Element): node is HTMLImageElement => node.nodeName === "IMG";

const purifyClassesAndIds = (node: Element, data: SanitizeAttributeHookEvent) => {
    if (data.attrName === "class") {
        const classList = data.attrValue.split(" ");
        const sanitzedClassList = classList.filter(
            className => !disallowedClasses.includes(className) && className.match(allowedClassesRE)
        );
        data.attrValue = sanitzedClassList.join(" ");
    } else if (data.attrName === "id") {
        // If there are any existing nodes with that ID that are not the current actual node
        if ([...document.querySelectorAll(`#${data.attrValue}`)].some(el => el !== node))
            node.removeAttribute("id"); // then remove the ID
    }
};

// Only allow certain classes
mainPurify.addHook("uponSanitizeAttribute", purifyClassesAndIds);
extractImagesPurify.addHook("uponSanitizeAttribute", purifyClassesAndIds);

let extractedImages: string[] = [];

extractImagesPurify.addHook("uponSanitizeElement", (node) => {
    if (nodeIsImage(node)) {
        extractedImages.push(node.src);
        node.remove();
    }
});

const parseMarkdown = (text: string, inline: boolean) => (inline ? marked.parseInline(text) : marked.parse(text)) as string;

/**
 * Apply markdown styling 
 * @returns The styled text, which can safely be applied to inner HTML
 */
export function styleAndSanitize(text: string, inline=false) {
    const markdown = parseMarkdown(text, inline);
    return mainPurify.sanitize(markdown, purifyOptions);
}

/**
 * Apply markdown styling but extract the images
 * @returns The styled text, which can safely be applied to inner HTML
 */
export function styleAndSanitizeImages(text: string, inline=false) {
    const markdown = parseMarkdown(text, inline);
    extractedImages = [];
    const parsed = extractImagesPurify.sanitize(markdown, purifyOptions);
    return { parsed, images: extractedImages};
}