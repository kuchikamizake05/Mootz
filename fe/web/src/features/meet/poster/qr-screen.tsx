"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { useMoment } from "@/features/moments/queries";
import { cn } from "@/lib/cn";
import { DemoBadge } from "../ui/meet-frame";
import { QrImage } from "../ui/qr-image";

const RING = 2 * Math.PI * 26;

function Countdown({ left, total }: { left: number; total: number }) {
  const urgent = left > 0 && left <= 10;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="flex items-center justify-center gap-4">
      <svg aria-hidden viewBox="0 0 60 60" className={cn("size-[60px] -rotate-90", urgent && "motion-safe:animate-pulse")}>
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
      <span aria-hidden className={cn("font-display text-[44px] leading-none tabular-nums", urgent && "text-white")}>
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
  onClose,
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
      {demo && <DemoBadge />}
      <h2 className="font-display text-[34px] leading-none">Show this to your friend</h2>
      <Countdown left={left} total={total} />

      <div className="rounded-[28px] bg-white p-3 text-mootz-ink">
        {expired ? (
          <div className="grid aspect-square w-full place-items-center rounded-2xl bg-mootz-lilac text-mootz-deep">
            <p className="flex items-center gap-2 text-lg font-extrabold">
              <Clock aria-hidden size={22} /> Expired
            </p>
          </div>
        ) : (
          <QrImage text={text} label={demo ? "Demo QR, not scannable" : "Meet QR for your friend to scan"} className="rounded-2xl" />
        )}
        {demo && <p className="mt-2 text-center text-xs font-bold text-mootz-muted">Demo QR · Not scannable</p>}
      </div>

      <div className="flex items-center gap-3">
        <Photo src={moment?.backSrc} alt="" className="size-[76px] shrink-0 rounded-2xl" />
        <div className="min-w-0 text-sm font-extrabold">
          <p>You · {moment?.postedLabel ?? "Your moment"}</p>
          {moment?.caption && <p className="truncate font-normal text-white/80">{moment.caption}</p>}
        </div>
      </div>

      <p className="text-lg leading-tight">Your friend scans this in Mootz. Stay within 100 m of each other.</p>
      {locationNote && (
        <p role="alert" className="rounded-2xl bg-white/15 p-3 text-sm font-bold">
          {locationNote}
        </p>
      )}
      <p className="text-[15px] font-bold">
        {expired ? "This QR expired. Generate a new one." : urgent ? `${left} seconds left` : "Waiting for your friend…"}
      </p>

      <div className="flex flex-col gap-2">
        {expired ? (
          <Button variant="secondary" size="lg" block onClick={onNewQr}>
            New QR
          </Button>
        ) : (
          <>
            {onSimulate && (
              <Button variant="secondary" size="lg" block onClick={onSimulate}>
                Simulate scan
              </Button>
            )}
            <Button variant="secondary" size="lg" block onClick={onClose}>
              Close
            </Button>
          </>
        )}
      </div>
      <p className="text-xs font-bold text-white/80">
        Scanning doesn&apos;t create a friendship. Signatures and a distance check don&apos;t prove presence or that a photo is real.
      </p>
    </>
  );
}
