import { env } from "@/lib/env";
import { ApiError } from "@/lib/api/client";
import { demoViewer } from "@/features/moments/demo";
import { DEMO_EVENT_ID, type ApiEvent, type CheckIn, type ClaimJob, type CollectionState, type EquippedCollection } from "./model";

/** Labelled demo fixtures (NEXT_PUBLIC_DEMO_FIXTURES=1). No backend, no chain; state lives in memory. */
export const DEMO_CODE = "DEMO-A";
export const DEMO_COLLECTION_REF = "00000000-0000-4000-8000-0000000000c1";
const CAP = 50;
const CLAIM_DELAY_MS = 3000;
const HOUR = 3_600_000;

const state = { checkedInAt: null as string | null, claimStartedAt: null as number | null, owned: false };

/** The window is centered on "now" so check-in and claim are always open in the demo. */
export function demoEvent(): ApiEvent {
  const now = Date.now();
  return {
    id: DEMO_EVENT_ID,
    title: "Demo Workshop A",
    description: "Demo Workshop A at GIK. Ideas, friends and moments to remember.",
    startsAt: new Date(now - HOUR).toISOString(),
    endsAt: new Date(now + 3 * HOUR).toISOString(),
    locationLabel: "GIK, Yogyakarta",
    location: null,
  };
}

export const demoEvents = (): ApiEvent[] => [demoEvent()];

export const demoCheckIn = (): CheckIn => ({ checkedIn: !!state.checkedInAt, checkedInAt: state.checkedInAt });

export function demoSubmitCode(code: string): CheckIn {
  if (code.trim().toUpperCase() !== DEMO_CODE) throw new ApiError(404, "CODE_INVALID", null);
  state.checkedInAt ??= new Date().toISOString();
  return demoCheckIn();
}

/** Completes the simulated claim once its delay has passed. */
function settle() {
  if (state.claimStartedAt !== null && Date.now() - state.claimStartedAt >= CLAIM_DELAY_MS) state.owned = true;
}

export function demoCollection(): CollectionState {
  settle();
  const issued = 12 + (state.owned ? 1 : 0);
  const ev = demoEvent();
  return {
    collection: {
      id: DEMO_COLLECTION_REF,
      eventId: ev.id,
      chainId: env.chainId,
      contractAddress: "0x0000000000000000000000000000000000000000",
      collectionId: "1",
      displayName: "Demo Workshop A frame",
      artworkUrl: demoViewer.avatarSrc,
      claimStartsAt: ev.startsAt,
      claimEndsAt: ev.endsAt,
    },
    eligibility: state.owned ? "already_owned" : state.checkedInAt ? "eligible" : "not_checked_in",
    cap: String(CAP),
    totalSupply: String(issued),
    remaining: String(CAP - issued),
    balance: state.owned ? "1" : "0",
    claimed: state.owned,
  };
}

const DEMO_CLAIM_ID = "00000000-0000-4000-8000-0000000000d1";

export function demoStartClaim(): ClaimJob {
  if (!state.checkedInAt) throw new ApiError(403, "CHECK_IN_REQUIRED", null);
  if (state.owned) throw new ApiError(409, "ALREADY_OWNED", null);
  state.claimStartedAt ??= Date.now();
  return demoClaim();
}

/** Pending until the delay elapses; the demo has no real transaction, so no hash is returned. */
export function demoClaim(): ClaimJob {
  settle();
  return {
    claimId: DEMO_CLAIM_ID,
    authorizationId: "00000000-0000-4000-8000-0000000000d0",
    status: state.owned ? "included" : "pending",
    transactionHash: null,
    finality: "unverified",
    chainOutcome: state.owned ? "success" : "pending",
    createdAt: new Date(state.claimStartedAt ?? Date.now()).toISOString(),
    completedAt: state.owned ? new Date().toISOString() : null,
  };
}

export function demoEquipped(): EquippedCollection {
  const c = demoCollection().collection;
  return {
    collectionRef: c.id,
    eventId: c.eventId,
    collectionId: c.collectionId,
    chainId: c.chainId,
    contractAddress: c.contractAddress,
    displayName: c.displayName,
    artworkUrl: c.artworkUrl,
    equippedAt: new Date().toISOString(),
  };
}
