"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";

/** Full-screen social page: centered column on desktop, full width on phones. */
export function SocialPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh bg-white">
      <div className={cn("mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-4 px-6 pt-6 lg:py-10", className)}>
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
      aria-label={label}
      className="flex min-h-11 items-center gap-2 text-sm font-extrabold text-mootz-deep"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <span className="grid size-11 place-items-center"><ArrowLeft aria-hidden size={24} strokeWidth={2.25} /></span>
      {label}
    </button>
  );
}

export function BackLink({ href, label, onBack }: { href: string; label: string; onBack?: () => void }) {
  const content = <><span className="grid size-11 place-items-center"><ArrowLeft aria-hidden size={24} strokeWidth={2.25} /></span>{label}</>;
  const className = "flex min-h-11 items-center gap-2 text-sm font-extrabold text-mootz-deep";
  if (onBack) return <button type="button" onClick={onBack} className={className}>{content}</button>;
  return (
    <Link href={href} className={className}>{content}</Link>
  );
}
