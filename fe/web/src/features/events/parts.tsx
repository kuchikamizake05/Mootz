"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, SearchX, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { PageShell } from "@/features/profile/page-shell";
import { isMissing, isUnavailable } from "./model";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold text-mootz-deep">
      <ArrowLeft aria-hidden size={18} strokeWidth={2.25} />
      {children}
    </Link>
  );
}

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`flex flex-col gap-1 rounded-[28px] bg-mootz-surface p-4 shadow-float ${className}`}>{children}</section>
);

export function Loading({ label }: { label: string }) {
  return (
    <PageShell header={<span />}>
      <StateMessage icon={LoaderCircle} busy title={label} />
    </PageShell>
  );
}

/** Not found vs unavailable vs other failure for a page-level query. */
export function LoadFailed({ error, onRetry, backHref = "/map" }: { error: unknown; onRetry: () => void; backHref?: string }) {
  const missing = isMissing(error);
  return (
    <PageShell header={<BackLink href={backHref}>Back</BackLink>}>
      <StateMessage
        icon={missing ? SearchX : TriangleAlert}
        title={missing ? "Event not found" : "Couldn't load this"}
        actions={missing ? undefined : <Button variant="secondary" onClick={onRetry}>Try again</Button>}
      >
        {missing
          ? "This event doesn't exist or isn't available to you."
          : isUnavailable(error)
            ? "The service is unavailable right now. Nothing here means you own or lack anything. Try again shortly."
            : "Check your connection and try again."}
      </StateMessage>
    </PageShell>
  );
}
