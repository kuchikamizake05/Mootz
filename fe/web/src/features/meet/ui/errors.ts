import { ApiError } from "@/lib/api/client";
import { meetErrorCopy } from "../api";

export type Failure = { code: string; title: string; body: string };

const generic = { title: "Something went wrong.", body: "Nothing was saved. Try again." };

/** Maps backend and network failures to honest copy. Never implies a Meet or Dot was made. */
export function describeFailure(error: unknown): Failure {
  if (error instanceof ApiError) {
    if (error.needsLogin) return { code: "UNAUTHORIZED", title: "Sign in again.", body: "Your session ended. Nothing was saved." };
    const code = error.status === 0 || error.unavailable ? "MEET_UNAVAILABLE" : error.code;
    return { code, ...(meetErrorCopy[code] ?? generic) };
  }
  return { code: "UNKNOWN", ...generic };
}

/** Failures where the same QR can still work after a fresh foreground attempt. */
export const retryableCodes = new Set(["MEET_DISTANCE", "LOCATION_ACCURACY", "LOCATION_STALE", "MEET_UNAVAILABLE", "RATE_LIMITED", "UNKNOWN"]);
