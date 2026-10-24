"use client";

import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "./page-shell";
import { useRecordMeet } from "./queries";
import { Switch } from "./switch";

export function SettingsView() {
  const record = useRecordMeet();
  const { mutation } = record;
  const on = record.value ?? false;
  return (
    <PageShell title="Profile settings">
      <section className="flex flex-col gap-4 rounded-[28px] bg-mootz-surface p-4 shadow-float">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-mootz-ink">Save my Meets onchain</h2>
          <Switch label="Save my Meets onchain" checked={on} disabled={record.value === undefined || mutation.isPending} onChange={(next) => mutation.mutate(next)} />
        </div>
        <p className="text-sm text-mootz-muted">
          {on
            ? "Future Meets are recorded on Monad when both of you allow it. Your Dots exist either way."
            : "Future Meets stay in Mootz only. You still get Dots, and you can turn this on any time."}
        </p>
        <p className="text-sm font-semibold text-mootz-ink">Applies to future Meets only. Onchain records can&apos;t be removed.</p>
        <p aria-live="polite" role={mutation.isError ? "alert" : undefined} className="min-h-4 text-sm text-mootz-muted">
          {mutation.isError ? "Couldn't change this setting. It stays as it was." : record.loadError ? "Couldn't load this setting." : ""}
        </p>
      </section>
      <ButtonLink href="/profile" size="lg" block>
        Done
      </ButtonLink>
    </PageShell>
  );
}
