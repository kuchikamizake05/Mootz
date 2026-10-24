"use client";

import Link from "next/link";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { countLabel } from "@/features/dots/model";
import { useDotSummary } from "@/features/dots/queries";
import { avatarFrame, frameName } from "@/features/frames/model";
import { useActiveFrame } from "@/features/frames/queries";
import { streakLabel, streakStrip } from "./model";
import { PageShell } from "./page-shell";
import { useJakartaToday, useRecordMeet, useStreak } from "./queries";
import { Switch } from "./switch";
import { useViewerIdentity } from "./viewer";

function StreakCard() {
  const streak = useStreak();
  const today = useJakartaToday();
  const data = streak.data;
  const strip = data && today ? streakStrip(data, today) : null;
  const n = data?.currentStreak ?? 0;

  return (
    <section aria-label="Posting streak" className="rounded-[32px] bg-mootz-deep p-5 text-white">
      {streak.isPending ? (
        <p role="status" className="font-display text-3xl">Loading streak…</p>
      ) : streak.error ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Couldn&apos;t load your streak.</p>
          <Button variant="secondary" onClick={() => void streak.refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <h2 className="font-display text-[34px] leading-none">{n > 0 ? streakLabel(n) : "No streak yet"}</h2>
          {n === 0 && <p className="mt-1 text-sm text-white/80">Post a moment today to start one.</p>}
          {data?.postedToday && <p className="mt-1 text-sm text-white/80">You posted today.</p>}
          {strip && (
            <ol aria-label="Last 7 days" className="mt-4 grid grid-cols-7 gap-2">
              {strip.map((d) => (
                <li
                  key={d.day}
                  aria-label={`${d.day}${d.posted ? ", posted" : ""}${d.today ? ", today" : ""}`}
                  className={cn(
                    "grid h-11 place-items-center rounded-xl text-sm font-extrabold",
                    d.posted ? "bg-mootz-lilac text-mootz-deep" : "bg-white text-mootz-deep",
                    d.today && "outline-2 outline-offset-2 outline-white",
                  )}
                >
                  {d.label}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

export function ProfileView() {
  const viewer = useViewerIdentity();
  const frame = useActiveFrame();
  const dots = useDotSummary();
  const streak = useStreak();
  const record = useRecordMeet();
  const postedToday = streak.data?.postedToday ?? false;
  const count = dots.count;

  const toggle = record.mutation;
  return (
    <PageShell header={<span />}>
      <div className="-mt-2 flex flex-col items-center gap-1 text-center">
        <Avatar name={viewer.name} src={viewer.avatarSrc} size={96} frame={avatarFrame(frame.data)} />
        <h1 className="font-display text-[40px] leading-none text-mootz-ink">{viewer.name}</h1>
        {frameName(frame.data) && <p className="text-sm font-semibold text-mootz-muted">Wearing {frameName(frame.data)}</p>}
      </div>

      <StreakCard />

      <div className="grid grid-cols-[1.1fr_1fr] gap-3">
        <Link href="/dots" className="flex flex-col justify-between gap-1 rounded-[28px] bg-mootz-surface p-4 shadow-float">
          <span className="font-display text-[34px] leading-none text-mootz-deep">
            {dots.isPending ? "…" : count === null ? "Dots" : countLabel(count)}
          </span>
          <span className="text-sm font-semibold text-mootz-muted">{count === 0 ? "A Dot appears after your first Meet." : "Each Dot is one Meet."}</span>
        </Link>
        <Link href="/frames" className="flex flex-col justify-between gap-1 rounded-[28px] bg-mootz-lilac p-4">
          <span className="font-display text-[28px] leading-none text-mootz-ink">Your frames</span>
          <span className="text-sm font-semibold text-mootz-muted">Achievement + event</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/meet/scan" size="lg">Scan to Meet</ButtonLink>
        <ButtonLink href="/friends" size="lg" variant="secondary">Friends</ButtonLink>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[28px] bg-mootz-surface p-4 shadow-float">
        <div>
          <p className="font-extrabold text-mootz-ink">Save my Meets onchain</p>
          <p className="text-sm text-mootz-muted">
            Applies to future Meets.{" "}
            <Link href="/profile/settings" className="font-bold text-mootz-deep underline">Details</Link>
          </p>
        </div>
        <Switch
          label="Save my Meets onchain"
          checked={record.value ?? false}
          disabled={record.value === undefined || toggle.isPending}
          onChange={(next) => toggle.mutate(next)}
        />
      </div>
      <p aria-live="polite" role={toggle.isError ? "alert" : undefined} className="-mt-2 min-h-4 text-sm text-mootz-muted">
        {toggle.isError ? "Couldn't change this setting. It stays as it was." : record.loadError ? "Couldn't load this setting." : ""}
      </p>

      {postedToday ? (
        <p className="rounded-2xl bg-mootz-lilac px-4 py-3 text-center text-sm font-extrabold text-mootz-deep">You posted today. See you tomorrow.</p>
      ) : (
        <ButtonLink href="/capture" size="lg" block>Post today</ButtonLink>
      )}
      {postedToday && count === 0 && <p className="text-center text-sm text-mootz-muted">No Meet yet. Scan a friend&apos;s QR to make your first Dot.</p>}

      <p className="text-sm text-mootz-muted">
        Daily posts · Resets 00:00 WIB
        <br />
        Onchain choice applies to future Meets only.
      </p>
      {(frame.isPending && !frame.error) || dots.isPending ? <span className="sr-only" role="status"><LoaderCircle aria-hidden size={1} /> Loading profile</span> : null}
      {frame.error && <StateMessage icon={TriangleAlert} title="Frame unavailable">We couldn&apos;t check your frame right now.</StateMessage>}
    </PageShell>
  );
}
