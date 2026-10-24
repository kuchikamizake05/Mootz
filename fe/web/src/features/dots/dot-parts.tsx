"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { PageShell } from "@/features/profile/page-shell";

/** Centered column on desktop; full-width on phones. */
export function DotsPage({ title, children }: { title: string; children: ReactNode }) {
  return <PageShell title={title}>{children}</PageShell>;
}

/** Two participants; the viewer is "You". Other accounts have no public name yet. */
export function ParticipantPair({ participants, viewerId, size = 52 }: { participants: string[]; viewerId: string | undefined; size?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {participants.map((id) => (
        <Avatar key={id} name={id === viewerId ? "You" : "Friend"} size={size} />
      ))}
    </span>
  );
}
