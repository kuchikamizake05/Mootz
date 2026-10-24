"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, CircleCheck, Copy, Images, RefreshCw } from "lucide-react";
import { Page, StatusChip } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { useProfile } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { eventPhase, formatDateTime, errorCode } from "./model";
import { Card, Loading, LoadFailed } from "./parts";
import { useCheckIn, useDemoCheckIn, useEvent, useNow } from "./queries";

function DemoCodeForm({ id }: { id: string }) {
  const submit = useDemoCheckIn(id);
  const [code, setCode] = useState("");
  const invalid = submit.isError && errorCode(submit.error) === "CODE_INVALID";
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) submit.mutate(code);
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 rounded-[22px] border-2 border-mootz-purple bg-mootz-surface px-4 py-2.5">
        <span className="text-[13px] font-bold text-mootz-deep">Event code</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby="code-help"
          placeholder="Enter organizer code"
          className="bg-transparent text-[17px] font-bold text-mootz-ink outline-none placeholder:text-mootz-muted"
        />
      </label>
      <p id="code-help" role={invalid ? "alert" : undefined} className="text-sm font-semibold text-mootz-muted">
        {invalid ? "That code isn't valid for this event. Check it with the organizer." : "Demo code: DEMO-A."}
      </p>
      <Button icon={Check} type="submit" size="lg" block disabled={!code.trim() || submit.isPending}>
        {submit.isPending ? "Checking…" : "Check code"}
      </Button>
    </form>
  );
}

/** Check-in (08.05). The live API records attendance through the organizer; there is no self-service code endpoint. */
export function CheckInView({ id }: { id: string }) {
  const router = useRouter();
  const event = useEvent(id);
  const checkIn = useCheckIn(id);
  const profile = useProfile();
  const now = useNow();
  const [copied, setCopied] = useState(false);

  if (event.isPending) return <Loading label="Loading check-in" />;
  if (event.isError) return <LoadFailed error={event.error} onRetry={() => void event.refetch()} />;
  const e = event.data;
  const phase = eventPhase(e, now);
  const done = checkIn.data?.checkedIn === true;
  const accountId = env.demoFixtures ? null : profile.data?.id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountId ?? "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Page title={done ? "You're checked in" : "Check-in required"} subtitle={e.title} backLabel="Back to collectible" onBack={() => router.push(`/events/${id}/collection`)}>

      <StatusChip tone={done ? "success" : "pending"}>{done ? "Checked in" : "Check-in required"}</StatusChip>
      {done ? (
        <Card className="bg-mootz-lilac">
          <p className="flex items-center gap-2 font-bold text-mootz-deep">
            <CircleCheck aria-hidden size={20} />
            Check-in recorded{checkIn.data?.checkedInAt ? ` · ${formatDateTime(checkIn.data.checkedInAt)}` : ""}
          </p>
          <p className="text-sm text-mootz-muted">This makes you eligible to ask for the collectible. It is not a claim and not ownership.</p>
          <ButtonLink icon={ArrowRight} href={`/events/${id}/collection`} block className="mt-3">
            Go to collectible
          </ButtonLink>
        </Card>
      ) : env.demoFixtures ? (
        <DemoCodeForm id={id} />
      ) : (
        <Card>
          <p className="text-sm text-mootz-ink">
            The organizer records attendance during the event. Ask them to check you in, then refresh this page.
          </p>
          {phase !== "live" && (
            <p className="text-sm font-semibold text-mootz-muted">
              {phase === "upcoming" ? "The event hasn't started; check-in can't be recorded yet." : "The event has ended; new check-ins can't be recorded."}
            </p>
          )}
          {accountId && (
            <div className="mt-2">
              <p className="text-[13px] font-bold text-mootz-muted">Your account code (share it with the organizer)</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-2xl bg-mootz-canvas px-3 py-2 text-[13px] font-bold text-mootz-deep">{accountId}</code>
                <Button icon={copied ? Check : Copy} variant="secondary" onClick={() => void copy()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
          {checkIn.isError && (
            <p role="alert" className="mt-2 text-sm font-semibold text-mootz-deep">
              Couldn&apos;t check your status right now. This doesn&apos;t mean you aren&apos;t checked in.
            </p>
          )}
          <Button icon={RefreshCw} variant="secondary" block className="mt-3" disabled={checkIn.isFetching} onClick={() => void checkIn.refetch()}>
            {checkIn.isFetching ? "Checking…" : "Refresh check-in status"}
          </Button>
        </Card>
      )}

      <p className="text-sm font-semibold text-mootz-muted">
        A valid check-in makes you eligible to ask for the collectible; claiming still needs organizer authorization. A code or your location alone does not prove physical attendance or human uniqueness.
      </p>
      <ButtonLink icon={Images} href="/feed?filter=events" variant="secondary" block>
        Back to event moments
      </ButtonLink>
      <p className="text-[13px] font-semibold text-mootz-muted">
        Checking in submits no claim; nothing is minted and your balance is unchanged.{env.demoFixtures ? " Demo fixture." : ""}
      </p>
    </Page>
  );
}
