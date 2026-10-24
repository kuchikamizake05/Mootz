"use client";

import Link from "next/link";
import { LoaderCircle, MapPin, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { MeetEntry, MomentByline, PairedPhoto } from "@/components/ui/moment";
import { Photo } from "@/components/ui/photo";
import { StateMessage } from "@/components/ui/status";
import { useMoment } from "@/features/moments/queries";
import { canStartMeet, relativeTime } from "@/features/moments/model";
import { CommentRow } from "./comment-row";
import { BackButton, SocialPage } from "./page-frame";
import { isNotFound, personLabel } from "./model";
import { useReactions, useThread } from "./queries";

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-display text-2xl text-mootz-deep">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Reactions({ id }: { id: string }) {
  const reactions = useReactions(id);
  const { items, mine, viewerId } = reactions;
  const others = items.filter((r) => r.id !== mine?.id);
  return (
    <Section id="reactions-title" title={`Selfie reactions ${reactions.isPending ? "" : items.length}`.trim()}>
      {reactions.error ? (
        <p role="alert" className="text-sm text-mootz-muted">
          Reactions couldn&apos;t load. <button className="font-extrabold underline" onClick={() => void reactions.refetch()}>Retry</button>
        </p>
      ) : reactions.isPending ? (
        <p role="status" className="text-sm text-mootz-muted">Loading reactions…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mine && (
            <li className="flex items-center gap-3">
              <Photo src={mine.thumbnailUrl} alt="Your reaction selfie" className="size-14 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-mootz-ink">You</p>
                <p className="text-xs text-mootz-muted">Sent selfie · {relativeTime(mine.createdAt)}</p>
              </div>
              <ButtonLink variant="soft" href={`/moments/${id}/react`}>Change</ButtonLink>
            </li>
          )}
          {others.map((r) => (
            <li key={r.id} className="flex items-center gap-3">
              <Photo src={r.thumbnailUrl} alt={`Reaction selfie from ${personLabel(r.accountId, viewerId)}`} className="size-14 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-mootz-ink">{personLabel(r.accountId, viewerId)}</p>
                <p className="text-xs text-mootz-muted">Sent selfie · {relativeTime(r.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!mine && !reactions.isPending && !reactions.error && (
        <div className="flex flex-col gap-2">
          {items.length === 0 && <p className="text-sm text-mootz-muted">No selfie reactions yet.</p>}
          <ButtonLink variant="secondary" block href={`/moments/${id}/react`}>React with a selfie</ButtonLink>
        </div>
      )}
    </Section>
  );
}

function CommentsPreview({ id }: { id: string }) {
  const thread = useThread(id);
  const latest = [...thread.threads].reverse().find((t) => !t.root.deleted);
  const latestReply = latest ? latest.replies.at(-1) : undefined;
  const shown = latestReply ?? latest?.root;
  const viewerId = useReactions(id).viewerId;
  const countLabel = thread.isPending ? "" : `${thread.count}${thread.hasMore ? "+" : ""}`;
  const href = `/moments/${id}/comments`;
  return (
    <Section id="comments-title" title={`Comments ${countLabel}`.trim()}>
      {thread.error ? (
        <p role="alert" className="text-sm text-mootz-muted">
          Comments couldn&apos;t load. <button className="font-extrabold underline" onClick={thread.refetch}>Retry</button>
        </p>
      ) : thread.isPending ? (
        <p role="status" className="text-sm text-mootz-muted">Loading comments…</p>
      ) : shown ? (
        <div className="flex flex-col gap-3">
          <CommentRow comment={shown} viewerId={viewerId} />
          <ButtonLink variant="secondary" href={href} className="self-start">Reply</ButtonLink>
        </div>
      ) : (
        <p className="text-sm text-mootz-muted">No comments yet.</p>
      )}
      {thread.count > 0 && (
        <ButtonLink variant="soft" block href={href}>View all comments · {thread.count}{thread.hasMore ? "+" : ""}</ButtonLink>
      )}
      <Link href={href} className="flex flex-col gap-3 rounded-2xl border border-mootz-hairline bg-mootz-surface p-4">
        <span className="text-[15px] text-mootz-muted">Write a comment…</span>
        <span className="text-xs text-mootz-muted">0 / 500 · Open the thread to write a reply</span>
      </Link>
    </Section>
  );
}

export function MomentDetail({ id }: { id: string }) {
  const moment = useMoment(id);
  const m = moment.data;

  if (!m) {
    const gone = isNotFound(moment.error);
    return (
      <SocialPage>
        <BackButton />
        {moment.error ? (
          <StateMessage
            icon={TriangleAlert}
            title={gone ? "Moment not available" : "Couldn't load this moment"}
            actions={!gone && <Button onClick={() => void moment.refetch()}>Retry</Button>}
          >
            {gone ? "It may have been removed, or it isn't shared with you." : "Check your connection and try again."}
          </StateMessage>
        ) : (
          <StateMessage icon={LoaderCircle} busy title="Loading moment…" />
        )}
      </SocialPage>
    );
  }

  return (
    <SocialPage className="pb-10">
      <header className="flex items-center gap-3">
        <div className="w-28 shrink-0"><BackButton /></div>
        <div className="min-w-0 flex-1"><MomentByline author={m.author} postedLabel={m.postedLabel} avatarSize={40} /></div>
      </header>
      <PairedPhoto momentId={m.mediaId} backSrc={m.backSrc} frontSrc={m.frontSrc} authorName={m.author.name} selfie="lg" className="aspect-[4/5] w-full" />
      {m.caption && <p className="text-base font-bold text-mootz-ink">{m.caption}</p>}
      {m.place && m.location ? (
        <div className="flex min-h-11 items-center gap-1.5">
          <MapPin aria-hidden size={18} strokeWidth={2.25} className="shrink-0 text-mootz-deep" />
          <p className="min-w-0 flex-1 truncate text-sm text-mootz-muted">{m.place} · Posted here</p>
          <ButtonLink variant="secondary" icon={MapPin} href={`/map?moment=${m.id}`} className="shrink-0 px-3">View on map</ButtonLink>
        </div>
      ) : (
        m.own && <p className="text-xs text-mootz-muted">Location not shared</p>
      )}
      {canStartMeet(m) && <MeetEntry href={`/meet/offer?moment=${m.id}`} className="rounded-2xl" />}
      <Reactions id={id} />
      <CommentsPreview id={id} />
    </SocialPage>
  );
}
