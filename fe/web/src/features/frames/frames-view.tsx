"use client";

import { ArrowLeft, Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { PageShell } from "@/features/profile/page-shell";
import { useViewerIdentity } from "@/features/profile/viewer";
import { avatarFrame, frameName, requirementLabel, type FrameId, type FrameItem } from "./model";
import { useActiveFrame, useFrames, useSetFrame } from "./queries";

function Progress({ item }: { item: FrameItem }) {
  const { target } = item.requirement;
  return (
    <div
      role="progressbar"
      aria-label={`${item.name} progress`}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={item.progress}
      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mootz-lilac"
    >
      <div className="h-full rounded-full bg-mootz-purple" style={{ width: `${(item.progress / target) * 100}%` }} />
    </div>
  );
}

export function FramesView() {
  const viewer = useViewerIdentity();
  const frames = useFrames();
  const active = useActiveFrame();
  const setFrame = useSetFrame();

  const activeId = active.data?.kind === "achievement" ? active.data.id : null;
  const failedId = setFrame.isError ? (setFrame.variables as FrameId | null) : undefined;
  const failMessage =
    setFrame.error instanceof ApiError && setFrame.error.code === "FRAME_LOCKED"
      ? "That frame is still locked. Your previous frame is still active."
      : "Couldn't equip. Try again. Your previous frame is still active. Achievement ownership and your Dot are kept.";

  let body;
  if (frames.isPending) {
    body = <StateMessage icon={LoaderCircle} busy title="Loading frames…" />;
  } else if (frames.error || !frames.data) {
    body = (
      <StateMessage icon={TriangleAlert} title="Couldn't load frames" actions={<Button onClick={() => void frames.refetch()}>Retry</Button>}>
        Check your connection and try again. Your frames are not affected.
      </StateMessage>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {frames.data.items.map((item) => {
          const wearing = activeId === item.id;
          const pending = setFrame.isPending && setFrame.variables === item.id;
          return (
            <li key={item.id} className="rounded-[28px] bg-mootz-surface p-4 shadow-float">
              <div className="flex items-center gap-3">
                <Avatar name={viewer.name} src={viewer.avatarSrc} size={56} frame={item.unlocked ? "achievement" : "lilac"} className={cn(!item.unlocked && "opacity-60")} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl leading-tight text-mootz-ink">{item.name}</h2>
                  <p className="text-sm font-semibold text-mootz-muted">{requirementLabel(item)}</p>
                </div>
                {item.unlocked ? (
                  wearing ? (
                    <span className="inline-flex min-h-11 items-center gap-1 rounded-2xl bg-mootz-lilac px-4 text-sm font-extrabold text-mootz-deep">
                      <Check aria-hidden size={16} /> Wearing
                    </span>
                  ) : (
                    <Button aria-label={`Wear ${item.name}`} disabled={setFrame.isPending} onClick={() => setFrame.mutate(item.id)}>
                      {pending ? "Wearing…" : "Wear"}
                    </Button>
                  )
                ) : (
                  <span className="text-sm font-extrabold text-mootz-muted">Locked</span>
                )}
              </div>
              {!item.unlocked && <Progress item={item} />}
              {failedId === item.id && (
                <p role="alert" className="mt-3 text-sm font-semibold text-mootz-ink">
                  {failMessage}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const eventFrame = active.data?.kind === "collection" ? active.data : null;

  return (
    <PageShell
      header={
        <h1 className="font-display text-[32px] leading-none text-mootz-ink">Your frames</h1>
      }
    >
      <p className="text-sm font-semibold text-mootz-muted">
        Frames unlock automatically from your Meets. They are free, cosmetic and stay offchain. Nothing here can be bought.
      </p>
      <div aria-live="polite" className="sr-only">
        {setFrame.isSuccess ? "Frame updated" : ""}
      </div>
      {setFrame.isSuccess && (
        <p className="rounded-2xl bg-mootz-lilac px-4 py-3 text-sm font-semibold text-mootz-deep">
          {setFrame.data ? `Frame equipped · Cosmetic only` : "Frame removed · Cosmetic only"}
        </p>
      )}
      {active.data && (
        <div className="flex items-center gap-3 rounded-[28px] bg-mootz-surface p-4 shadow-float">
          <Avatar name={viewer.name} src={viewer.avatarSrc} size={56} frame={avatarFrame(active.data)} />
          <p className="flex-1 text-sm font-semibold text-mootz-muted">
            Wearing <span className="font-extrabold text-mootz-ink">{frameName(active.data)}</span>
          </p>
          <Button variant="secondary" disabled={setFrame.isPending} onClick={() => setFrame.mutate(null)}>
            Remove frame
          </Button>
        </div>
      )}
      {active.error && <p role="alert" className="text-sm text-mootz-muted">Couldn&apos;t check your current frame right now. Showing what we know.</p>}
      {body}
      {eventFrame && (
        <div className="flex items-center gap-3 rounded-[24px] bg-mootz-lilac p-4 text-sm font-bold text-mootz-deep">
          <Avatar name={viewer.name} src={viewer.avatarSrc} size={52} frame="event" />
          <span>
            {eventFrame.displayName}
            <br />
            Event frame · Free after organizer check-in
          </span>
        </div>
      )}
      <ButtonLink href="/profile" variant="secondary" block icon={ArrowLeft}>
        Back to profile
      </ButtonLink>
    </PageShell>
  );
}
