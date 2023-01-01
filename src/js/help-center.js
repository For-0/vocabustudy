import initialize from "./general";
initialize();
let frame;
document.addEventListener("scroll", () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => document.body.classList.toggle("hero-small",document.documentElement.scrollTop > 52))
});