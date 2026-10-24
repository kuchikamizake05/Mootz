"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/features/moments/model";
import { personLabel, type ApiComment } from "./model";

/** One live comment or reply. Only the author gets Delete. */
export function CommentRow({
  comment,
  viewerId,
  onReply,
  onDelete,
}: {
  comment: ApiComment;
  viewerId: string | undefined;
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const name = personLabel(comment.authorId, viewerId);
  const own = comment.authorId === viewerId;
  return (
    <article className="flex flex-col gap-1.5" aria-label={`Comment by ${name}`}>
      <div className="flex items-center gap-2">
        <Avatar name={name} size={32} />
        <p className="text-sm font-black text-mootz-ink">{name}</p>
        <p className="text-xs text-mootz-muted">{relativeTime(comment.createdAt)}</p>
      </div>
      {comment.replyToId && comment.replyToAuthorId && comment.parentId !== comment.replyToId && (
        <p className="text-xs text-mootz-muted">Replying to {personLabel(comment.replyToAuthorId, viewerId)}</p>
      )}
      <p className="whitespace-pre-wrap break-words text-[15px] font-semibold text-mootz-ink">{comment.body}</p>
      {(onReply || (own && onDelete)) && (
        <div className="flex gap-2">
          {onReply && (
            <Button variant="secondary" onClick={onReply} aria-label={`Reply to ${name}`}>
              Reply
            </Button>
          )}
          {own && onDelete && (
            <Button variant="secondary" onClick={onDelete} aria-label="Delete your comment">
              Delete
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
