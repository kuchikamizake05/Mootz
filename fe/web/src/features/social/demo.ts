import type { ApiComment, Page, ReactionItem, SelfieItem } from "./model";

/**
 * Labelled demo fixtures (NEXT_PUBLIC_DEMO_FIXTURES=1). Fictional data, local state only;
 * mutations update this module-level store and never touch the network.
 */
export const DEMO_VIEWER = "demo-viewer";
export const DEMO_MOMENT_A = "00000000-0000-4000-8000-00000000000a";
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

const c = (id: string, authorId: string, body: string | null, minutes: number, parentId: string | null = null, replyToId: string | null = null, replyToAuthorId: string | null = null): ApiComment => ({
  id,
  momentId: DEMO_MOMENT_A,
  authorId,
  parentId,
  replyToId,
  replyToAuthorId,
  body,
  createdAt: ago(minutes),
  deleted: body === null,
});

const comments: ApiComment[] = [
  c("d0000000-0000-4000-8000-000000000001", "demo-c", null, 20),
  c("d0000000-0000-4000-8000-000000000002", DEMO_VIEWER, "Meet after the session?", 3, "d0000000-0000-4000-8000-000000000001", "d0000000-0000-4000-8000-000000000001", "demo-c"),
  c("d0000000-0000-4000-8000-000000000003", "demo-b", "That coffee looks like a good idea.", 5),
  c("d0000000-0000-4000-8000-000000000004", "demo-c", "Perfect little break.", 1),
];

let selfies: SelfieItem[] = [
  { id: "e0000000-0000-4000-8000-000000000001", createdAt: ago(900), thumbnailUrl: "/demo/generated-4.jpg" },
  { id: "e0000000-0000-4000-8000-000000000002", createdAt: ago(800), thumbnailUrl: "/demo/generated-2.jpg" },
];
const reactions: Record<string, ReactionItem[]> = {
  [DEMO_MOMENT_A]: [{ id: "f0000000-0000-4000-8000-000000000001", accountId: DEMO_VIEWER, createdAt: ago(8), thumbnailUrl: "/demo/generated-4.jpg" }],
};

let seq = 100;
const one = <T,>(items: T[]): Page<T> => ({ items, nextCursor: null });

export const demoApi = {
  listComments(momentId: string, parentId: string | null): Page<ApiComment> {
    if (momentId !== DEMO_MOMENT_A) return one([]);
    if (parentId) return one(comments.filter((x) => x.parentId === parentId && !x.deleted));
    const hasLiveReply = (id: string) => comments.some((x) => x.parentId === id && !x.deleted);
    return one(comments.filter((x) => !x.parentId && (!x.deleted || hasLiveReply(x.id))));
  },
  postComment(momentId: string, input: { body: string; parentId?: string }): ApiComment {
    const target = input.parentId ? comments.find((x) => x.id === input.parentId) : undefined;
    seq += 1;
    const next = c(`d0000000-0000-4000-8000-${String(seq).padStart(12, "0")}`, DEMO_VIEWER, input.body.trim(), 0, target ? (target.parentId ?? target.id) : null, target?.id ?? null, target?.authorId ?? null);
    next.momentId = momentId;
    next.createdAt = new Date().toISOString();
    comments.push(next);
    return next;
  },
  deleteComment(commentId: string) {
    const target = comments.find((x) => x.id === commentId && x.authorId === DEMO_VIEWER);
    if (target) Object.assign(target, { body: null, deleted: true });
  },
  listReactions: (momentId: string) => one(reactions[momentId] ?? []),
  putReaction(momentId: string, selfieId: string) {
    const selfie = selfies.find((s) => s.id === selfieId);
    if (!selfie) throw new Error("missing");
    reactions[momentId] = [{ id: `f0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`, accountId: DEMO_VIEWER, createdAt: new Date().toISOString(), thumbnailUrl: selfie.thumbnailUrl }, ...(reactions[momentId] ?? []).filter((r) => r.accountId !== DEMO_VIEWER)];
  },
  deleteReaction(momentId: string) {
    reactions[momentId] = (reactions[momentId] ?? []).filter((r) => r.accountId !== DEMO_VIEWER);
  },
  listSelfies: () => one(selfies),
  addSelfie(blob: Blob): SelfieItem {
    const item = { id: `e0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`, createdAt: new Date().toISOString(), thumbnailUrl: URL.createObjectURL(blob) };
    selfies = [item, ...selfies];
    return item;
  },
  deleteSelfie(id: string) {
    selfies = selfies.filter((s) => s.id !== id);
  },
};
