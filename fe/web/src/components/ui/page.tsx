"use client";

import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";

export function Page({ title, subtitle, actions, children, onBack, backHref = "/map", backLabel = "Back", showDemoBadge = true, className, contentClassName }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
  showDemoBadge?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const router = useRouter();
  const backClass = "grid size-11 shrink-0 place-items-center rounded-full text-mootz-deep transition-colors hover:bg-mootz-lilac";
  return (
    <main className={cn("min-h-dvh bg-mootz-canvas text-mootz-ink", className)}>
      <div className={cn("mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-5 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] text-[15px] leading-relaxed sm:px-6 lg:py-8", contentClassName)}>
        <header className="flex min-h-11 items-start gap-3">
          {onBack ? <button type="button" aria-label={backLabel} title={backLabel} className={backClass} onClick={onBack}><ArrowLeft aria-hidden size={24} /></button> :
            <button type="button" aria-label={backLabel} title={backLabel} className={backClass} onClick={() => window.history.length > 1 ? router.back() : router.push(backHref)}><ArrowLeft aria-hidden size={24} /></button>}
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="font-display text-[30px] font-extrabold leading-tight sm:text-[32px]">{title}</h1>
            {subtitle && <div className="mt-1 text-sm leading-relaxed text-mootz-muted">{subtitle}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        {showDemoBadge && env.demoFixtures && <p className="w-fit rounded-full border border-mootz-hairline bg-white px-3 py-1 text-xs font-bold text-mootz-deep">Demo fixtures · fictional data</p>}
        {children}
      </div>
    </main>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-mootz-hairline bg-mootz-surface p-4 sm:p-5", className)} {...props} />;
}

export function SectionLabel({ icon: Icon, children, className, ...props }: ComponentProps<"h2"> & { icon?: LucideIcon }) {
  return <h2 className={cn("flex items-center gap-2 text-sm font-extrabold text-mootz-deep", className)} {...props}>{Icon && <Icon aria-hidden size={18} className="shrink-0" />}{children}</h2>;
}

export function InfoRow({ icon: Icon, label, children, className }: { icon: LucideIcon; label?: ReactNode; children: ReactNode; className?: string }) {
  return <div className={cn("flex items-start gap-3 text-sm leading-relaxed", className)}><Icon aria-hidden size={20} className="mt-0.5 shrink-0 text-mootz-deep" /><div className="min-w-0 flex-1 break-words">{label && <p className="text-[13px] font-bold text-mootz-muted">{label}</p>}<div>{children}</div></div></div>;
}

const tones = {
  brand: "bg-mootz-lilac text-mootz-deep",
  success: "bg-emerald-50 text-emerald-800",
  pending: "bg-amber-50 text-amber-900",
  muted: "bg-mootz-canvas text-mootz-muted",
  warning: "bg-red-50 text-red-800",
};
const toneIcons = { brand: Info, success: Check, pending: Clock3, muted: Info, warning: TriangleAlert };

export function StatusChip({ tone = "brand", icon, children, className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof tones; icon?: LucideIcon }) {
  const Icon = icon ?? toneIcons[tone];
  return <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold leading-5", tones[tone], className)} {...props}><Icon aria-hidden size={14} className="shrink-0" /><span>{children}</span></span>;
}

export function QuietButton({ icon: Icon, children, className, danger = false, ...props }: ComponentProps<"button"> & { icon: LucideIcon; danger?: boolean }) {
  return <button type="button" className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-colors disabled:opacity-50", danger ? "text-red-800 hover:bg-red-50" : "text-mootz-deep hover:bg-mootz-lilac", className)} {...props}><Icon aria-hidden size={18} className="shrink-0" />{children}</button>;
}
