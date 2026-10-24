"use client";

import { useState } from "react";
import Link from "next/link";
import { AtSign, Check, Copy, LoaderCircle, TriangleAlert, UserPlus, Users, UserMinus, X, Send, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { Page as PageShell, SectionLabel } from "@/components/ui/page";
import { handleLabel, normalizeUsername, parseFriendTarget } from "@/features/profile/username";
import { useOwnUsername } from "@/features/profile/queries";
import { groupFriends, shortCode, type Relationship } from "./model";
import { useFriendAction, useFriends, useOwnCode, useSendRequest } from "./queries";

function Row({ rel, children, note }: { rel: Relationship; children: React.ReactNode; note?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-3xl border border-mootz-hairline bg-white p-4">
      <Avatar name={handleLabel(rel.username)} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-extrabold leading-tight text-mootz-ink">{handleLabel(rel.username)}</p>
        <p className="text-[13px] font-semibold text-mootz-muted">
          {[note, rel.username ? null : `Code ${shortCode(rel.accountId)}`].filter(Boolean).join(" · ") || "\u00a0"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">{children}</div>
    </li>
  );
}

function AddFriend() {
  const ownCode = useOwnCode();
  const ownUsername = useOwnUsername();
  const send = useSendRequest();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const [touched, setTouched] = useState(false);
  const trimmed = input.trim();
  const target = parseFriendTarget(trimmed);
  const isOwn =
    !!target &&
    ("username" in target ? target.username === ownUsername : !!ownCode && target.accountId === ownCode.toLowerCase());
  const problem = !trimmed ? "Enter your friend's username." : !target ? "That doesn't look like a username." : isOwn ? "That's you." : null;
  // Share the handle when you have one; the account code is the fallback.
  const shareText = ownUsername ? `@${ownUsername}` : ownCode;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText ?? "");
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  };

  const err = send.error instanceof ApiError ? send.error : null;
  const errorText = !send.isError
    ? null
    : err?.status === 404
      ? "No account with that username."
      : err?.status === 409
        ? "They already sent you a request. Accept it from your list."
        : err?.status === 400
          ? "That's you."
          : "Couldn't send the request. Your entry is kept; retrying won't send duplicates.";

  return (
    <section aria-label="Add friend" className="flex flex-col gap-4 rounded-3xl border border-mootz-hairline bg-mootz-surface p-4 sm:p-5">
      <div>
        <h2 className="font-display text-2xl text-mootz-ink">Add friend</h2>
        <p className="mt-1 text-[15px] text-mootz-muted">Share your @username or enter a friend&apos;s @username to send a request. No contact import or chat is included. Scanning a Meet QR never adds a friend.</p>
      </div>
      <div>
        <p className="text-[13px] font-bold text-mootz-muted">{ownUsername ? "Your username" : "Your friend code"}</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-2xl bg-mootz-canvas px-3 py-2 text-sm font-bold text-mootz-deep">{shareText ?? "Loading…"}</code>
          <Button variant="secondary" icon={copied === "yes" ? Check : Copy} disabled={!shareText} onClick={() => void copy()}>
            {copied === "yes" ? "Copied" : "Copy"}
          </Button>
        </div>
        {ownUsername === null && (
          <p className="mt-1 text-[13px] text-mootz-muted">
            <Link href="/profile/username?next=/friends" className="font-bold text-mootz-deep underline">Choose a username</Link> so friends can find you.
          </p>
        )}
        <p aria-live="polite" className="mt-1 min-h-4 text-[13px] text-mootz-muted">
          {copied === "no" ? "Couldn't copy. Select the code and copy it manually." : ""}
        </p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (problem || !target || send.isPending) return;
          send.mutate(target, { onSuccess: () => { setInput(""); setTouched(false); } });
        }}
      >
        <label className="flex flex-col gap-1 text-[13px] font-bold text-mootz-muted">
          Friend&apos;s username
          <span className="flex min-h-12 items-center gap-1 rounded-2xl border border-mootz-hairline bg-white px-4 text-mootz-deep focus-within:outline-2 focus-within:outline-mootz-deep">
            <AtSign aria-hidden size={16} />
            <input
              value={input}
              onChange={(e) => {
                // Lowercase as typed; an account code (UUID) is case-insensitive too.
                setInput(normalizeUsername(e.target.value));
                if (send.isError) send.reset();
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={touched && !!problem}
              aria-describedby="friend-code-msg"
              placeholder="username"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold placeholder:font-normal focus:outline-none"
            />
          </span>
        </label>
        <p id="friend-code-msg" role="alert" className="min-h-4 text-sm font-semibold text-mootz-ink">
          {(touched && problem) || errorText || ""}
        </p>
        <Button type="submit" size="lg" block icon={UserPlus} disabled={send.isPending}>
          {send.isPending ? "Sending…" : "Send request"}
        </Button>
        <div aria-live="polite" className="text-sm text-mootz-muted">
          {send.isSuccess && "Request sent. It takes effect only after they accept."}
        </div>
      </form>
    </section>
  );
}

