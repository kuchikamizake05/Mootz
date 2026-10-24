"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/ui/button";
import { jsonBody } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { useMeetWallet } from "@/features/wallet/use-meet-wallet";
import { DemoBadge, MeetFrame } from "../ui/meet-frame";
import { closeFlow, safeNext } from "../ui/nav";

type Save = (recordMeet: boolean) => Promise<void>;

export function OnboardingScreen() {
  return env.demoFixtures ? <Onboarding save={async () => {}} demo /> : <RealOnboarding />;
}

function RealOnboarding() {
  const wallet = useMeetWallet();
  const api = useApi();
  const queryClient = useQueryClient();
  const save: Save = async (recordMeet) => {
    await wallet.setRecordMeet(recordMeet);
    await api("/v1/me/onboarding", jsonBody({}));
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  };
  return <Onboarding save={save} />;
}

function Onboarding({ save, demo }: { save: Save; demo?: boolean }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  // Design default is ON; nothing is saved until the user presses Continue.
  const [on, setOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const onContinue = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await save(on);
      router.replace(next);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <MeetFrame title="Your Meets, your choice" onClose={() => closeFlow(router)}>
      {demo && <DemoBadge />}
      <LockKeyhole aria-hidden size={48} strokeWidth={2} className="text-mootz-deep" />
      <h2 className="font-display whitespace-pre-line font-extrabold text-[38px] leading-[1.05]">{"Save your Meets\nonchain forever?"}</h2>
      <p className="text-[16px] leading-[1.4] text-mootz-muted">
        Anyone can see which wallets met and when. Photos and location stay private.
      </p>

      <div className="flex min-h-[88px] items-center justify-between gap-3 rounded-2xl bg-mootz-surface p-4">
        <div id="record-label">
          <p className="text-sm font-extrabold">Save my Meets onchain</p>
          <p className="text-xs text-mootz-muted">Applies to future Meets only.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="record-label"
          onClick={() => setOn(!on)}
          className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", on ? "bg-mootz-deep" : "bg-mootz-hairline")}
        >
          <span aria-hidden className={cn("absolute top-1 size-6 rounded-full bg-white transition-all", on ? "left-7" : "left-1")} />
        </button>
      </div>

      <p className="text-sm text-mootz-muted">
        {on
          ? "This is optional. A Meet still creates a Dot when saving is off. A record is saved only if both people choose ON."
          : "Saving is off. Meets still create a Dot, and nothing is saved onchain."}
      </p>

      <div className="mt-auto flex flex-col gap-3">
        <Button size="lg" block disabled={busy} onClick={onContinue}>
          {busy ? "Saving…" : "Continue"}
        </Button>
        <ButtonLink variant="secondary" size="lg" block href="/meet/whats-recorded">
          Learn more
        </ButtonLink>
      </div>
      <p role="alert" className="text-sm font-bold text-mootz-deep">
        {failed ? "Couldn't save your choice. Nothing was changed. Try again." : ""}
      </p>
      <p className="text-xs font-bold text-mootz-muted">
        Onchain records can&apos;t be removed. You can change this choice for future Meets.
      </p>
    </MeetFrame>
  );
}
