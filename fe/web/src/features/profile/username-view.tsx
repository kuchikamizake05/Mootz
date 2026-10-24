"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { PageShell } from "./page-shell";
import { useOwnUsername, useSetUsername } from "./queries";
import { USERNAME_RULES, normalizeUsername, safeNext, usernameProblem } from "./username";

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return "That username is taken.";
    if (error.status === 400) return "That username isn't allowed. Try another one.";
    if (error.needsLogin) return "Your session expired. Sign in again, then retry.";
    if (error.status === 0) return "No connection. Check your network and retry.";
  }
  return "Couldn't save your username. Try again.";
}

/** Choose or change the @handle friends use to find you. */
export function UsernameView() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const current = useOwnUsername();
  const save = useSetUsername();
  // null until the user types, so the field starts from the saved value without an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? current ?? "";
  const problem = usernameProblem(value);
  const unchanged = normalizeUsername(value) === current;
  const showProblem = draft !== null && draft !== "" && problem;

  return (
    <PageShell title={current ? "Change username" : "Choose username"} onBack={() => router.push(next)}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (problem || save.isPending) return;
          save.mutate(normalizeUsername(value), { onSuccess: () => router.push(next) });
        }}
      >
        <p className="text-sm text-mootz-muted">Friends find you by your @username. You can change it later.</p>
        <label className="flex flex-col gap-1 text-xs font-bold text-mootz-muted">
          Username
          <span className="flex min-h-12 items-center gap-1 rounded-2xl border border-mootz-hairline bg-white px-4 text-mootz-deep focus-within:outline-2 focus-within:outline-mootz-deep">
            <AtSign aria-hidden size={16} />
            <input
              value={value}
              onChange={(e) => {
                // Lowercase as typed; a pasted "@" is dropped.
                setDraft(e.target.value.replace(/^@/, "").toLowerCase());
                if (save.isError) save.reset();
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              aria-invalid={!!showProblem}
              aria-describedby="username-rules username-msg"
              placeholder="yourname"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold placeholder:font-normal focus:outline-none"
            />
          </span>
        </label>
        <p id="username-rules" className="text-xs text-mootz-muted">{USERNAME_RULES}</p>
        <p id="username-msg" role="alert" className="min-h-4 text-sm font-semibold text-mootz-ink">
          {save.isError ? errorText(save.error) : showProblem || ""}
        </p>
        <Button type="submit" size="lg" block disabled={!!problem || unchanged || save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </PageShell>
  );
}
