import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

if (!localStorage.getItem("sentry_optout")) {
    let {npm_package_version} = process.env;
    Sentry.init({
        dsn: "https://4439a6b734334a92b39a9aabfb1bebd4@o4504087298048000.ingest.sentry.io/4504087320723456",
        integrations: [new BrowserTracing()],
        tracesSampleRate: 1.0,
        release: `vocabustudy@v${npm_package_version}`,
        ignoreErrors: ["AbortError", "Display name too long", "Failed to register a service worker", "auth/network-request-failed", /Failed to access \w+ before initialization/]
    });
    window.sentryCaptureException = Sentry.captureException;
    /** @param {import("firebase/auth").User?} user */
    window.sentrySetUser = user => Sentry.setUser(user ? {id: user.uid} : null);
}