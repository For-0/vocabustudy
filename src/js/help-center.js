import initialize from "./general";
initialize();
const coll = document.getElementsByClassName("collapsible");
for (let el of coll) {
    el.addEventListener("click", () => {
        el.classList.toggle("active");
    })
}