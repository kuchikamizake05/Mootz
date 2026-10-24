import type { useRouter } from "next/navigation";
import { getBrowseOrigin } from "@/features/shell/browse-origin";

/** Only same-origin absolute paths are accepted as a post-onboarding destination. */
export function safeNext(value: string | null | undefined, fallback = "/map") {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

/** Close returns to where the user came from; a direct entry falls back to the Map. */
export function closeFlow(router: ReturnType<typeof useRouter>) {
  router.push(getBrowseOrigin());
}

/** UUID as the protocol's bytes32: raw 16 bytes, right-padded with zeros. */
export const uuidToBytes32 = (uuid: string) => `0x${uuid.replace(/-/g, "").toLowerCase()}${"0".repeat(32)}`;

const KEY = "mootz.meet.payload";

/*
 * The QR payload normally lives in the URL fragment. When the user must first finish
 * onboarding, or after the scanner navigates, it is held in sessionStorage (tab-scoped,
 * never sent to the server) instead of being put into a query string.
 */
export const stashPayload = (fragment: string) => sessionStorage.setItem(KEY, fragment);
export const clearPayload = () => sessionStorage.removeItem(KEY);
export const currentFragment = () => window.location.hash || sessionStorage.getItem(KEY) || "";
