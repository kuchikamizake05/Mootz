import { ApiError } from "@/lib/api/client";

export type ApiEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationLabel: string | null;
};

export type EventPage = { items: ApiEvent[]; nextCursor: string | null };
export type CheckIn = { checkedIn: boolean; checkedInAt: string | null };

export type Eligibility = "eligible" | "not_checked_in" | "not_open" | "closed" | "sold_out" | "already_owned" | "issuer_unavailable";

/** GET /v1/events/:id/collection. uint256 values are decimal strings. */
export type CollectionState = {
  collection: {
    id: string;
    eventId: string;
    chainId: number;
    contractAddress: string;
    collectionId: string;
    displayName: string;
    artworkUrl: string;
    claimStartsAt: string;
    claimEndsAt: string;
  };
  eligibility: Eligibility;
  cap: string;
  totalSupply: string;
  remaining: string;
  balance: string;
  claimed: boolean;
};

export type ClaimStatus = "pending" | "included" | "failed" | "already_owned";
export type ClaimFailureReason =
  | "INVALID_PAYLOAD"
  | "COLLECTION_MISMATCH"
  | "CLAIM_EXPIRED"
  | "ISSUER_UNAVAILABLE"
  | "SOLD_OUT"
  | "TRANSACTION_REVERTED"
  | "RECEIPT_MISMATCH"
  | "DEPENDENCY_RETRY";

/** POST /v1/events/:id/claims and GET /v1/events/:id/claims/:claimId. */
export type ClaimJob = {
  claimId: string;
  authorizationId: string;
  status: ClaimStatus;
  transactionHash: string | null;
  finality: "unverified" | "included" | "finalized";
  chainOutcome: "unverified" | "pending" | "success" | "reverted" | "mismatched";
  createdAt: string;
  completedAt: string | null;
  reason?: ClaimFailureReason;
};

export type Authorization = { authorizationId: string; expiresAt: string; status: "authorized" };
export type EquippedCollection = {
  collectionRef: string;
  eventId: string;
  collectionId: string;
  chainId: number;
  contractAddress: string;
  displayName: string;
  artworkUrl: string | null;
  equippedAt: string;
};

export const DEMO_EVENT_ID = "00000000-0000-4000-8000-0000000000e1";
export const EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";
export const NETWORK_NAME = "Monad Testnet";
export const ISSUER_NOTE = "Issued by the organizer; not independent proof of attendance or uniqueness.";

export const isTerminal = (job: ClaimJob | undefined) => job?.status === "included" || job?.status === "failed" || job?.status === "already_owned";
export const owned = (c: CollectionState | undefined) => !!c && c.eligibility === "already_owned";

/** Ownership is shown only when the backend confirmed receipt and chain readback. */
export const claimConfirmed = (job: ClaimJob | undefined) => job?.status === "included" || job?.status === "already_owned";

/** Only a well-formed hash from a successful, included claim becomes an explorer link. */
export function txUrl(job: ClaimJob | undefined): string | null {
  if (!job || job.status !== "included" || job.chainOutcome === "reverted" || job.chainOutcome === "mismatched") return null;
  return job.transactionHash && /^0x[0-9a-fA-F]{64}$/.test(job.transactionHash) ? EXPLORER_TX + job.transactionHash : null;
}

export const networkLabel = (chainId: number) => (chainId === 10143 ? NETWORK_NAME : `Chain ${chainId}`);

const tz = "Asia/Jakarta";
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const formatDateTime = (iso: string) => `${dateFmt.format(new Date(iso))}, ${timeFmt.format(new Date(iso))} WIB`;

/** "22 Oct 2026 · 14:00–17:00 WIB (Asia/Jakarta)"; spans two dates when the event crosses midnight. */
export function formatWindow(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (dateFmt.format(s) === dateFmt.format(e)) return `${dateFmt.format(s)} · ${timeFmt.format(s)}–${timeFmt.format(e)} WIB (${tz})`;
  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)} (${tz})`;
}

export type Phase = "upcoming" | "live" | "ended";
export const eventPhase = (e: ApiEvent, now: number): Phase =>
  now < Date.parse(e.startsAt) ? "upcoming" : now >= Date.parse(e.endsAt) ? "ended" : "live";

export const isMissing = (error: unknown) => error instanceof ApiError && error.status === 404;
export const isUnavailable = (error: unknown) => error instanceof ApiError && (error.unavailable || error.status === 0);
export const errorCode = (error: unknown) => (error instanceof ApiError ? error.code : null);

/** Per-event claim key, reused on retry and reload so duplicate requests stay idempotent. */
const memoryKeys = new Map<string, string>();
const storeKey = (eventId: string) => `mootz:claim-request:${eventId}`;

export function claimRequestId(eventId: string): string {
  const existing = memoryKeys.get(eventId);
  if (existing) return existing;
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(storeKey(eventId));
  } catch {}
  const id = stored ?? crypto.randomUUID();
  memoryKeys.set(eventId, id);
  try {
    window.sessionStorage.setItem(storeKey(eventId), id);
  } catch {}
  return id;
}

export function resetClaimRequestId(eventId: string) {
  memoryKeys.delete(eventId);
  try {
    window.sessionStorage.removeItem(storeKey(eventId));
  } catch {}
}

/** User-facing text for claim submission errors. Network and 503 keep the key for a safe retry. */
export function claimErrorMessage(error: unknown): string {
  switch (errorCode(error)) {
    case "CHECK_IN_REQUIRED":
      return "Check in with the organizer before claiming.";
    case "CLAIM_NOT_OPEN":
      return "Claiming hasn't opened yet.";
    case "CLAIM_CLOSED":
      return "Claiming is closed for this event.";
    case "SOLD_OUT":
      return "All collectibles have been claimed.";
    case "ALREADY_OWNED":
      return "This wallet already owns the collectible.";
    case "CLAIM_PENDING":
      return "A claim authorization is already active for your account. Wait a couple of minutes, then try again.";
    case "CLAIM_EXPIRED":
      return "The authorization expired. Try again to request a new one.";
    case "WALLET_REQUIRED":
      return "Set up your wallet first.";
    case "CLAIM_REQUEST_CONFLICT":
    case "INVALID_CLAIM":
      return "That request can no longer be used. Try again to start a new one.";
    case "COLLECTION_UNAVAILABLE":
      return "Claiming is unavailable right now. Nothing was claimed.";
    default:
      return isUnavailable(error)
        ? "The network check is unavailable right now. Nothing was claimed; try again shortly."
        : "Couldn't submit the claim. Nothing was claimed; try again.";
  }
}

/** Error codes after which the saved clientRequestId must not be reused. */
export const needsNewRequestId = (error: unknown) => ["CLAIM_EXPIRED", "CLAIM_REQUEST_CONFLICT", "INVALID_CLAIM"].includes(errorCode(error) ?? "");

export function failureMessage(reason: ClaimFailureReason | undefined): string {
  switch (reason) {
    case "SOLD_OUT":
      return "The collection sold out before your claim was confirmed.";
    case "CLAIM_EXPIRED":
      return "The authorization expired before it could be confirmed.";
    case "TRANSACTION_REVERTED":
      return "The transaction didn't complete.";
    case "ISSUER_UNAVAILABLE":
      return "The organizer's issuer is unavailable.";
    default:
      return "The claim couldn't be completed.";
  }
}
