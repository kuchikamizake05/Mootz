"use client";

import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { isMissing } from "./model";
import { useEvent } from "./queries";

/** Event tag on a moment (08.03). Opening it shows details only; it never grants photo access or a claim. */
export function EventChip({ eventId, className }: { eventId: string; className?: string }) {
  const event = useEvent(eventId);
  if (isMissing(event.error)) return null;
  const name = event.data?.title;
  return (
    <Link href={`/events/${eventId}`} className={cn(buttonClass({ variant: "secondary", block: true }), className)}>
      {name ? `${name} · Event details` : "Event details"}
    </Link>
  );
}
