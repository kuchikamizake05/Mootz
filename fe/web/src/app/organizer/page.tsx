import type { Metadata } from "next";
import { Suspense } from "react";
import { OrganizerRoute } from "@/features/organizer/organizer-route";

export const metadata: Metadata = { title: "Demo Gathering B" };

export default function OrganizerPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-mootz-canvas" aria-busy="true" />}>
      <OrganizerRoute />
    </Suspense>
  );
}
