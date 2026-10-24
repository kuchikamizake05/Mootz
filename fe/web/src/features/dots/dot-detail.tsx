"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { MeetDotMarker } from "@/components/ui/map-markers";
import { Photo } from "@/components/ui/photo";
import { RecordingStatusRow, StateMessage } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { useMoment } from "@/features/moments/queries";
import { DotsPage, ParticipantPair } from "./dot-parts";
import { formatDotWhen, isFinal, recordingStatus, type Dot } from "./model";
import { useDot, useSetVisibility, useViewerId } from "./queries";

function LinkedMoment({ momentId }: { momentId: string }) {
  const moment = useMoment(momentId);
  const card = moment.data;
  if (!card) {
    return (
      <p className="flex min-h-14 items-center rounded-2xl bg-mootz-surface px-4 text-sm font-semibold text-mootz-muted">
        {moment.isPending && moment.fetchStatus !== "idle" ? "Loading linked moment…" : "Linked moment · authorized viewers only"}
      </p>
    );
  }
  return (
    <Link href={`/moments/${card.id}`} className="raised flex items-center gap-3 rounded-2xl bg-mootz-surface p-2 pr-4">
      <Photo src={card.backSrc} alt="Linked moment photo" className="size-14 rounded-xl" />
      <span className="text-sm font-extrabold text-mootz-deep">Linked moment</span>
    </Link>
  );
}

function Visibility({ dot, isParticipant }: { dot: Dot; isParticipant: boolean }) {
  const { mark, mutation } = useSetVisibility(dot.id);
  const [confirming, setConfirming] = useState(false);
  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409;
  const otherHid = dot.hidden && (mark === "other" || conflict);
  const failed = mutation.isError && !conflict;

  if (confirming) {
    return (
      <section role="alertdialog" aria-labelledby="hide-title" aria-describedby="hide-desc" className="flex flex-col gap-3 rounded-[28px] bg-mootz-surface p-5 shadow-float">
        <h2 id="hide-title" className="font-display text-[28px] leading-tight text-mootz-ink">Hide this Dot?</h2>
        <p id="hide-desc" className="text-sm text-mootz-muted">
          This hides the Dot from the map for everyone. It still counts in your profile. Only you can show it again. Onchain records can&apos;t be removed.
        </p>
        <Button
          size="lg"
          block
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(true, { onSettled: () => setConfirming(false) })}
        >
          {mutation.isPending ? "Hiding…" : "Hide from map"}
        </Button>
        <Button variant="secondary" size="lg" block disabled={mutation.isPending} onClick={() => setConfirming(false)}>
          Keep on map
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="visibility-title" className="flex flex-col gap-3">
      <h2 id="visibility-title" className="font-display text-2xl text-mootz-deep">{dot.hidden ? "Hidden" : "Visibility"}</h2>
      <div aria-live="polite" className="flex flex-col gap-3">
        {dot.hidden ? (
          otherHid ? (
            <>
              <p className="text-sm font-bold text-mootz-ink">Hidden by the other participant</p>
              <p className="text-sm text-mootz-muted">Only the person who hid it can restore it.</p>
            </>
          ) : isParticipant ? (
            <>
              <p className="text-sm text-mootz-muted">This Dot is hidden from the map. Only the participant who hid it can show it again.</p>
              <Button variant="secondary" size="lg" block disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>
                {mutation.isPending ? "Showing…" : "Show on map"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-mootz-muted">This Dot is hidden from the map.</p>
          )
        ) : isParticipant ? (
          <Button variant="secondary" size="lg" block onClick={() => setConfirming(true)}>Hide from map</Button>
        ) : null}
        {conflict && !dot.hidden && <p className="text-sm text-mootz-muted">Hidden by the other participant. Only the person who hid it can restore it.</p>}
        {failed && <p role="alert" className="text-sm font-bold text-mootz-ink">Couldn&apos;t update visibility. Try again.</p>}
      </div>
      <p className="text-sm text-mootz-muted">Hiding and the onchain record are separate. Hiding affects the map, not the count or onchain history. Onchain records can&apos;t be removed.</p>
    </section>
  );
}

function DotBody({ dot }: { dot: Dot }) {
  const viewerId = useViewerId();
  const status = recordingStatus(dot);
  const isParticipant = !!viewerId && dot.participants.includes(viewerId);

  return (
    <>
      <div className="flex items-center gap-3">
        <ParticipantPair participants={dot.participants} viewerId={viewerId} />
        <p className="text-sm font-bold text-mootz-ink">You<br />Your friend</p>
      </div>
      <div>
        <h2 className="font-display text-[34px] leading-tight text-mootz-ink">You and your friend were here</h2>
        <p className="mt-1 text-sm font-semibold text-mootz-muted">{formatDotWhen(dot.createdAt)}</p>
      </div>
      {dot.location ? (
        <>
          <div className="grid h-40 place-items-center overflow-hidden rounded-3xl bg-mootz-surface">
            <MeetDotMarker savedOnchain={status === "saved"} label="Approximate Dot area" tabIndex={-1} disabled className={dot.hidden ? "opacity-50" : undefined} size={136} />
          </div>
          <p className="text-xs font-bold text-mootz-muted">Approx. 200 m area · not a verification location</p>
        </>
      ) : (
        <p className="grid min-h-28 place-items-center rounded-3xl bg-mootz-surface px-4 text-center text-sm font-bold text-mootz-muted">No display location</p>
      )}
      <RecordingStatusRow status={status} />
      {status === "saved" && <p className="-mt-2 text-xs font-semibold text-mootz-muted">{isFinal(dot) ? "Final onchain record." : "Recorded; not yet final."}</p>}
      <LinkedMoment momentId={dot.momentId} />
      <Visibility dot={dot} isParticipant={isParticipant} />
    </>
  );
}

export function DotDetail({ id }: { id: string }) {
  const { dot, isPending, error, refetch } = useDot(id);
  let body;
  if (isPending) body = <StateMessage icon={LoaderCircle} busy title="Loading Dot…" />;
  else if (error instanceof ApiError && error.status === 404) {
    body = (
      <StateMessage icon={TriangleAlert} title="Dot not available" actions={<ButtonLink href="/dots">Your Dots</ButtonLink>}>
        This Dot doesn&apos;t exist or you can&apos;t view it.
      </StateMessage>
    );
  } else if (error || !dot) {
    body = (
      <StateMessage icon={TriangleAlert} title="Couldn't load this Dot" actions={<Button onClick={() => void refetch()}>Retry</Button>}>
        Check your connection and try again.
      </StateMessage>
    );
  } else body = <DotBody dot={dot} />;
  return <DotsPage title="Dot detail">{body}</DotsPage>;
}
