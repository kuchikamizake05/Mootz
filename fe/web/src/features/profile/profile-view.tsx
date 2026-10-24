"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import profileCover from "./assets/XvLPX.png";
import { Camera, CircleDot, Frame, Pencil, ScanLine, Users, RotateCcw, LoaderCircle, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { countLabel } from "@/features/dots/model";
import { useDotSummary } from "@/features/dots/queries";
import { avatarFrame } from "@/features/frames/model";
import { useActiveFrame } from "@/features/frames/queries";
import { streakLabel, streakStrip } from "./model";
import { Page } from "@/components/ui/page";
import { getBrowseOrigin } from "@/features/shell/browse-origin";
import { useJakartaToday, useRecordMeet, useStreak } from "./queries";
import { Switch } from "./switch";
import { useViewerIdentity } from "./viewer";
import { LocationSharingCard } from "@/features/presence/sharing-card";
import { AvatarEditor } from "./avatar-editor";

function StreakCard() {
  const streak = useStreak();
  const today = useJakartaToday();
  const data = streak.data;
  const strip = data && today ? streakStrip(data, today) : null;
  const n = data?.currentStreak ?? 0;

  return (
    <section aria-label="Posting streak" className="rounded-[22px] border border-mootz-hairline bg-mootz-canvas p-3.5 text-mootz-deep">
      {streak.isPending ? (
        <p role="status" className="font-display text-3xl">Loading streak…</p>
      ) : streak.error ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Couldn&apos;t load your streak.</p>
          <Button icon={RotateCcw} variant="secondary" onClick={() => void streak.refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <h2 className="font-display text-[24px] leading-none">{n > 0 ? streakLabel(n) : "No streak yet"}</h2>
          {n === 0 && <p className="mt-1 text-[13px] text-mootz-muted">Post a moment today to start one.</p>}
          {strip && (
            <ol aria-label="Last 7 days" className="mt-4 grid grid-cols-7 gap-2">
              {strip.map((d) => (
                <li
                  key={d.day}
                  aria-label={`${d.day}${d.posted ? ", posted" : ""}${d.today ? ", today" : ""}`}
                  className={cn(
                    "grid h-9 place-items-center rounded-xl text-[13px] font-extrabold",
                    d.posted ? "bg-mootz-deep text-white" : "bg-white text-mootz-deep",
                    d.today && "outline outline-mootz-deep",
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
  const router = useRouter();
  const viewer = useViewerIdentity();
  const frame = useActiveFrame();
  const dots = useDotSummary();
  const streak = useStreak();
  const record = useRecordMeet();
  const postedToday = streak.data?.postedToday ?? false;
  const count = dots.count;

  const toggle = record.mutation;
  return (
    <Page title="My profile" onBack={() => router.push(getBrowseOrigin())}>
      <div className="relative h-[180px] overflow-hidden rounded-t-3xl">
        <Image src={profileCover} alt="" fill sizes="(max-width: 560px) 100vw, 560px" className="object-cover" />
        <span className="absolute bottom-[56px] right-6 rounded-full bg-white px-2 py-1 text-[12px] font-bold text-mootz-muted">Illustrative map</span>
      </div>
      <section className="relative -mt-11 flex min-h-[calc(100dvh-166px)] flex-col gap-6 rounded-t-[32px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[72px] sm:px-6">
      <div className="flex min-w-0 flex-col items-center gap-3 text-center">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2"><Avatar name={viewer.avatarName} src={viewer.avatarSrc} size={128} frame={avatarFrame(frame.data)} /></div>
        <h2 className="w-full break-words font-display text-[36px] leading-tight text-mootz-ink">{viewer.name}</h2>
        {viewer.username ? (
          <p className="flex items-center gap-2 text-base font-bold text-mootz-deep">
            @{viewer.username}
            <Link href="/profile/username" className="inline-flex min-h-11 items-center gap-1 text-sm underline"><Pencil aria-hidden size={16} />Edit</Link>
          </p>
        ) : viewer.username === null ? (
          <Link href="/profile/username" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-mootz-deep underline"><Pencil aria-hidden size={16} />Choose username</Link>
        ) : null}
        <AvatarEditor />
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Link href="/dots" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl border border-mootz-hairline bg-mootz-canvas p-3">
          <span className="flex items-center gap-2 font-display text-[28px] leading-none text-mootz-deep"><CircleDot aria-hidden size={22} className="shrink-0" />
            {dots.isPending ? "…" : count === null ? "Dots" : countLabel(count)}
          </span>
          <span className="text-[13px] font-semibold text-mootz-muted">Each Dot is one Meet.</span>
        </Link>
        <Link href="/frames" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl border border-mootz-hairline bg-mootz-canvas p-3">
          <span className="flex items-center gap-2 font-display text-[24px] leading-none text-mootz-ink"><Frame aria-hidden size={22} className="shrink-0" />Your frames ›</span>
          <span className="text-[13px] font-semibold text-mootz-muted">Achievement + event</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <StreakCard />
        {postedToday ? (
          <p className="rounded-2xl bg-mootz-lilac px-4 py-3 text-center text-sm font-extrabold text-mootz-deep">You posted today. See you tomorrow.</p>
        ) : (
          <ButtonLink icon={Camera} href="/capture" size="lg" block>Post today</ButtonLink>
        )}
        {postedToday && count === 0 && <p className="text-center text-sm text-mootz-muted">No Meet yet. Scan a friend&apos;s QR to make your first Dot.</p>}
        <p className="text-center text-[13px] text-mootz-muted">Daily posts · Resets 00:00 WIB</p>
      </div>

      <nav aria-label="Profile shortcuts" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <ButtonLink icon={ScanLine} href="/meet/scan" size="lg" variant="secondary">Scan to Meet</ButtonLink>
        <ButtonLink icon={Users} href="/friends" size="lg" variant="secondary">Friends</ButtonLink>
      </div>
      </nav>

      <section aria-label="Privacy and sharing" className="flex flex-col gap-4 border-t border-mootz-hairline pt-6">
      <LocationSharingCard />
      <div className="rounded-[22px] border border-mootz-hairline bg-mootz-canvas p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-mootz-ink">Save my Meets onchain</h2>
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
      <p aria-live="polite" role={toggle.isError ? "alert" : undefined} className="text-sm text-mootz-muted">
        {toggle.isError ? "Couldn't change this setting. It stays as it was." : record.loadError ? "Couldn't load this setting." : ""}
      </p>
      </div>
      </section>
      {(frame.isPending && !frame.error) || dots.isPending ? <span className="sr-only" role="status"><LoaderCircle aria-hidden size={1} /> Loading profile</span> : null}
      {frame.error && <StateMessage icon={TriangleAlert} title="Frame unavailable">We couldn&apos;t check your frame right now.</StateMessage>}
      </section>
    </Page>
  );
}
