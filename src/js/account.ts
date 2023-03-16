import { toast } from "bulma-toast";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
import Alert from "@vizuaalog/bulmajs/src/plugins/alert";
import { navigateLoginSaveState, bulmaModalPromise, initBulmaModals, createElement } from "./utils";
import { getCurrentUser, sendEmailVerification, deleteCurrentUser, updateProfile, signInWithEmailAndPassword, updatePassword, renderGoogleButton, signInWithGoogleCredential, showGooglePopup, initializeAuth } from "./firebase-rest-api/auth";
import type { User } from "./types";

const fields = {
    name: document.querySelector<HTMLSpanElement>(".field-name"),
    email: document.querySelector<HTMLSpanElement>(".field-email"),
    created: document.querySelector<HTMLSpanElement>(".field-created"),
    emailVerified: document.querySelector<HTMLSpanElement>(".field-email-verified"),
    emailNotVerified: document.querySelector<HTMLSpanElement>(".field-email-not-verified"),
    btnVerifyEmail: document.querySelector<HTMLButtonElement>(".btn-verify-email"),
    btnChangePassword: document.querySelector<HTMLButtonElement>(".btn-change-password"),
    btnChangeName: document.querySelector<HTMLButtonElement>(".btn-change-name"),
    btnDeleteAccount: document.querySelector<HTMLButtonElement>(".btn-delete-account")
};
const modals =  {
    changePassword: new Modal("#modal-change-password").modal(),
    changePasswordInputs: [...document.querySelectorAll<HTMLInputElement>("#modal-change-password input")],
    changeName: new Modal("#modal-change-name").modal(),
    changeNameInput: document.querySelector<HTMLInputElement>("#modal-change-name input"),
    reauthenticate: new Modal("#modal-reauthenticate").modal(),
    reauthenticateInputPassword: document.querySelector<HTMLInputElement>("#modal-reauthenticate input"),
    reauthenticateDivider: document.querySelector<HTMLDivElement>("#modal-reauthenticate .divider"),
    reauthenticateGoogle: document.querySelector<HTMLDivElement>("#modal-reauthenticate .reauthenticate-google"),
    reauthenticateConfirm: document.querySelector<HTMLButtonElement>("#modal-reauthenticate .button.is-success")
};

const auth = initializeAuth(async user => {
    if (user) {
        showAccountInfo(user);
        if (!user.emailVerified) verifyEmail();
    } else
        navigateLoginSaveState();
});

let currentReauthenticateReason = null, reauthOnetapInitialized = false;

async function reauthenticateUser() {
    const currentUser = await getCurrentUser();
    [modals.reauthenticateInputPassword.parentElement.parentElement, modals.reauthenticateDivider, modals.reauthenticateGoogle].forEach(el => el.hidden = true);
    modals.reauthenticateInputPassword.value = "";
    modals.reauthenticateInputPassword.setCustomValidity("");
    if (currentUser.providers.includes("password")) modals.reauthenticateInputPassword.parentElement.parentElement.hidden = false;
    if (currentUser.providers.includes("google.com")) {
        modals.reauthenticateGoogle.hidden = false;
        setupGoogleLogin();
    }
    modals.reauthenticateDivider.hidden = currentUser.providers.length <= 1;
    modals.reauthenticateConfirm.hidden = !currentUser.providers.includes("password");
    modals.reauthenticate.open();
}
async function changePassword() {
    modals.changePassword.open();
    modals.changePasswordInputs.forEach(el => el.value = "");
    modals.changePasswordInputs.forEach(el => el.setCustomValidity(""));
    const result = await bulmaModalPromise(modals.changePassword);
    if (result) await updatePassword(auth, modals.changePasswordInputs[0].value);
}
async function changeName() {
    modals.changeNameInput.value = "";
    const result = await bulmaModalPromise(modals.changeName);
    if (result) await updateProfile(auth, { displayName: modals.changeNameInput.value });
}
function handleReauthCompletion() {
    if (currentReauthenticateReason === "change_password") changePassword();
    else if (currentReauthenticateReason === "delete") deleteAccount();
    modals.reauthenticate.close();
    currentReauthenticateReason = null;
}
function deleteAccount() {
    new Alert().alert({
        type: "danger",
        title: "Delete Account",
        body: "Are you sure you would like to delete your account? Your sets will not be deleted.",
        confirm: {
            label: "OK",
            onClick: () => deleteCurrentUser(auth)
        },
        cancel: {
            label: "Cancel"
        }
    });
}
function setupGoogleLogin() {
    if (!reauthOnetapInitialized) {
        if (process.env.NODE_ENV !== "development")
            renderGoogleButton(modals.reauthenticateGoogle, async response => {
                await signInWithGoogleCredential(auth, response.credential);
                handleReauthCompletion();
            });
        else {
            const btn = modals.reauthenticateGoogle.appendChild(createElement("button", ["button", "is-light", "is-medium", "is-fullwidth"], {type: "button", innerText: "wow what an amazing button"}));
            btn.addEventListener("click", async () => {
                try {
                    await showGooglePopup(auth, true);
                    handleReauthCompletion();
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
                }
            });
        }
        reauthOnetapInitialized = true;
    }
}

/** Show account info */
function showAccountInfo({ displayName, email, emailVerified, created }: User) {
    fields.name.innerText = displayName;
    fields.email.innerText = email;
    fields.emailVerified.hidden = !emailVerified;
    fields.emailNotVerified.hidden = emailVerified;
    fields.btnVerifyEmail.hidden = emailVerified;
    if (created) fields.created.innerText = created.toLocaleString();
}
async function verifyEmail() {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        new Alert().alert({
            type: "warning",
            title: "Verify Email Address",
            body: "You will not be able to use your account if you do not verify your email address.\nPress the button below to verify your email address.\nMake sure to check any spam, junk, or promotions folders for the email.",
            confirm: {
                label: "Send Verification Email",
                onClick: () => 
                    sendEmailVerification(auth, currentUser).then(() => toast({message: "Verification email sent. Reload once you have verified your email.", type: "is-success", dismissible: true, position: "bottom-center", duration: 7000}))
            },
            cancel: {
                label: "Not Now"
            },
        });
    }
}
modals.reauthenticate.onclose = () => currentReauthenticateReason = null;
initBulmaModals([modals.changePassword, modals.changeName, modals.reauthenticate]);
modals.changeName.validateInput = () => modals.changeNameInput.reportValidity();
fields.btnVerifyEmail.addEventListener("click", () => getCurrentUser().then(user => user.emailVerified ? location.reload() : verifyEmail()));
fields.btnChangePassword.addEventListener("click", async () => {
    currentReauthenticateReason = "change_password";
    await reauthenticateUser();
});
fields.btnChangeName.addEventListener("click", async () => {
    await changeName();
    const currentUser = await getCurrentUser();
    showAccountInfo(currentUser);
});
fields.btnDeleteAccount.addEventListener("click", async () => {
    currentReauthenticateReason = "delete";
    await reauthenticateUser();
});
modals.reauthenticateConfirm.addEventListener("click", async () => {
    // check if password input is valid, and verify validity
    modals.reauthenticateInputPassword.setCustomValidity("");
    if (modals.reauthenticateInputPassword.reportValidity()) {
        try {
            await signInWithEmailAndPassword(auth, (await getCurrentUser()).email, modals.reauthenticateInputPassword.value);
            handleReauthCompletion();
        } catch {
            modals.reauthenticateInputPassword.setCustomValidity("Incorrect Password");
            modals.reauthenticateInputPassword.reportValidity();
        }
    }
});