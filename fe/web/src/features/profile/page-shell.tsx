"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { env } from "@/lib/env";

/** Full-screen page in a centered column; Close goes back, or to the Map when there is no history. */
export function PageShell({ title, children, header }: { title?: string; children: ReactNode; header?: ReactNode }) {
  const router = useRouter();
  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push("/map");
  };
  return (
    <main className="min-h-dvh bg-mootz-canvas">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-10 pt-4 lg:py-10">
        <header className="flex min-h-11 items-center justify-between gap-3">
          {header ?? <h1 className="font-display text-[32px] leading-none text-mootz-ink">{title}</h1>}
          <IconButton icon={X} label="Close" onClick={close} className="ml-auto" />
        </header>
        {env.demoFixtures && (
          <p className="w-fit rounded-full bg-mootz-lilac px-3 py-1 text-xs font-bold text-mootz-deep">Demo fixtures · fictional data</p>
        )}
        {children}
      </div>
    </main>
  );
}
