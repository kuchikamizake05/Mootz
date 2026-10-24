"use client";

import Link from "next/link";
import { LoaderCircle, LockKeyhole, MapPin, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { DotsPage, ParticipantPair } from "./dot-parts";
import { areaLabel, countLabel, formatDotDay, recordingStatus, type Dot } from "./model";
import { useDots, useDotSummary, useViewerId } from "./queries";

function DotRow({ dot, viewerId }: { dot: Dot; viewerId: string | undefined }) {
  const status = recordingStatus(dot);
  const saved = status === "saved";
  const onchain = status === "saved" ? "Saved onchain" : status === "pending" ? "Saving onchain…" : "Not saved onchain";
  return (
    <li>
      <Link href={`/dots/${dot.id}`} className="flex flex-col gap-2 rounded-[28px] bg-mootz-surface p-4 shadow-float">
        <span className="flex items-center gap-3">
          <ParticipantPair participants={dot.participants} viewerId={viewerId} size={40} />
          <span className="font-display text-xl leading-tight text-mootz-ink">Meet with a friend</span>
        </span>
        <span className="flex items-start gap-2 text-sm font-semibold text-mootz-muted">
          {saved ? <LockKeyhole aria-label="Saved onchain" size={16} className="mt-0.5 shrink-0 text-mootz-deep" /> : <MapPin aria-hidden size={16} className="mt-0.5 shrink-0" />}
          <span>
            {formatDotDay(dot.createdAt)} · {dot.hidden ? "Hidden" : areaLabel(dot)}
            <br />
            {onchain}
          </span>
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
      <StateMessage icon={TriangleAlert} title="Couldn't load your Dots" actions={<Button onClick={() => void dots.refetch()}>Retry</Button>}>
        Check your connection and try again. Your Dots are not affected.
      </StateMessage>
    );
  } else if (dots.items.length === 0) {
    body = (
      <StateMessage icon={MapPin} title="No Dots yet" actions={<ButtonLink href="/capture">Post moment</ButtonLink>}>
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
          <Button variant="secondary" block disabled={dots.isFetchingNextPage} onClick={() => void dots.fetchNextPage()}>
            {dots.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </>
    );
  }

  return (
    <DotsPage title="Your Dots">
      {!dots.error && !dots.isPending && (
        <div>
          <p className="font-display text-[52px] leading-none text-mootz-deep" aria-live="polite">
            {count === null ? "Dots" : countLabel(count)}
          </p>
          <p className="mt-2 text-sm font-semibold text-mootz-muted">Dots count Meets. Each Dot is one Meet, not a balance.</p>
        </div>
      )}
      {body}
    </DotsPage>
  );
}
