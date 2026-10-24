"use client";

import { Clock, RotateCcw, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { useMoment } from "@/features/moments/queries";
import { cn } from "@/lib/cn";
import { QrImage } from "../ui/qr-image";

const RING = 2 * Math.PI * 26;

function Countdown({ left, total }: { left: number; total: number }) {
  const urgent = left > 0 && left <= 10;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-2 lg:justify-start">
      <svg aria-hidden viewBox="0 0 60 60" className={cn("size-5 -rotate-90", urgent && "motion-safe:animate-pulse")}>
        <circle cx="30" cy="30" r="26" fill="none" strokeWidth="5" className="stroke-white/25" />
        <circle
          cx="30"
          cy="30"
          r="26"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={urgent ? "stroke-white" : "stroke-mootz-light"}
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - left / total)}
        />
      </svg>
      <span aria-hidden className={cn("font-display text-[32px] leading-none tabular-nums sm:text-[40px]", urgent && "text-white")}>
        {mm}
      </span>
    </div>
  );
}
/**
 * The poster's QR screen (03.04 / 03.05 / 03.07). The countdown is visual only; screen
 * readers hear one message when 10 seconds remain and one at expiry.
 */

export function QrScreen({
  momentId,
  text,
  left,
  total = 60,
  locationNote,
  demo,
  onNewQr,
  onSimulate,
}: {
  momentId: string;
  text: string;
  left: number;
  total?: number;
  locationNote?: string | null;
  demo?: boolean;
  onNewQr: () => void;
  onClose: () => void;
  onSimulate?: () => void;
}) {
  const moment = useMoment(momentId).data;
  const expired = left === 0;
  const urgent = !expired && left <= 10;
  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {expired ? "This QR expired." : urgent ? "Less than 10 seconds left." : ""}
      </p>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-2">
      <figure aria-label="Meet QR code" className="mx-auto w-full max-w-[360px] rounded-3xl bg-white p-4 text-mootz-ink sm:p-5 lg:max-w-none lg:p-6">
        {expired ? (
          <div className="grid aspect-square w-full place-items-center rounded-2xl bg-mootz-lilac text-mootz-deep">
            <p className="flex items-center gap-2 text-lg font-extrabold">
              <Clock aria-hidden size={22} /> Expired
            </p>
          </div>
        ) : (
          <QrImage text={text} label={demo ? "Demo QR, not scannable" : "Meet QR for your friend to scan"} className="rounded-2xl" />
        )}
      </figure>
        {demo && <p className="text-center text-[13px] font-bold text-white/80">Demo QR · Not scannable</p>}
        {expired && <Button icon={RotateCcw} variant="secondary" size="lg" block onClick={onNewQr}>New QR</Button>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <Countdown left={left} total={total} />
        <p className="hidden text-sm font-bold lg:block">60-second signed Offer · One scanner</p>
      <div className="flex min-w-0 items-center gap-3">
        <Photo src={moment?.backSrc} alt="" className="size-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 text-sm font-extrabold">
          <p className="break-words">You · {moment?.postedLabel ?? "Your moment"}</p>
          {moment?.caption && <p className="line-clamp-2 break-words font-normal text-white/80">{moment.caption}</p>}
        </div>
      </div>
      <p className="text-sm leading-relaxed">Your friend scans this in Mootz. Stay within 100 m of each other.</p>
      {locationNote && (
        <p role="alert" className="rounded-2xl bg-white/15 p-3 text-sm font-bold">
          {locationNote}
        </p>
      )}
      <p className="rounded-2xl bg-white/10 px-3 py-3 text-center text-sm font-bold">
        {expired ? "This QR expired. Generate a new one." : urgent ? `${left} seconds left` : "Waiting for your friend…"}
      </p>
      {!expired && onSimulate && <Button icon={ScanLine} variant="secondary" size="lg" block onClick={onSimulate}>Simulate scan</Button>}
      </div>
      </div>
      <p className="mt-auto border-t border-white/15 pt-4 text-[13px] leading-relaxed text-white/80">
        Scanning doesn&apos;t create a friendship. Signatures and a distance check don&apos;t prove presence or that a photo is real.
      </p>
    </>
  );
}
