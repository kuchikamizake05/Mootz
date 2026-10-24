"use client";

import Link from "next/link";
import { Camera, ChevronDown, EyeOff, LoaderCircle, MapPin, RotateCcw, TriangleAlert } from "lucide-react";
import { Card, StatusChip } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { handleLabel } from "@/features/profile/username";
import { DotsPage, ParticipantPair, otherParticipant } from "./dot-parts";
import { areaLabel, countLabel, formatDotDay, recordingStatus, type Dot } from "./model";
import { useDots, useDotSummary, useViewerId } from "./queries";

function DotRow({ dot, viewerId }: { dot: Dot; viewerId: string | undefined }) {
  const status = recordingStatus(dot);
  const onchain = status === "saved" ? "Saved" : status === "pending" ? "Saving" : "Not saved";
  return (
    <li>
      <Link href={`/dots/${dot.id}`} className="flex flex-col gap-3 rounded-3xl border border-mootz-hairline bg-mootz-surface p-4 transition-colors hover:bg-mootz-lilac">
        <span className="flex items-center gap-3">
          <ParticipantPair dot={dot} viewerId={viewerId} size={40} />
          <span className="font-display text-xl leading-tight text-mootz-ink">Meet with {handleLabel(otherParticipant(dot, viewerId).username)}</span>
        </span>
        <span className="flex items-start gap-2 text-sm font-semibold text-mootz-muted">
          <MapPin aria-hidden size={18} className="mt-0.5 shrink-0" />
          <span>
            {formatDotDay(dot.createdAt)} · {dot.hidden ? "Hidden" : areaLabel(dot)}
          </span>
        </span>
        <span className="flex flex-wrap gap-2">
          <StatusChip tone={status === "saved" ? "success" : status === "pending" ? "pending" : "muted"} aria-label={`${onchain} onchain`}>{onchain}</StatusChip>
          {dot.hidden && <StatusChip tone="muted" icon={EyeOff}>Hidden</StatusChip>}
        </span>
      </Link>
    </li>
  );
}

export function DotsList() {
  const viewerId = useViewerId();
  const dots = useDots();
  const summary = useDotSummary();
  const count = summary.count ?? (dots.hasNextPage ? null : dots.items.length);

  let body;
  if (dots.isPending) {
    body = <StateMessage icon={LoaderCircle} busy title="Loading Dots…" />;
  } else if (dots.error) {
    body = (
      <StateMessage icon={TriangleAlert} title="Couldn't load your Dots" actions={<Button icon={RotateCcw} onClick={() => void dots.refetch()}>Retry</Button>}>
        Check your connection and try again. Your Dots are not affected.
      </StateMessage>
    );
  } else if (dots.items.length === 0) {
    body = (
      <StateMessage icon={MapPin} title="No Dots yet" actions={<ButtonLink icon={Camera} href="/capture">Post moment</ButtonLink>}>
        A Dot appears when you and a friend complete a Meet on a moment.
      </StateMessage>
    );
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-3">
          {dots.items.map((d) => (
            <DotRow key={d.id} dot={d} viewerId={viewerId} />
          ))}
        </ul>
        {dots.hasNextPage && (
          <Button icon={ChevronDown} variant="secondary" block disabled={dots.isFetchingNextPage} onClick={() => void dots.fetchNextPage()}>
            {dots.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </>
    );
  }

  return (
    <DotsPage title="Your Dots">
      {!dots.error && !dots.isPending && (
        <Card>
          <p className="font-display text-[44px] leading-none text-mootz-deep" aria-live="polite">
            {count === null ? "Dots" : countLabel(count)}
          </p>
          <p className="mt-2 text-sm font-semibold text-mootz-muted">Each Dot is one Meet.</p>
        </Card>
      )}
      {body}
    </DotsPage>
  );
}
