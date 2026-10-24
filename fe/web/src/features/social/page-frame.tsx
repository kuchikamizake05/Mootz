"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";

/** Full-screen social page: centered column on desktop, full width on phones. */
export function SocialPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh bg-mootz-canvas">
      <div className={cn("mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-4 px-4 pt-4 lg:py-10", className)}>
        {env.demoFixtures && (
          <p className="w-fit rounded-full bg-mootz-lilac px-3 py-1 text-xs font-bold text-mootz-deep">Demo fixtures · fictional data</p>
        )}
        {children}
      </div>
    </main>
  );
}

/** History back, falling back to the Feed when the page was opened directly. */
export function BackButton({ fallback = "/feed", label = "Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={cn(buttonClass({ variant: "secondary", block: true }))}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ArrowLeft aria-hidden size={19} strokeWidth={2.25} />
      {label}
    </button>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={buttonClass({ variant: "secondary", block: true })}>
      <ArrowLeft aria-hidden size={19} strokeWidth={2.25} />
      {label}
    </Link>
  );
}
