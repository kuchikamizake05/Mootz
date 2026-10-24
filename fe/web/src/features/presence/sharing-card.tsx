"use client";

import { Button } from "@/components/ui/button";
import { Card, SectionLabel, StatusChip } from "@/components/ui/page";
import { MapPin, RefreshCw } from "lucide-react";
import { Switch } from "@/features/profile/switch";
import { env } from "@/lib/env";
import { presenceCopy, useLocationSharing, usePresenceStatus } from "./provider";

export function LocationSharingCard() {
  const { query, mutation } = useLocationSharing();
  const status = usePresenceStatus();
  return (
    <Card role="region" aria-label="Location sharing">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel icon={MapPin}>Share my location with friends</SectionLabel>
        <Switch label="Share my location with friends" checked={!env.demoFixtures && query.data?.enabled === true}
          disabled={env.demoFixtures || !query.data || mutation.isPending}
          onChange={enabled => mutation.mutate(enabled)} />
      </div>
      <p className="mt-2 text-sm text-mootz-muted">Automatically updates every 5 seconds while Mootz is visible. Only accepted friends see your approximate area, without a photo. No background tracking or onchain location.</p>
      <p className="mt-3" role="status"><StatusChip tone={query.isError ? "warning" : "muted"}>
        {env.demoFixtures ? "Preview only · no location is collected." : query.isError ? "Could not load location sharing." : query.isPending ? "Loading location sharing…" : presenceCopy[status]}
      </StatusChip></p>
      <p className="mt-1 text-[13px] text-mootz-muted">Positions expire within 60 seconds without an update. Turning this off removes your shared position.</p>
      {query.isError && <Button icon={RefreshCw} variant="secondary" className="mt-4" onClick={() => void query.refetch()}>Retry</Button>}
      {mutation.isError && <p role="alert" className="mt-2 text-sm text-mootz-ink">Could not save this change. Please retry; sharing has not been confirmed off.</p>}
    </Card>
  );
}
