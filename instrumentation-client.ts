import * as Sentry from "@sentry/nextjs";

/** Brauzer tomonidagi xatolarni kuzatish — NEXT_PUBLIC_SENTRY_DSN berilganda */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
