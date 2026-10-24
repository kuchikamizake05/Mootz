"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { env } from "@/lib/env";

/** Centered column on desktop; full-width on phones. */
export function DotsPage({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <main className="min-h-dvh bg-mootz-canvas">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-10 pt-4 lg:py-10">
        <header className="flex min-h-11 items-center justify-between gap-3">
          <h1 className="font-display text-[32px] leading-none text-mootz-ink">{title}</h1>
          <IconButton icon={X} label="Close" onClick={() => router.back()} />
        </header>
        {env.demoFixtures && (
          <p className="w-fit rounded-full bg-mootz-lilac px-3 py-1 text-xs font-bold text-mootz-deep">Demo fixtures · fictional data</p>
        )}
        {children}
      </div>
    </main>
  );
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
