"use client";

import { useRef, useState } from "react";
import { LoaderCircle, MessageCircle, TriangleAlert, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { relativeTime } from "@/features/moments/model";
import { useMoment } from "@/features/moments/queries";
import { CommentRow } from "./comment-row";
import { useDraft } from "./draft";
import { MAX_COMMENT, codePoints, errorCopy, personLabel, type ReplyTarget, type Thread } from "./model";
import { BackLink, SocialPage } from "./page-frame";
import { useDeleteComment, useSendComment, useThread, useViewerId } from "./queries";

function ConfirmDelete({ hasReplies, pending, onConfirm, onCancel }: { hasReplies: boolean; pending: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="alertdialog" aria-labelledby="del-title" aria-describedby="del-desc" className="flex flex-col gap-2 rounded-2xl bg-mootz-surface p-4 shadow-float">
      <h3 id="del-title" className="font-display text-2xl text-mootz-ink">Delete your comment?</h3>
      <p id="del-desc" className="text-sm text-mootz-muted">
        {hasReplies ? "Replies stay in the thread under a “Comment deleted” placeholder." : "This can't be undone."}
      </p>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={onConfirm}>{pending ? "Deleting…" : "Delete"}</Button>
        <Button variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function Composer({
  momentId,
  target,
  onClearTarget,
  onNotice,
  inputRef,
}: {
  momentId: string;
  target: ReplyTarget | null;
  onClearTarget: () => void;
  onNotice: (message: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [text, setDraft] = useDraft(momentId);
  const send = useSendComment(momentId);
  const length = codePoints(text);
  const canSend = text.trim().length > 0 && !send.isPending;

  const submit = () => {
    if (!canSend) return;
    send.mutate(
      { body: text, parentId: target?.commentId },
      {
        onSuccess: () => {
          setDraft("");
          onClearTarget();
          onNotice(target ? "Reply sent." : "Comment sent.");
        },
      },
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 bg-mootz-canvas px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      {target && (
        <p className="flex items-center justify-between gap-2 rounded-2xl bg-mootz-lilac pl-4 text-sm text-mootz-deep">
          <span className="truncate">Replying to {target.label}</span>
          <IconButton icon={X} label="Cancel reply" onClick={onClearTarget} className="shadow-none" />
        </p>
      )}
      <div className="flex flex-col gap-2 rounded-[22px] border border-mootz-purple bg-mootz-surface p-3">
        <label htmlFor="comment-input" className="sr-only">{target ? `Reply to ${target.label}` : "Write a comment"}</label>
        <textarea
          id="comment-input"
          ref={inputRef}
          rows={2}
          value={text}
          placeholder={target ? "Write a reply…" : "Write a comment…"}
          onChange={(e) => setDraft(Array.from(e.target.value).slice(0, MAX_COMMENT).join(""))}
          className="w-full resize-none bg-transparent text-[15px] text-mootz-ink outline-none placeholder:text-mootz-muted"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-mootz-muted" aria-live="polite">
            {length} / {MAX_COMMENT}
            {length >= MAX_COMMENT && " · 500 character limit"}
          </p>
          <Button type="submit" variant="secondary" disabled={!canSend}>{send.isPending ? "Sending…" : send.isError ? "Retry send" : "Send"}</Button>
        </div>
      </div>
      {send.isError && (
        <p role="alert" className="text-sm font-bold text-mootz-ink">
          Your comment couldn&apos;t send. {errorCopy(send.error, "Sending")} Your text is kept.
        </p>
      )}
    </form>
  );
}

function ThreadView({
  thread,
  viewerId,
  onReply,
  onDelete,
  confirming,
  setConfirming,
  deleting,
}: {
  thread: Thread;
  viewerId: string | undefined;
  onReply: (target: ReplyTarget) => void;
  onDelete: (id: string) => void;
  confirming: string | null;
  setConfirming: (id: string | null) => void;
  deleting: boolean;
}) {
  const { root, replies } = thread;
  const row = (c: Thread["root"]) => (
    <div key={c.id} className="flex flex-col gap-2">
      <CommentRow
        comment={c}
        viewerId={viewerId}
        onReply={() => onReply({ commentId: c.id, label: personLabel(c.authorId, viewerId) })}
        onDelete={() => setConfirming(c.id)}
      />
      {confirming === c.id && (
        <ConfirmDelete hasReplies={c.id === root.id && replies.length > 0} pending={deleting} onConfirm={() => onDelete(c.id)} onCancel={() => setConfirming(null)} />
      )}
    </div>
  );
  return (
    <li className="flex flex-col gap-3 border-b border-mootz-hairline pb-4">
      {root.deleted ? (
        <div className="flex flex-col gap-0.5 px-2 py-1">
          <p className="text-[15px] font-bold text-mootz-ink">Comment deleted</p>
          <p className="text-xs text-mootz-muted">Replies remain in this thread. {relativeTime(root.createdAt)}</p>
        </div>
      ) : (
        row(root)
      )}
      {replies.length > 0 && (
        <ul className="ml-3 flex flex-col gap-4 border-l-[3px] border-mootz-purple pl-3" aria-label="Replies">
          {replies.map((r) => (
            <li key={r.id}>{row(r)}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function CommentsView({ momentId, onClose }: { momentId: string; onClose?: () => void }) {
  const moment = useMoment(momentId).data;
  const viewerId = useViewerId();
  const thread = useThread(momentId);
  const del = useDeleteComment(momentId);
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const roots = thread.threads.filter((t) => !t.root.deleted).length;
  const replyCount = thread.count - roots;

  const reply = (t: ReplyTarget) => {
    setTarget(t);
    setNotice("");
    inputRef.current?.focus();
  };
  const remove = (id: string) =>
    del.mutate(id, {
      onSuccess: () => {
        setConfirming(null);
        setNotice("Comment deleted.");
        if (target?.commentId === id) setTarget(null);
      },
    });

  return (
    <SocialPage>
      <div className="flex items-center gap-1 font-display text-[26px] font-extrabold"><BackLink href={`/moments/${momentId}`} label="Comments" onBack={onClose} /><span aria-label="Comment count">{thread.isPending ? "" : `${thread.count}${thread.hasMore ? "+" : ""}`}</span></div>
      <div className="flex flex-col gap-1">
        <h1 className="sr-only">Comments</h1>
        <p className="text-xs text-mootz-muted">
          {thread.isPending
            ? "Loading…"
            : `${roots} ${roots === 1 ? "comment" : "comments"} + ${replyCount} ${replyCount === 1 ? "reply" : "replies"}${thread.hasMore ? " loaded so far" : ""}. Deleted comments aren't counted.`}
        </p>
      </div>
      {moment && (
        <p className="flex items-center gap-3 rounded-2xl bg-mootz-lilac p-3 text-sm text-mootz-deep">
          <Avatar src={moment.author.avatarSrc} name={moment.author.name} size={40} frame={moment.author.frame} />
          <span className="min-w-0">
            <span className="block truncate font-bold">{moment.author.name}</span>
            <span className="block truncate">{moment.caption ?? "Moment"}</span>
          </span>
        </p>
      )}
      <p className="sr-only" aria-live="polite">{notice}</p>
      {notice && <p aria-hidden className="text-sm font-bold text-mootz-deep">{notice}</p>}
      {del.isError && (
        <p role="alert" className="text-sm font-bold text-mootz-ink">{errorCopy(del.error, "Deleting")}</p>
      )}

      <div className="flex-1">
        {thread.isPending ? (
          <StateMessage icon={LoaderCircle} busy title="Loading comments…" />
        ) : thread.error ? (
          <StateMessage icon={TriangleAlert} title="Couldn't load comments" actions={<Button onClick={thread.refetch}>Retry</Button>}>
            {errorCopy(thread.error, "Loading comments")}
          </StateMessage>
        ) : thread.threads.length === 0 ? (
          <StateMessage icon={MessageCircle} title="No comments yet">Be the first to say something.</StateMessage>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {thread.threads.map((t) => (
                <ThreadView
                  key={t.root.id}
                  thread={t}
                  viewerId={viewerId}
                  onReply={reply}
                  onDelete={remove}
                  confirming={confirming}
                  setConfirming={setConfirming}
                  deleting={del.isPending}
                />
              ))}
            </ul>
            {thread.repliesLoading && <p role="status" className="mt-3 text-xs text-mootz-muted">Loading replies…</p>}
            {thread.repliesError && (
              <p role="alert" className="mt-3 text-sm text-mootz-muted">
                Some replies couldn&apos;t load. <button className="font-extrabold underline" onClick={thread.refetch}>Retry</button>
              </p>
            )}
            {thread.hasMore && (
              <Button variant="secondary" block className="mt-4" disabled={thread.fetchingMore} onClick={() => void thread.fetchMore()}>
                {thread.fetchingMore ? "Loading…" : "Load more comments"}
              </Button>
            )}
          </>
        )}
      </div>

      <Composer momentId={momentId} target={target} onClearTarget={() => setTarget(null)} onNotice={setNotice} inputRef={inputRef} />
    </SocialPage>
  );
}
