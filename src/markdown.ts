import { marked } from "marked";
import DOMPurify, { type SanitizeAttributeHookEvent } from "dompurify";

const allowedClassesRE = /^(text-[a-z]+-\d+|bg-[a-z]+-\d+|font-(?:normal|medium|semibold|bold)|text-(?:sm|base|lg|xl|2xl))$/i;
const disallowedClasses: string[] = [];
const purifyOptions = { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] };

const mainPurify = DOMPurify();
const extractImagesPurify = DOMPurify();

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

const markedOptions: marked.MarkedOptions = { 
    headerIds: false,
    mangle: false
};

const parseMarkdown = (text: string, inline: boolean) => inline ? marked.parseInline(text, markedOptions) : marked.parse(text, markedOptions);

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