import { ApiError, jsonBody } from "@/lib/api/client";
import type { components as Media } from "@/lib/api/generated/media";

export type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
export type MomentDto = Media["schemas"]["Moment"];
export type StreakDto = {
  currentStreak: number;
  longestStreak: number;
  postedToday: boolean;
};

export type UploadStep = "draft" | "back" | "front" | "publish";
export const UPLOAD_STEPS: UploadStep[] = ["draft", "back", "front", "publish"];

export type Side = "back" | "front";
export type Coords = { latitude: number; longitude: number };

/** Survives retries and cancel so a failed step never creates a second draft. */
export type UploadJob = {
  key: string;
  draftId: string | null;
  sent: Partial<Record<Side, Blob>>;
  published: boolean;
};

export const newJob = (key: string): UploadJob => ({ key, draftId: null, sent: {}, published: false });

export class StepError extends Error {
  constructor(
    readonly step: UploadStep,
    readonly cause: unknown,
  ) {
    super(`Step ${step} failed`);
  }
}

async function run<T>(step: UploadStep, fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    throw new StepError(step, e);
  }
}

export function describeError(e: unknown) {
  const err = e instanceof StepError ? e.cause : e;
  if (err instanceof ApiError) {
    if (err.needsLogin) return "Your session ended. Sign in again, then retry.";
    if (err.unavailable) return "Mootz is temporarily unavailable.";
    if (err.status === 0) return "Couldn't reach Mootz. Check your connection.";
    return `Something went wrong (${err.code}).`;
  }
  return "Something went wrong.";
}

/**
 * Runs the remaining steps in order. Publish happens only after both sides succeeded;
 * `onStep` fires with each step as it completes.
 */
export async function runUpload(
  api: Api,
  job: UploadJob,
  input: { source: "capture" | "upload"; caption: string; location: Coords | null; back: Blob; front: Blob },
  onStep: (done: UploadStep) => void,
) {
  if (!job.draftId) {
    const draft = await run("draft", () =>
      api<MomentDto>(
        "/v1/moments",
        jsonBody({
          source: input.source,
          ...(input.caption ? { caption: input.caption } : {}),
          ...(input.location ? { location: input.location } : {}),
        }),
      ),
    );
    job.draftId = draft.id;
  }
  onStep("draft");
  const id = job.draftId;

  for (const side of ["back", "front"] as const) {
    const blob = input[side];
    if (job.sent[side] !== blob) {
      const replacing = job.sent[side] !== undefined;
      await run(side, async () => {
        try {
          await api(`/v1/moments/${id}/media/${side}${replacing ? "/retake" : ""}`, {
            method: "PUT",
            headers: { "content-type": "image/jpeg" },
            body: blob,
          });
        } catch (e) {
          // 409: this side already exists (an earlier attempt landed); treat as done.
          if (!(e instanceof ApiError && e.status === 409 && !replacing)) throw e;
        }
      });
      job.sent[side] = blob;
    }
    onStep(side);
  }

  if (!job.published) {
    await run("publish", () => api<MomentDto>(`/v1/moments/${id}/publish`, jsonBody({})));
    job.published = true;
  }
  onStep("publish");
  return id;
}
