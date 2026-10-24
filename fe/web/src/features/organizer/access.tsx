"use client";

import type { ReactNode } from "react";
import { CalendarDays, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { PageShell } from "@/features/profile/page-shell";
import { env } from "@/lib/env";
import { useOrganizerAccess } from "./event-queries";

export function OrganizerAccess({ children }: { children: ReactNode }) {
  const { profile, access } = useOrganizerAccess();
  if (env.demoFixtures) return <PageShell title="Organizer tools"><StateMessage icon={ShieldCheck} title="Use a live organizer account">Event creation and attendance recording need an approved account connected to the backend. Demo fixtures cannot create events.</StateMessage></PageShell>;
  if (profile.isError || access.isError) return <PageShell title="Organizer tools"><StateMessage icon={TriangleAlert} title="Couldn't check organizer access" actions={<Button onClick={() => void (profile.isError ? profile.refetch() : access.refetch())}>Try again</Button>}>Your access could not be checked. Try again shortly.</StateMessage></PageShell>;
  if (profile.isPending || access.isPending) return <PageShell title="Organizer tools"><StateMessage icon={LoaderCircle} busy title="Checking organizer access" /></PageShell>;
  if (!access.data.enabled) return <PageShell title="Organizer tools"><StateMessage icon={ShieldCheck} title="Organizer access required">Ask the Mootz event team to approve your account before creating events or recording attendance.</StateMessage><p className="text-sm text-mootz-muted">Your account code</p><code className="break-all rounded-2xl bg-mootz-canvas p-3 text-sm text-mootz-deep">{profile.data.id}</code><ButtonLink href="/profile" variant="secondary">Back to profile</ButtonLink></PageShell>;
  return children;
}

export function OrganizerLink() {
  const { access } = useOrganizerAccess();
  return access.data?.enabled && !env.demoFixtures ? <ButtonLink href="/organizer/events" variant="secondary" icon={CalendarDays} block>Manage events</ButtonLink> : null;
}
