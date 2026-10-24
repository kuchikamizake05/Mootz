"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/features/profile/switch";
import { env } from "@/lib/env";
import { presenceCopy, useLocationSharing, usePresenceStatus } from "./provider";

export function LocationSharingCard() {
  const { query, mutation } = useLocationSharing();
  const status = usePresenceStatus();
  return (
    <section aria-label="Location sharing" className="rounded-[22px] border border-mootz-hairline bg-mootz-canvas p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-mootz-ink">Share my location with friends</h2>
        <Switch label="Share my location with friends" checked={!env.demoFixtures && query.data?.enabled === true}
          disabled={env.demoFixtures || !query.data || mutation.isPending}
          onChange={enabled => mutation.mutate(enabled)} />
      </div>
      <p className="mt-2 text-sm text-mootz-muted">Automatically updates every 5 seconds while Mootz is visible. Only accepted friends see your approximate area, without a photo. No background tracking or onchain location.</p>
      <p className="mt-2 text-xs font-semibold text-mootz-deep" role="status">
        {env.demoFixtures ? "Preview only · no location is collected." : query.isError ? "Could not load location sharing." : query.isPending ? "Loading location sharing…" : presenceCopy[status]}
      </p>
      <p className="mt-1 text-xs text-mootz-muted">Positions expire within 60 seconds without an update. Turning this off removes your shared position.</p>
      {query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Retry</Button>}
      {mutation.isError && <p role="alert" className="mt-2 text-sm text-mootz-ink">Could not save this change. Please retry; sharing has not been confirmed off.</p>}
    </section>
  );
}
