import { marked } from "marked";
import DOMPurify from "dompurify";

const allowedClassesRE = /^(text-[a-z]+-\d+|bg-[a-z]+-\d+|font-(?:normal|medium|semibold|bold)|text-(?:sm|base|lg|xl|2xl))$/i;
const disallowedClasses: string[] = [];
// Only allow certain classes
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
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
});

const markedOptions: marked.MarkedOptions = { 
    headerIds: false,
    mangle: false
 };

/**
 * Apply markdown styling 
 * @returns The styled text, which can safely be applied to inner HTML
 */
export function styleAndSanitize(text: string, inline=false): string {
    const markdown = inline ? marked.parseInline(text, markedOptions) : marked.parse(text, markedOptions);
    return DOMPurify.sanitize(markdown, { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] })
}