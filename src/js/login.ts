import { createElement } from "./utils";
import { toast } from "bulma-toast";
import { getCurrentUser, signInWithGoogleCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, showGooglePopup, sendPasswordResetEmail, renderGoogleButton, initializeAuth } from "./firebase-rest-api/auth";

declare global {
    interface Window {
        onGoogleLibraryLoad: () => void;
    }
}

const auth = initializeAuth(() => initLogin());

let onetapLoaded = false;

const fields = {
    page: document.getElementById("home")!,
    form: document.querySelector<HTMLFormElement>("#home form")!,
    btnsSwitchMode: document.querySelectorAll("#home .btn-switch-mode, #home .prompt-switch-mode a")!,
    btnForgotPassword: document.querySelector("#home .btn-forgot-password")!,
    inputEmail: document.querySelector<HTMLInputElement>("#login-email")!,
    inputDisplayName: document.querySelector<HTMLInputElement>("#login-display-name")!,
    inputPassword: document.querySelector<HTMLInputElement>("#login-password")!,
    inputConfirmPassword: document.querySelector<HTMLInputElement>("#login-confirm-password")!,
    checkTos: document.querySelector<HTMLInputElement>("#login-accept-tos")!,
    btnSubmit: document.querySelector<HTMLButtonElement>("#home button[type=submit]")!,
}

function resetFormState() {
    fields.btnSubmit.disabled = false;
    fields.btnSubmit.classList.remove("is-loading");
    fields.form.classList.remove("has-validated-inputs");
}

async function initLogin(switchMode = true) {
    resetFormState();
    fields.form.reset();
    if (switchMode) fields.page.dataset.mode = "login";
    if (await getCurrentUser()) 
        return restoreState();
    if (!onetapLoaded) {
        if (process.env.NODE_ENV !== "development") {
            if ("google" in window) setupGoogleButton();
            else window.onGoogleLibraryLoad = () => setupGoogleButton();
        } else {
            const btn = document.getElementById("google-onetap-container")!.appendChild(createElement("button", ["button", "is-light", "is-medium", "is-fullwidth"], {type: "button", innerText: "wow what an amazing button"}));
            btn.addEventListener("click", async () => {
                try {
                    await showGooglePopup(auth);
                    restoreState();
                } catch (err) {
                    switch((err as Error)?.message) {
                        case "popup-closed":
                            toast({message: "Operation Cancelled", type: "is-info", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "TOO_MANY_ATTEMPTS_TRY_LATER":
                            toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "USER_DISABLED":
                            toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                    }
                } finally {
                    resetFormState();
                }
            });
            onetapLoaded = true;
        }
    }
}
function setupGoogleButton() {
    renderGoogleButton(document.getElementById("google-onetap-container"), async (response: { credential: string }) => {
        try {
            await signInWithGoogleCredential(auth, response.credential);
            restoreState();
        } catch (err) {
            switch((err as Error)?.message) {
                case "TOO_MANY_ATTEMPTS_TRY_LATER":
                    toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                    break;
                case "USER_DISABLED":
                    toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "UNAUTHORIZED_DOMAIN":
                    toast({message: "Invalid domain", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
            }
        } finally {
            resetFormState();
        }
    });
    onetapLoaded = true;
}
function restoreState() {
    const afterLogin = new URLSearchParams(location.search).get("next");
    location.href = afterLogin || "/account/";
}
fields.form.addEventListener("submit", async e => {
    e.preventDefault();
    fields.form.classList.add("has-validated-inputs");
    switch (fields.page.dataset.mode) {
        case "sign-up":
            fields.inputPassword.setCustomValidity("");
            if (fields.inputEmail.reportValidity() && fields.inputPassword.reportValidity() && fields.inputConfirmPassword.reportValidity() && fields.inputDisplayName.reportValidity() && fields.checkTos.reportValidity()) {
                if (fields.inputPassword.value === fields.inputConfirmPassword.value) {
                    try {
                        await createUserWithEmailAndPassword(auth, fields.inputEmail.value, fields.inputPassword.value, fields.inputDisplayName.value);
                        restoreState();
                    } catch(err) {
                        switch((err as Error)?.message.split(" ")[0]) {
                            case "EMAIL_EXISTS":
                                toast({message: "An account with that email address already exists", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "TOO_MANY_ATTEMPTS_TRY_LATER":
                                toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "WEAK_PASSWORD":
                                toast({message: "Your password must be at least 6 characters", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                                break;
                        }
                    } finally {
                        resetFormState();
                    }
                } else {
                    fields.inputPassword.setCustomValidity("Passwords do not match");
                    fields.inputPassword.reportValidity();
                }
            }
            break;
        case "forgot-password":
            if (fields.inputEmail.reportValidity()) {
                fields.btnSubmit.disabled = true;
                fields.btnSubmit.classList.add("is-loading");
                try {
                    await sendPasswordResetEmail(auth, fields.inputEmail.value);
                    toast({message: "Email sent!", type: "is-success", dismissible: true, position: "bottom-center", duration: 5000});
                } catch(err) {
                    switch((err as Error)?.message) {
                        case "EMAIL_NOT_FOUND":
                            toast({message: "There is no user with that email address", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "TOO_MANY_ATTEMPTS_TRY_LATER":
                        case "RESET_PASSWORD_EXCEED_LIMIT":
                            toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                    }
                } finally {
                    initLogin(false);
                }
            }
            break;
        default:
            if (fields.inputEmail.reportValidity() && fields.inputPassword.reportValidity()) {
                try {
                    fields.btnSubmit.disabled = true;
                    fields.btnSubmit.classList.add("is-loading");
                    await signInWithEmailAndPassword(auth, fields.inputEmail.value, fields.inputPassword.value);
                    restoreState();
                } catch(err) {
                    switch((err as Error)?.message) {
                        case "EMAIL_NOT_FOUND":
                            toast({message: "There is no user with that email address", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "INVALID_PASSWORD":
                            toast({message: "Incorrect password", type: "is-danger", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "TOO_MANY_ATTEMPTS_TRY_LATER":
                            toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "USER_DISABLED":
                            toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                    }
                } finally {
                    resetFormState();
                }
            }
            break;
    }
});
fields.btnsSwitchMode.forEach(el => el.addEventListener("click", () => {
    if (fields.page.dataset.mode === "sign-up" || fields.page.dataset.mode === "forgot-password") fields.page.dataset.mode = "login";
    else fields.page.dataset.mode = "sign-up";
}));
fields.btnForgotPassword.addEventListener("click", () => fields.page.dataset.mode = "forgot-password");
initLogin();