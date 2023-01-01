import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

if (!localStorage.getItem("sentry_optout")) {
    Sentry.init({
        dsn: "https://4439a6b734334a92b39a9aabfb1bebd4@o4504087298048000.ingest.sentry.io/4504087320723456",
        integrations: [new BrowserTracing()],
        tracesSampleRate: 1.0,
        release: `vocabustudy@v${process.env.npm_package_version}`
    });
    window.sentryCaptureException = Sentry.captureException;
    /** @param {import("firebase/auth").User?} user */
    window.sentrySetUser = user => Sentry.setUser(user ? {email: user.email, id: user.uid, username: user.displayName} : null);
}