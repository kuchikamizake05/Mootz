"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "./page-shell";
import { useRecordMeet } from "./queries";
import { Switch } from "./switch";
import { LocationSharingCard } from "@/features/presence/sharing-card";

export function SettingsView() {
  const record = useRecordMeet();
  const { mutation } = record;
  const router = useRouter();
  const [draft, setDraft] = useState<boolean | null>(null);
  const on = draft ?? record.value ?? false;
  return (
    <PageShell title="Meet settings" showDemoBadge={false} onBack={() => { setDraft(null); router.push("/profile"); }}>
      <section className="flex flex-1 flex-col items-center gap-4 pt-2">
        <LocationSharingCard />
        <span className="grid size-14 place-items-center rounded-2xl bg-mootz-canvas text-mootz-deep"><SlidersHorizontal size={26} /></span>
        <h2 className="text-center font-display text-[38px] font-extrabold leading-none">Your Meets,<br />your choice.</h2>
        <p className="text-center text-base text-mootz-muted">Choose what goes onchain.<br />Your Dot is created either way.</p>
        <div className="w-full rounded-2xl border border-mootz-hairline bg-mootz-canvas p-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-bold text-mootz-ink">Save my Meets onchain</p><p className="mt-1 text-xs text-mootz-muted">Applies after Save</p></div>
          <Switch label="Save my Meets onchain" checked={on} disabled={record.value === undefined || mutation.isPending} onChange={setDraft} />
        </div>
        </div>
        <p className="text-sm text-mootz-muted">Both people must choose ON to make the wallet pair and Meet time public. Photos and location stay offchain.</p>
        <p className="text-sm text-mootz-muted">Applies to future Meets only. Past Dots and onchain records stay unchanged.</p>
        <details className="w-full text-sm text-mootz-deep"><summary className="cursor-pointer text-center font-bold">What&apos;s recorded?</summary><p className="pt-3 text-mootz-muted">The public record includes both wallets and the Meet time. Photos, location and private Dots stay offchain.</p></details>
        <p aria-live="polite" role={mutation.isError ? "alert" : undefined} className="min-h-4 text-sm text-mootz-muted">
          {mutation.isError ? "Couldn't change this setting. It stays as it was." : record.loadError ? "Couldn't load this setting." : ""}
        </p>
      </section>
      <Button size="lg" block disabled={record.value === undefined || mutation.isPending} onClick={() => mutation.mutate(on, { onSuccess: () => { setDraft(null); router.push("/profile"); } })}>{mutation.isPending ? "Saving…" : "Save"}</Button>
      <p className="text-center text-xs text-mootz-muted">Only saved changes affect future Meets.</p>
    </PageShell>
  );
}
