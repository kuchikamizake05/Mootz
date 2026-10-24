import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { StateMessage } from "@/components/ui/status";
import type { LocationFailure } from "../location";

const copy: Record<LocationFailure, { title: string; body: string }> = {
  denied: {
    title: "Location is off.",
    body: "Allow location for Mootz in your browser settings, then try again.",
  },
  unavailable: { title: "Couldn't find your location.", body: "Move to open sky or turn on precise location, then try again." },
  timeout: { title: "Location took too long.", body: "Check that location is on, then try again." },
  unsupported: { title: "This browser can't share location.", body: "Use your phone's browser to Meet." },
};

export function isLocationFailure(value: unknown): value is LocationFailure {
  return typeof value === "string" && value in copy;
}

/** Meet needs one foreground location check from each phone. Nothing is stored or tracked. */
export function LocationRecovery({ reason, actions }: { reason: LocationFailure; actions: ReactNode }) {
  const { title, body } = copy[reason];
  return (
    <StateMessage icon={MapPin} title={title} actions={actions}>
      <p>{body}</p>
      <p className="mt-2">Meet uses one foreground location check per attempt. No background tracking, and your coordinates aren&apos;t shown or stored on this device.</p>
    </StateMessage>
  );
}
