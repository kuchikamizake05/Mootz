import type { Address, Hex } from "viem";
import type { meetTypes } from "@/lib/chain/generated/protocol";
import type { MeetDomain, SerializedOffer } from "./protocol";

// Response shapes from be/src/meet/routes.ts (the OpenAPI spec leaves these bodies open).

/** POST /v1/meet/offers (201) and PUT /v1/meet/offers/{id}/signature (200, adds posterSignature). */
export type OfferSession = {
  id: string;
  domain: MeetDomain;
  types: typeof meetTypes;
  offer: SerializedOffer;
  expiresAt: string;
  posterSignature?: Hex;
};

/** POST /v1/meet/offers/{id}/preview */
export type MeetPreview = {
  moment: {
    id: string;
    /** Poster @handle; null when they haven't picked one. */
    authorUsername?: string | null;
    caption: string;
    images: Array<{ side: "front" | "back"; path: string; method: "POST"; sha256: string }>;
  };
  proof: { salt: string };
  domain: MeetDomain;
  types: typeof meetTypes;
  acceptance: { action: Hex; offerDigest: Hex; scanner: Address };
  expiresAt: string;
};

export type OnchainStatus = "pending" | "recorded" | "not_saved";

/** POST /v1/meet/offers/{id}/accept and GET /v1/meets/{id}. The offer ID is also the Meet ID. */
export type MeetResult = {
  meetId: string;
  dotId: string;
  status: "valid";
  onchainStatus: OnchainStatus;
  acceptedAt?: string;
  transactionHash?: string | null;
};

/** Foreground-only sample. Never stored by the client, never sent anywhere else. */
export type LocationSample = { latitude: number; longitude: number; accuracyMeters: number; capturedAtMs: number };

/** English copy for backend Meet error codes. Never imply success, presence or identity. */
export const meetErrorCopy: Record<string, { title: string; body: string }> = {
  MEET_EXPIRED: { title: "This QR expired.", body: "Ask your friend to open a new QR." },
  MEET_USED: { title: "This QR was already used.", body: "Each QR works for one Meet. Ask for a new one." },
  SELF_MEET: { title: "That's your own QR.", body: "Scan a friend's QR to Meet." },
  MEET_AREA_USED: { title: "You already met here today.", body: "Meet again in a different area." },
  MEET_DAILY_LIMIT: { title: "That's five Meets today.", body: "You can Meet again tomorrow." },
  CONSENT_CHANGED: { title: "A setting changed.", body: "Start a new Meet so both choices are current." },
  WALLET_CHANGED: { title: "A wallet changed.", body: "Start a new Meet." },
  WALLET_REQUIRED: { title: "Set up your wallet first.", body: "Meet needs a wallet linked to your account." },
  WALLET_UNSUPPORTED: { title: "This wallet isn't supported yet.", body: "Use a standard wallet without smart-account delegation." },
  CHECK_IN_REQUIRED: { title: "Check in first.", body: "Both of you need to check in to this event." },
  EVENT_INELIGIBLE: { title: "This event isn't active.", body: "Meet outside the event or during it." },
  MEET_DISTANCE: { title: "You're too far apart.", body: "Stand within 100 m of each other and try again." },
  LOCATION_ACCURACY: { title: "Location isn't precise enough.", body: "Move to open sky or turn on precise location, then retry." },
  LOCATION_STALE: { title: "Location needs a refresh.", body: "Keep both screens open and try again." },
  INVALID_SIGNATURE: { title: "The signature didn't match.", body: "Nothing was saved. Try again." },
  MOMENT_INELIGIBLE: { title: "This moment can't start a Meet.", body: "Only today's camera moments can be used." },
  MEET_UNAVAILABLE: { title: "Meet isn't available right now.", body: "Your moments are safe. Try again later." },
  RATE_LIMITED: { title: "Too many tries.", body: "Wait a moment, then try again." },
};
