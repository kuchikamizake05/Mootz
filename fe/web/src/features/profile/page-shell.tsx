"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { env } from "@/lib/env";

/** Full-screen page in a centered column; Close goes back, or to the Map when there is no history. */
export function PageShell({ title, children, header, onBack, showDemoBadge = true }: { title?: string; children: ReactNode; header?: ReactNode; onBack?: () => void; showDemoBadge?: boolean }) {
  const router = useRouter();
  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push("/map");
  };
  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-4 px-6 pb-6 pt-6 lg:py-10">
        <header className="flex min-h-11 items-center gap-2">
          {header ?? <><button type="button" aria-label="Back" onClick={onBack ?? close} className="grid size-11 shrink-0 place-items-center text-mootz-deep"><ArrowLeft size={24} /></button><h1 className="font-display text-[26px] font-extrabold leading-none text-mootz-ink">{title}</h1></>}
        </header>
        {showDemoBadge && env.demoFixtures && (
          <p className="w-fit rounded-full bg-mootz-lilac px-3 py-1 text-xs font-bold text-mootz-deep">Demo fixtures · fictional data</p>
        )}
        {children}
      </div>
    </main>
  );
}
