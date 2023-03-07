import { toast } from "bulma-toast";
import Modal from "@vizuaalog/bulmajs/src/plugins/modal";
import Alert from "@vizuaalog/bulmajs/src/plugins/alert";
import { navigateLoginSaveState, bulmaModalPromise, initBulmaModals, createElement } from "./utils";
import initialize from "./general";
import { getCurrentUser, sendEmailVerification, deleteCurrentUser, updateProfile, signInWithEmailAndPassword, updatePassword, renderGoogleButton, signInWithGoogleCredential, showGooglePopup } from "./firebase-rest-api/auth";

const fields = {
    name: document.querySelector(".field-name"),
    email: document.querySelector(".field-email"),
    created: document.querySelector(".field-created"),
    emailVerified: document.querySelector(".field-email-verified"),
    emailNotVerified: document.querySelector(".field-email-not-verified"),
    btnVerifyEmail: document.querySelector(".btn-verify-email"),
    btnChangePassword: document.querySelector(".btn-change-password"),
    btnChangeName: document.querySelector(".btn-change-name"),
    btnDeleteAccount: document.querySelector(".btn-delete-account")
};
const modals =  {
    changePassword: new Modal("#modal-change-password").modal(),
    changePasswordInputs: (/** @type {HTMLInputElement[]} */ ([...document.querySelectorAll("#modal-change-password input")])),
    changeName: new Modal("#modal-change-name").modal(),
    changeNameInput: (/** @type {HTMLInputElement} */ (document.querySelector("#modal-change-name input"))),
    reauthenticate: new Modal("#modal-reauthenticate").modal(),
    reauthenticateInputPassword: (/** @type {HTMLInputElement} */ (document.querySelector("#modal-reauthenticate input"))),
    reauthenticateDivider: document.querySelector("#modal-reauthenticate .divider"),
    reauthenticateGoogle: document.querySelector("#modal-reauthenticate .btn-google"),
    reauthenticateConfirm: document.querySelector("#modal-reauthenticate .button.is-success")
};

const { newAuth: auth } = initialize(async user => {
    if (user) {
        showAccountInfo(user);
        if (!user.emailVerified) verifyEmail();
    } else
        navigateLoginSaveState();
});

let currentReauthenticateReason = null, reauthOnetapInitialized = false;

async function reauthenticateUser() {
    let currentUser = await getCurrentUser();
    [modals.reauthenticateInputPassword, modals.reauthenticateDivider, modals.reauthenticateGoogle].forEach(el => el.hidden = true);
    modals.reauthenticateInputPassword.value = "";
    modals.reauthenticateInputPassword.setCustomValidity("");
    if (currentUser.providers.includes("password")) modals.reauthenticateInputPassword.hidden = false;
    if (currentUser.providers.includes("google.com")) {
        modals.reauthenticateGoogle.hidden = false;
        setupGoogleLogin();
    }
    if (currentUser.providers.length > 1) modals.reauthenticateDivider.hidden = false;
    modals.reauthenticate.open();
}
async function changePassword() {
    modals.changePassword.open();
    modals.changePasswordInputs.forEach(el => el.value = "");
    modals.changePasswordInputs.forEach(el => el.setCustomValidity(""));
    let result = await bulmaModalPromise(modals.changePassword);
    if (result) await updatePassword(modals.changePasswordInputs[0].value);
}
async function changeName() {
    modals.changeNameInput.value = "";
    let result = await bulmaModalPromise(modals.changeName);
    if (result) await updateProfile(auth, { displayName: modals.changeNameInput.value });
}
async function handleReauthCompletion() {
    modals.reauthenticate.close();
    currentReauthenticateReason = null;
    if (currentReauthenticateReason === "change_password") await changePassword();
    else if (currentReauthenticateReason === "delete") deleteAccount();
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
            let btn = modals.reauthenticateGoogle.appendChild(createElement("button", ["button", "is-light", "is-medium", "is-fullwidth"], {type: "button", innerText: "wow what an amazing button"}));
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

/**
 * Show account info
 * @param {import("./firebase-rest-api/auth").User} param0
 */
function showAccountInfo({ displayName, email, emailVerified, created }) {
    fields.name.innerText = displayName;
    fields.email.innerText = email;
    fields.emailVerified.hidden = !emailVerified;
    fields.emailNotVerified.hidden = emailVerified;
    fields.btnVerifyEmail.hidden = emailVerified;
    if (created) fields.created.innerText = created.toLocaleString();
}
async function verifyEmail() {
    let currentUser = await getCurrentUser();
    if (currentUser) {
        new Alert().alert({
            type: "warning",
            title: "Verify Email Address",
            body: "You will not be able to use your account if you do not verify your email address.\nPress the button below to verify your email address.\nMake sure to check any spam, junk, or promotions folders for the email. If something went wrong, submit an Other form with this concern at vocabustudy.org/forms/#other.",
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
modals.changePassword.validateInput = async () => {
    modals.changePasswordInputs.forEach(el => el.setCustomValidity(""));
    if (modals.changePasswordInputs.every(el => el.reportValidity())) {
        let currentUser = await getCurrentUser();
        if (currentUser) {
            try {
                await signInWithEmailAndPassword(auth, currentUser.email, modals.changePasswordInputs[0].value);
                if (modals.changePasswordInputs[1].value === modals.changePasswordInputs[2].value) return true;
                else {
                    modals.changePasswordInputs[1].setCustomValidity("Passwords do not match");
                    modals.changePasswordInputs[1].reportValidity();
                    return false;
                }
            } catch {
                modals.changePasswordInputs[0].setCustomValidity("Incorrect Password");
                modals.changePasswordInputs[0].reportValidity();
                return false;
            }
        } else return false;
    }
};
modals.changeName.validateInput = () => modals.changeNameInput.reportValidity();
fields.btnVerifyEmail.addEventListener("click", () => getCurrentUser().then(user => user.emailVerified ? location.reload : verifyEmail()));
fields.btnChangePassword.addEventListener("click", async () => {
    currentReauthenticateReason = "change_password";
    await reauthenticateUser();
});
fields.btnChangeName.addEventListener("click", async () => {
    await changeName();
    let currentUser = await getCurrentUser();
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