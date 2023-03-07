import initialize from "./general";
import { createElement } from "./utils";
import { toast } from "bulma-toast";
import { getCurrentUser, updateProfile, signInWithGoogleCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, showGooglePopup, sendPasswordResetEmail, renderGoogleButton } from "./firebase-rest-api/auth";

const { newAuth: auth } = initialize(() => initLogin());

let onetapLoaded = false;

const fields = {
    page: document.getElementById("home"),
    form: document.querySelector("#home form"),
    btnsSwitchMode: document.querySelectorAll("#home .btn-switch-mode, #home .prompt-switch-mode a"),
    btnForgotPassword: document.querySelector("#home .btn-forgot-password"),
    inputEmail: document.querySelector("#login-email"),
    inputDisplayName: document.querySelector("#login-display-name"),
    inputPassword: document.querySelector("#login-password"),
    inputConfirmPassword: document.querySelector("#login-confirm-password"),
    checkTos: document.querySelector("#login-accept-tos"),
    btnSubmit: document.querySelector("#home button[type=submit]"),
}

async function initLogin(switchMode = true) {
    fields.btnSubmit.disabled = false;
    if (switchMode) fields.page.dataset.mode = "login";
    fields.btnSubmit.classList.remove("is-loading");
    fields.form.reset();
    fields.form.classList.remove("has-validated-inputs");
    if (await getCurrentUser()) 
        return location.href = "/account/";
    if (!onetapLoaded) {
        if (process.env.NODE_ENV !== "development") {
            if ("google" in window) setupGoogleButton();
            else window.onGoogleLibraryLoad = () => setupGoogleButton();
        } else {
            let btn = document.getElementById("google-onetap-container").appendChild(createElement("button", ["button", "is-light", "is-medium", "is-fullwidth"], {type: "button", innerText: "wow what an amazing button"}));
            btn.addEventListener("click", async () => {
                try {
                    await showGooglePopup(auth);
                    restoreState();
                } catch (err) {
                    switch(err.code) {
                        case "auth/popup-blocked":
                            toast({message: "The popup was blocked", type: "is-info", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "auth/popup-closed-by-user":
                            toast({message: "Operation Cancelled", type: "is-info", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "auth/too-many-requests":
                            toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "auth/user-disabled":
                            toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "auth/account-exists-with-different-credential":
                            toast({message: "Use email/password login for that account", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                    }
                } finally {
                    initLogin();
                }
            });
            onetapLoaded = true;
        }
    }
}
function setupGoogleButton() {
    renderGoogleButton(document.getElementById("google-onetap-container"), async response => {
        try {
            await signInWithGoogleCredential(auth, response.credential);
            restoreState();
        } catch (err) {
            switch(err.code) {
                case "auth/too-many-requests":
                    toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                    break;
                case "auth/user-disabled":
                    toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "auth/unauthorized-continue-uri":
                    toast({message: "Invalid domain", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                    break;
                case "auth/account-exists-with-different-credential":
                    toast({message: "Use email/password login for that account", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                    break;
            }
        } finally {
            initLogin();
        }
    });
    onetapLoaded = true;
}
function restoreState() {
    let afterLogin = localStorage.getItem("redirect_after_login");
    localStorage.removeItem("redirect_after_login");
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
                        await createUserWithEmailAndPassword(auth, fields.inputEmail.value, fields.inputPassword.value);
                        await updateProfile(auth, { displayName: fields.inputDisplayName.value });
                        restoreState();
                    } catch(err) {
                        if (err.name !== "FirebaseError") throw err;
                        switch(err.code) {
                            case "auth/email-already-in-use":
                                toast({message: "An account with that email address already exists", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "auth/too-many-requests":
                                toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                                break;
                            case "auth/weak-password":
                                toast({message: "That password is too weak", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                                break;
                        }
                    } finally {
                        initLogin(false);
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
                    if (err.name !== "FirebaseError") throw err;
                    switch(err.code) {
                        case "auth/user-not-found":
                            toast({message: "There is no user with that email address", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "auth/too-many-requests":
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
                    if (err.name !== "FirebaseError") throw err;
                    switch(err.code) {
                        case "auth/user-not-found":
                            toast({message: "There is no user with that email address", type: "is-danger", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "auth/wrong-password":
                            toast({message: "Incorrect password", type: "is-danger", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "auth/too-many-requests":
                            toast({message: "Too many attempts! Please try again later", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                        case "auth/user-disabled":
                            toast({message: "Your account has been disabled", type: "is-warning", dismissible: true, position: "bottom-center", duration: 5000});
                            break;
                        case "auth/account-exists-with-different-credential":
                            toast({message: "Use Sign In with Google for that account", type: "is-warning", dismissible: true, position: "bottom-center", duration: 7000});
                            break;
                    }
                } finally {
                    initLogin();
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