// src/utils/sentry.ts
import * as Sentry from "@sentry/react-native";
import { version } from "../../package.json"; // adjust path

Sentry.init({
  dsn: "https://fe2717b02cd57befbb4dc7320f907217@o4509945466978305.ingest.us.sentry.io/4509945471041536",
  release: `dtrue@${version}`,
  tracesSampleRate: 0.2,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  enableNative: true,
  beforeSend(event) {
    if (event.level === "warning") return null;
    return event;
  },
});

// Set logged-in user for better debugging
export const setSentryUser = (clerkId: string) => {
  Sentry.setUser({ id: clerkId });
};

// Capture handled errors
export const logError = (error: unknown, context?: Record<string, any>) => {
  Sentry.captureException(error, { extra: context });
};

// Capture custom messages
export const logMessage = (message: string, context?: Record<string, any>) => {
  Sentry.captureMessage(message, { extra: context });
};
