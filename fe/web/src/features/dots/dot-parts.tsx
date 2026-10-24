"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { Dot } from "./model";
import { personName } from "@/features/profile/username";
import { PageShell } from "@/features/profile/page-shell";

/** Centered column on desktop; full-width on phones. */
export function DotsPage({ title, children }: { title: string; children: ReactNode }) {
  return <PageShell title={title}>{children}</PageShell>;
}

/** The participant who is not the viewer; the label is their @username or "Friend". */
export function otherParticipant(dot: Pick<Dot, "participants" | "participantUsernames">, viewerId: string | undefined) {
  const index = dot.participants.findIndex((id) => id !== viewerId);
  const at = index === -1 ? 1 : index;
  return { id: dot.participants[at], username: dot.participantUsernames[at] ?? null };
}

/** Two participants; the viewer is "You", the other is their @username or "Friend". */
export function ParticipantPair({ dot, viewerId, size = 52 }: { dot: Pick<Dot, "participants" | "participantUsernames">; viewerId: string | undefined; size?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {dot.participants.map((id, i) => (
        <Avatar key={id} name={personName({ id, username: dot.participantUsernames[i], viewerId })} size={size} />
      ))}
    </span>
  );
}
