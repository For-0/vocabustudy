import { initializeAuth } from "./firebase-rest-api/auth";

initializeAuth();
let frame: number;
document.addEventListener("scroll", () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => document.body.classList.toggle("hero-small",document.documentElement.scrollTop > 52))
});