export function FriendsView() {
  const friends = useFriends();
  const act = useFriendAction();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const busy = (id: string) => act.isPending && act.variables?.accountId === id;
  const g = groupFriends(friends.data ?? []);
  const empty = !friends.isPending && !friends.error && !friends.data?.length;

  let body;
  if (friends.isPending) {
    body = <StateMessage icon={LoaderCircle} busy title="Loading friends…" />;
  } else if (friends.error) {
    body = (
      <StateMessage icon={TriangleAlert} title="Couldn't load friends" actions={<Button icon={RotateCcw} onClick={() => void friends.refetch()}>Retry</Button>}>
        Check your connection and try again.
      </StateMessage>
    );
  } else if (!friends.data?.length) {
    body = (
      <StateMessage
        icon={Users}
        title="No friends yet"
        className="mx-auto w-full max-w-sm flex-1 items-center! justify-center px-4 py-12 text-center"
        actions={<Button icon={UserPlus} size="lg" onClick={() => setAdding(true)}>Add friend</Button>}
      >
        Friends can see each other&apos;s moments. Send a request with their @username.
      </StateMessage>
    );
  } else {
    body = (
      <div className="flex flex-col gap-5">
        {g.incoming.length > 0 && (
          <section aria-label="Requests" className="flex flex-col gap-2">
            <SectionLabel icon={UserPlus}>Requests</SectionLabel>
            <ul className="flex flex-col gap-2">
              {g.incoming.map((r) => (
                <Row key={r.accountId} rel={r} note="Wants to be friends">
                  <Button icon={Check} disabled={act.isPending} aria-label="Accept friend request" onClick={() => act.mutate({ kind: "accept", accountId: r.accountId })}>
                    {busy(r.accountId) ? "…" : "Accept"}
                  </Button>
                  <Button icon={X} variant="secondary" disabled={act.isPending} aria-label="Decline friend request" onClick={() => act.mutate({ kind: "remove", accountId: r.accountId })}>
                    Decline
                  </Button>
                </Row>
              ))}
            </ul>
          </section>
        )}
        {g.outgoing.length > 0 && (
          <section aria-label="Sent requests" className="flex flex-col gap-2">
            <SectionLabel icon={Send}>Sent</SectionLabel>
            <ul className="flex flex-col gap-2">
              {g.outgoing.map((r) => (
                <Row key={r.accountId} rel={r} note="Waiting for them">
                  <Button icon={X} variant="secondary" disabled={act.isPending} aria-label="Cancel friend request" onClick={() => act.mutate({ kind: "remove", accountId: r.accountId })}>
                    Cancel
                  </Button>
                </Row>
              ))}
            </ul>
          </section>
        )}
        <section aria-label="Friends" className="flex flex-col gap-2">
          <h2 className="text-sm font-extrabold text-mootz-deep">Friends · {g.friends.length}</h2>
          {g.friends.length === 0 ? (
            <p className="text-sm text-mootz-muted">No accepted friends yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {g.friends.map((r) =>
                confirm === r.accountId ? (
                  <li key={r.accountId} className="flex flex-col gap-2 rounded-3xl border border-mootz-hairline bg-mootz-surface p-4 sm:p-5">
                    <p className="text-sm font-semibold text-mootz-ink">Remove this friend? You can send a new request later. Your Dots stay.</p>
                    <div className="flex gap-2">
                      <Button icon={UserMinus} disabled={act.isPending} onClick={() => act.mutate({ kind: "remove", accountId: r.accountId }, { onSuccess: () => setConfirm(null) })}>
                        {busy(r.accountId) ? "Removing…" : "Remove"}
                      </Button>
                      <Button icon={Check} variant="secondary" onClick={() => setConfirm(null)}>
                        Keep friend
                      </Button>
                    </div>
                  </li>
                ) : (
                  <Row key={r.accountId} rel={r}>
                    <Button icon={UserMinus} variant="secondary" aria-label={`Remove friend ${shortCode(r.accountId)}`} onClick={() => setConfirm(r.accountId)}>
                      Remove
                    </Button>
                  </Row>
                ),
              )}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <PageShell title={adding ? "Add friend" : "Friends"} onBack={adding ? () => setAdding(false) : undefined}>
      {adding ? (
        <AddFriend />
      ) : (
        <>
          {!empty && (
            <Button icon={UserPlus} size="lg" block onClick={() => setAdding(true)}>
              Add friend
            </Button>
          )}
          <div aria-live="polite" className="sr-only">
            {act.isSuccess ? "Friend list updated" : ""}
          </div>
          {act.isError && (
            <p role="alert" className="rounded-2xl bg-mootz-lilac px-4 py-3 text-sm font-semibold text-mootz-deep">
              {act.error instanceof ApiError && act.error.status === 409 ? "That request changed. Refresh and try again." : "Couldn't update that. Nothing changed. Try again."}
            </p>
          )}
          {body}
        </>
      )}
    </PageShell>
  );
}
