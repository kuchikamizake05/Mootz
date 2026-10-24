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
    <Link href={href} aria-label={typeof children === "string" && children.trim() ? children : "Back"} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold text-mootz-deep">
      <span className="grid size-11 shrink-0 place-items-center"><ArrowLeft aria-hidden size={24} strokeWidth={2.25} /></span>
      {children}
    </Link>
  );
}

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`flex flex-col gap-2 rounded-[22px] border border-mootz-hairline bg-mootz-surface p-4 ${className}`}>{children}</section>
);

export function Loading({ label }: { label: string }) {
  return (
    <PageShell title="Event">
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
