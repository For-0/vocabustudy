const fields = {
    password: document.getElementById("reset-new-password"),
    confirmPassword: document.getElementById("reset-confirm-password"),
    form: document.querySelector("#home form"),
    email: document.querySelector("#home .field-email")
};

const API_KEY = "AIzaSyDU-lvyggKhMHuEllAEpXZ3y_TyPOGfXBM"; // calm down this is a public key
let URL_PREFIX = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${API_KEY}`;
if (location.hostname === "localhost") URL_PREFIX = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${API_KEY}`;
let oobCode = new URL(location.href).searchParams.get("oobCode");
if (!oobCode) location.href = "/";
fields.form.addEventListener("submit", async e => {
    e.preventDefault();
    fields.password.setCustomValidity("");
    if (!fields.form.reportValidity()) return;
    fields.form.classList.add("has-validated-inputs");
    if (fields.password.value === fields.confirmPassword.value) {
        let res = await fetch(URL_PREFIX, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({oobCode, newPassword: fields.password.value})});
        let resJson = await res.json();
        if (resJson.error) {
            document.querySelector(".notification").hidden = false;
            document.querySelector(".loader").hidden = true;
        } else {
            location.href = "/#login"; // TODO show success message
        }
        // change password;
    } else {
        fields.password.setCustomValidity("Passwords do not match");
        fields.password.reportValidity();
    }
});

addEventListener("load", async () => {
    let res = await fetch(URL_PREFIX, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({oobCode})});
    let resJson = await res.json();
    if (resJson.error) {
        document.querySelector(".notification").hidden = false;
        document.querySelector(".field-raw-code").innerText = resJson.error.message; // TODO more specific messages
        document.querySelector(".loader").hidden = true; // TODO move to `fields`   
    } else {
        fields.email.innerText = resJson.email
        document.querySelector(".loader").hidden = true;
        fields.form.hidden = false;
    }
    // TODO (VERY IMPORTANT) add support for email verification
});