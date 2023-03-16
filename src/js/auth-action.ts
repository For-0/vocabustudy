import { toast } from "bulma-toast";
import { createElement } from "./utils";

const fields = {
    password: document.querySelector<HTMLInputElement>("#reset-new-password"),
    confirmPassword: document.querySelector<HTMLInputElement>("#reset-confirm-password"),
    resetPwForm: document.querySelector<HTMLFormElement>("#home form"),
    email: document.querySelector<HTMLSpanElement>("#home .field-email"),
    mode: document.querySelectorAll<HTMLSpanElement>("#home .field-mode"),
    errorNotification: document.querySelector<HTMLDivElement>(".notification.is-danger"),
    successNotification: document.querySelector<HTMLDivElement>(".notification.is-success"),
    loader: document.querySelector<HTMLDivElement>(".loader")
};

let URL_PREFIX = `https://identitytoolkit.googleapis.com/v1/`;
if (location.hostname === "localhost") URL_PREFIX = `http://localhost:9099/identitytoolkit.googleapis.com/v1/`;
const locUrl = new URL(location.href);
const oobCode = locUrl.searchParams.get("oobCode");
const mode = locUrl.searchParams.get("mode");
const API_KEY = locUrl.searchParams.get("apiKey");
if (!oobCode || !API_KEY || !["resetPassword", "verifyEmail"].includes(mode)) location.href = "/";
fields.resetPwForm.addEventListener("submit", async e => {
    e.preventDefault();
    fields.password.setCustomValidity("");
    if (!fields.resetPwForm.reportValidity()) return;
    fields.resetPwForm.classList.add("has-validated-inputs");
    if (fields.password.value === fields.confirmPassword.value) {
        const res = await fetch(`${URL_PREFIX}accounts:resetPassword?key=${API_KEY}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({oobCode, newPassword: fields.password.value})});
        const resJson = await res.json();
        if (resJson.error) {
            fields.resetPwForm.reset();
            switch(resJson.error.message) {
                case "EXPIRED_OOB_CODE":
                    toast({message: "This password reset link has expired!", type: "is-danger", duration: 7000});
                    break;
                case "INVALID_OOB_CODE":
                    toast({message: "This password reset link has expired or was already used!", type: "is-danger", duration: 7000});
                    break;
                case "USER_DISABLED":
                    toast({message: "Your account has been disabled", type: "is-warning", duration: 5000});
                    break;
                case "WEAK_PASSWORD":
                    toast({message: "Your password is too weak", type: "is-warning", duration: 5000});
                    break;
                default:
                    console.error(resJson.error.message)
                    break;
            }
        } else {
            fields.resetPwForm.hidden = true;
            fields.successNotification.hidden = false;
            fields.successNotification.innerText = "Your password was successfully changed! You can now login with your new credentials.";
            fields.successNotification.appendChild(createElement("a", ["has-text-primary", "is-block"], {innerText: "Log In", href: "/login/"}));
        }
    } else {
        fields.password.setCustomValidity("Passwords do not match");
        fields.password.reportValidity();
    }
});

function notificationError(errorMessage: string) {
    fields.errorNotification.hidden = false;
    switch(errorMessage) {
        case "EXPIRED_OOB_CODE":
            fields.errorNotification.innerText = "This link has expired! Please request another one";
            break;
        case "USER_DISABLED":
            fields.errorNotification.innerText = "Your account has been disabled";
            break;
        case "INVALID_OOB_CODE":
        default:
            fields.errorNotification.innerText = "Invalid code! This link might have expired or have already been used";
            break;
    }
}

addEventListener("load", async () => {
    switch(mode) {
        case "verifyEmail": {
            fields.mode[0].innerText = document.title = "Verify Email";
            fields.mode[1].innerText = "Verify";
            const res = await fetch(`${URL_PREFIX}accounts:update?key=${API_KEY}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({oobCode})});
            const resJson = await res.json();
            fields.loader.hidden = true;
            if (resJson.error) notificationError(resJson.error.message);
            else {
                fields.email.innerText = resJson.email;
                fields.successNotification.hidden = false;
                fields.successNotification.innerText = "Your email was successfully verified!";
            }
            break;
        } case "resetPassword": {
            fields.mode[0].innerText = document.title = "Reset Password";
            fields.mode[1].innerText = "Reset password for ";
            const res = await fetch(`${URL_PREFIX}accounts:resetPassword?key=${API_KEY}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({oobCode})});
            const resJson = await res.json();
            fields.loader.hidden = true;
            if (resJson.error) notificationError(resJson.error.message);
            else {
                fields.resetPwForm.hidden = false;
                fields.email.innerText = resJson.email;
            }
            break;
        }
    }
});