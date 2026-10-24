import { hashTypedData, isHex, type Address, type Hex } from "viem";
import { meetTypes, type MeetAccept, type MeetOffer } from "@/lib/chain/generated/protocol";
import { photoCommitment } from "@/lib/chain/generated/typed-data.mjs";

/** EIP-712 domain exactly as returned by the backend (actual chain and registry, never fixtures). */
export type MeetDomain = { name: string; version: string; chainId: number; verifyingContract: Address };

/** Offer as JSON from the backend: uint256 fields arrive as decimal strings. */
export type SerializedOffer = Omit<MeetOffer, "issuedAt" | "expiresAt"> & { issuedAt: string; expiresAt: string };

export const toTypedOffer = (offer: SerializedOffer): MeetOffer => ({
  ...offer,
  issuedAt: BigInt(offer.issuedAt),
  expiresAt: BigInt(offer.expiresAt),
});

export function offerDigest(domain: MeetDomain, offer: SerializedOffer): Hex {
  return hashTypedData({ domain, types: meetTypes, primaryType: "MeetOffer", message: toTypedOffer(offer) });
}

export function acceptTypedData(domain: MeetDomain, accept: MeetAccept) {
  return { domain, types: meetTypes, primaryType: "MeetAccept" as const, message: accept };
}

export function offerTypedData(domain: MeetDomain, offer: SerializedOffer) {
  return { domain, types: meetTypes, primaryType: "MeetOffer" as const, message: toTypedOffer(offer) };
}

/**
 * Backend requires a canonical 65-byte signature with v = 27/28. Some wallets return
 * v = 0/1; normalise those, reject anything else rather than guessing.
 */
export function canonicalSignature(signature: string): Hex {
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) throw new Error("INVALID_SIGNATURE_FORMAT");
  const v = parseInt(signature.slice(130), 16);
  if (v === 27 || v === 28) return signature as Hex;
  if (v === 0 || v === 1) return `${signature.slice(0, 130)}${(v + 27).toString(16)}` as Hex;
  throw new Error("INVALID_SIGNATURE_FORMAT");
}

/*
 * QR payload. Contains only the session ID, the exact signed Offer, its domain and the
 * poster signature — no GPS, media, salt or names. Encoded in the URL fragment so the
 * phone camera can open Mootz while the payload never reaches any server log.
 */
export type QrPayload = { v: 1; id: string; offer: SerializedOffer; domain: MeetDomain; sig: Hex };

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (value: string) => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};

export function encodeQr(payload: QrPayload, origin: string): string {
  return `${origin}/meet/accept#m=${toBase64Url(JSON.stringify(payload))}`;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bytes32 = (v: unknown) => typeof v === "string" && isHex(v) && v.length === 66;

/** Parses a scanned QR (full URL or bare fragment). Returns null for anything that isn't a Mootz Meet QR. */
export function decodeQr(text: string): QrPayload | null {
  const match = /(?:^|#)m=([A-Za-z0-9_-]+)$/.exec(text.trim());
  if (!match) return null;
  try {
    const p = JSON.parse(fromBase64Url(match[1]!)) as QrPayload;
    const o = p.offer;
    const valid =
      p.v === 1 &&
      uuid.test(p.id) &&
      /^0x[0-9a-fA-F]{130}$/.test(p.sig) &&
      typeof p.domain?.chainId === "number" &&
      /^0x[0-9a-fA-F]{40}$/.test(p.domain?.verifyingContract ?? "") &&
      [o.action, o.meetId, o.momentId, o.photoCommitment, o.nonce, o.eventId].every(bytes32) &&
      /^0x[0-9a-fA-F]{40}$/.test(o.poster) &&
      /^\d+$/.test(o.issuedAt) &&
      /^\d+$/.test(o.expiresAt);
    return valid ? p : null;
  } catch {
    return null;
  }
}

/** Seconds until the Offer expires, against the local clock (display only; the backend decides). */
export const secondsLeft = (offer: Pick<SerializedOffer, "expiresAt">, nowMs = Date.now()) =>
  Math.max(0, Number(offer.expiresAt) - Math.floor(nowMs / 1000));

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The scanner checks that the previewed bytes are the ones the poster signed:
 * keccak(1, momentId, sha256(front), sha256(back), salt) must equal offer.photoCommitment.
 * Inputs use the backend's storage form (64 hex chars, no 0x).
 */
export function commitmentMatches(offer: SerializedOffer, frontSha256: string, backSha256: string, salt: string): boolean {
  const hex64 = /^[0-9a-f]{64}$/i;
  if (![frontSha256, backSha256, salt].every((v) => hex64.test(v))) return false;
  const derived = photoCommitment(offer.momentId, `0x${frontSha256}`, `0x${backSha256}`, `0x${salt}`) as Hex;
  return derived.toLowerCase() === offer.photoCommitment.toLowerCase();
}
