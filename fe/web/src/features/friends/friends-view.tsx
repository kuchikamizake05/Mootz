"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, TriangleAlert, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { PageShell } from "@/features/profile/page-shell";
import { UUID, groupFriends, shortCode, type Relationship } from "./model";
import { useFriendAction, useFriends, useOwnCode, useSendRequest } from "./queries";

function Row({ rel, children, note }: { rel: Relationship; children: React.ReactNode; note?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-[28px] bg-mootz-surface p-3 shadow-float">
      <Avatar name="Friend" size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-tight text-mootz-ink">Friend</p>
        <p className="text-xs font-semibold text-mootz-muted">
          {note ? `${note} · ` : ""}Code {shortCode(rel.accountId)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">{children}</div>
    </li>
  );
}

function AddFriend({ onDone }: { onDone: () => void }) {
  const own = useOwnCode();
  const send = useSendRequest();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const [touched, setTouched] = useState(false);
  const trimmed = code.trim();
  const valid = UUID.test(trimmed);
  const isOwn = !!own && trimmed.toLowerCase() === own.toLowerCase();
  const problem = !trimmed ? "Enter your friend's code." : !valid ? "That doesn't look like a friend code." : isOwn ? "That's your own code." : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(own ?? "");
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  };

  const err = send.error instanceof ApiError ? send.error : null;
  const errorText = !send.isError
    ? null
    : err?.status === 404
      ? "No account matches that code. Check it and try again."
      : err?.status === 409
        ? "They already sent you a request. Accept it from your list."
        : err?.status === 400
          ? "That code can't be used."
          : "Couldn't send the request. Your code is kept; retrying won't send duplicates.";

  return (
    <section aria-label="Add friend" className="flex flex-col gap-4 rounded-[28px] bg-mootz-surface p-4 shadow-float">
      <div>
        <h2 className="font-display text-2xl text-mootz-ink">Add friend</h2>
        <p className="mt-1 text-sm text-mootz-muted">Share your code or enter a friend&apos;s code to send a request. No contact import or chat is included. Scanning a Meet QR never adds a friend.</p>
      </div>
      <div>
        <p className="text-xs font-bold text-mootz-muted">Your friend code</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-2xl bg-mootz-canvas px-3 py-2 text-xs font-bold text-mootz-deep">{own ?? "Loading…"}</code>
          <Button variant="secondary" icon={copied === "yes" ? Check : Copy} disabled={!own} onClick={() => void copy()}>
            {copied === "yes" ? "Copied" : "Copy"}
          </Button>
        </div>
        <p aria-live="polite" className="mt-1 min-h-4 text-xs text-mootz-muted">
          {copied === "no" ? "Couldn't copy. Select the code and copy it manually." : ""}
        </p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (problem || send.isPending) return;
          send.mutate(trimmed, { onSuccess: () => { setCode(""); setTouched(false); } });
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-bold text-mootz-muted">
          Friend code
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (send.isError) send.reset();
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={touched && !!problem}
            aria-describedby="friend-code-msg"
            placeholder="Paste a friend code"
            className="min-h-12 rounded-2xl border border-mootz-hairline bg-white px-4 text-sm font-bold text-mootz-deep placeholder:font-normal"
          />
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
      <Button variant="secondary" block onClick={onDone}>
        Back to friends
      </Button>
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

  let body;
  if (friends.isPending) {
    body = <StateMessage icon={LoaderCircle} busy title="Loading friends…" />;
  } else if (friends.error) {
    body = (
      <StateMessage icon={TriangleAlert} title="Couldn't load friends" actions={<Button onClick={() => void friends.refetch()}>Retry</Button>}>
        Check your connection and try again.
      </StateMessage>
    );
  } else if (!friends.data?.length) {
    body = (
      <StateMessage icon={Users} title="No friends yet" actions={<Button icon={UserPlus} onClick={() => setAdding(true)}>Add friend</Button>}>
        Friends can see each other&apos;s moments. Send a request with a friend code.
      </StateMessage>
    );
  } else {
    body = (
      <div className="flex flex-col gap-5">
        {g.incoming.length > 0 && (
          <section aria-label="Requests" className="flex flex-col gap-2">
            <h2 className="text-sm font-extrabold text-mootz-deep">Requests</h2>
            <ul className="flex flex-col gap-2">
              {g.incoming.map((r) => (
                <Row key={r.accountId} rel={r} note="Wants to be friends">
                  <Button disabled={act.isPending} aria-label="Accept friend request" onClick={() => act.mutate({ kind: "accept", accountId: r.accountId })}>
                    {busy(r.accountId) ? "…" : "Accept"}
                  </Button>
                  <Button variant="secondary" disabled={act.isPending} aria-label="Decline friend request" onClick={() => act.mutate({ kind: "remove", accountId: r.accountId })}>
                    Decline
                  </Button>
                </Row>
              ))}
            </ul>
          </section>
        )}
        {g.outgoing.length > 0 && (
          <section aria-label="Sent requests" className="flex flex-col gap-2">
            <h2 className="text-sm font-extrabold text-mootz-deep">Sent</h2>
            <ul className="flex flex-col gap-2">
              {g.outgoing.map((r) => (
                <Row key={r.accountId} rel={r} note="Waiting for them">
                  <Button variant="secondary" disabled={act.isPending} aria-label="Cancel friend request" onClick={() => act.mutate({ kind: "remove", accountId: r.accountId })}>
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
                  <li key={r.accountId} className="flex flex-col gap-2 rounded-[28px] bg-mootz-surface p-4 shadow-float">
                    <p className="text-sm font-semibold text-mootz-ink">Remove this friend? You can send a new request later. Your Dots stay.</p>
                    <div className="flex gap-2">
                      <Button disabled={act.isPending} onClick={() => act.mutate({ kind: "remove", accountId: r.accountId }, { onSuccess: () => setConfirm(null) })}>
                        {busy(r.accountId) ? "Removing…" : "Remove"}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirm(null)}>
                        Keep friend
                      </Button>
                    </div>
                  </li>
                ) : (
                  <Row key={r.accountId} rel={r}>
                    <Button variant="secondary" aria-label={`Remove friend ${shortCode(r.accountId)}`} onClick={() => setConfirm(r.accountId)}>
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
    <PageShell title={adding ? "Add friend" : "Friends"}>
      {adding ? (
        <AddFriend onDone={() => setAdding(false)} />
      ) : (
        <>
          <Button icon={UserPlus} size="lg" block onClick={() => setAdding(true)}>
            Add friend
          </Button>
          <div aria-live="polite" className="sr-only">
            {act.isSuccess ? "Friend list updated" : ""}
          </div>
          {act.isError && (
            <p role="alert" className="rounded-2xl bg-mootz-lilac px-4 py-3 text-sm font-semibold text-mootz-deep">
              {act.error instanceof ApiError && act.error.status === 409 ? "That request changed. Refresh and try again." : "Couldn't update that. Nothing changed. Try again."}
            </p>
          )}
          {body}
          <ButtonLink href="/profile" variant="secondary" block>
            Back to profile
          </ButtonLink>
        </>
      )}
    </PageShell>
  );
}
