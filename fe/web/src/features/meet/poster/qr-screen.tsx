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
    <div className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 lg:h-auto lg:justify-start lg:bg-transparent">
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
      <span aria-hidden className={cn("font-display text-[30px] lg:text-[60px] leading-none tabular-nums", urgent && "text-white")}>
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
      <h2 className="font-display text-[32px] leading-none lg:hidden">Show this to your friend</h2>
      <div className="contents lg:grid lg:grid-cols-[388px_1fr] lg:gap-7">
      <div className="lg:hidden"><Countdown left={left} total={total} /></div>
      <div className="mx-auto flex h-[264px] w-full max-w-[342px] flex-col items-center justify-center rounded-[28px] bg-white p-5 text-mootz-ink [&_svg]:size-[192px] lg:row-span-5 lg:flex lg:h-[430px] lg:max-w-none lg:flex-col lg:justify-center lg:p-8 lg:[&_svg]:size-[294px]">
        {expired ? (
          <div className="grid aspect-square w-full place-items-center rounded-2xl bg-mootz-lilac text-mootz-deep">
            <p className="flex items-center gap-2 text-lg font-extrabold">
              <Clock aria-hidden size={22} /> Expired
            </p>
          </div>
        ) : (
          <QrImage text={text} label={demo ? "Demo QR, not scannable" : "Meet QR for your friend to scan"} className="rounded-2xl" />
        )}
        {demo && <p className="mx-auto mt-2 w-fit rounded-full bg-white px-2.5 py-0.5 text-center text-[13px] font-bold text-mootz-muted">Demo QR · Not scannable</p>}
      </div>
      <div className="hidden lg:flex lg:flex-col lg:gap-4">
        <Countdown left={left} total={total} />
        <p className="text-[15px] font-bold">60-second signed Offer · One scanner</p>
      </div>
      <div className="flex items-center gap-3 lg:flex-col lg:items-start">
        <Photo src={moment?.backSrc} alt="" className="h-[60px] w-[68px] shrink-0 rounded-2xl lg:h-[182px] lg:w-full lg:rounded-[20px]" />
        <div className="min-w-0 text-sm font-extrabold lg:hidden">
          <p>You · {moment?.postedLabel ?? "Your moment"}</p>
          {moment?.caption && <p className="truncate font-normal text-white/80">{moment.caption}</p>}
        </div>
      </div>
      <p className="text-sm leading-[1.4] lg:text-lg">Your friend scans this in Mootz. Stay within 100 m of each other.</p>
      {locationNote && (
        <p role="alert" className="rounded-2xl bg-white/15 p-3 text-sm font-bold">
          {locationNote}
        </p>
      )}
      <p className="rounded-2xl bg-white/10 px-3 py-3 text-center text-[13px] font-bold lg:bg-transparent lg:p-0 lg:text-left lg:text-base">
        {expired ? "This QR expired. Generate a new one." : urgent ? `${left} seconds left` : "Waiting for your friend…"}
      </p>
      <div className="flex flex-col gap-2">
        {expired ? (
          <Button icon={RotateCcw} variant="secondary" size="lg" block onClick={onNewQr}>
            New QR
          </Button>
        ) : (
          <>
            {onSimulate && (
              <Button icon={ScanLine} variant="secondary" size="lg" block onClick={onSimulate}>
                Simulate scan
              </Button>
            )}
          </>
        )}
      </div>
      </div>
      <p className="mt-auto text-[13px] font-bold text-white/80">
        Scanning doesn&apos;t create a friendship. Signatures and a distance check don&apos;t prove presence or that a photo is real.
      </p>
    </>
  );
}
