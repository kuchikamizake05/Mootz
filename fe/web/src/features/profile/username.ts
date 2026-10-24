/** Mirrors the backend: server trims and lowercases, then requires ^[a-z0-9_]{3,20}$. */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const USERNAME_RULES = "3 to 20 characters: lowercase letters, numbers and underscores.";

/** What the input holds: no leading "@", lowercase, no surrounding spaces. */
export const normalizeUsername = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase();

/** Client-side check only; the server stays the source of truth (reserved names, uniqueness). */
export function usernameProblem(raw: string): string | null {
  const name = normalizeUsername(raw);
  if (!name) return "Enter a username.";
  if (name.length < 3) return "Use at least 3 characters.";
  if (name.length > 20) return "Use at most 20 characters.";
  if (!USERNAME_RE.test(name)) return "Use only lowercase letters, numbers and underscores.";
  return null;
}

/** "@handle" for a known username, otherwise a neutral fallback. Never invents a name. */
export const handleLabel = (username: string | null | undefined, fallback = "Friend") => (username ? `@${username}` : fallback);

/** Inline reference inside a sentence ("You and @a were here"). */
export const friendRef = (username: string | null | undefined) => (username ? `@${username}` : "your friend");

/** The viewer is always "You"; everyone else is their @handle or the fallback. */
export function personName(opts: { id: string; username: string | null | undefined; viewerId: string | undefined; fallback?: string }) {
  return opts.id === opts.viewerId ? "You" : handleLabel(opts.username, opts.fallback);
}

/** Same-origin path only, so `next` can't redirect off-site (`//host`, `/\host`, schemes). */
export function safeNext(next: string | null | undefined, fallback = "/profile"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Add-friend input: a UUID is an account code (fallback), anything else is a username. */
export type FriendTarget = { accountId: string } | { username: string };
export function parseFriendTarget(raw: string): FriendTarget | null {
  const text = raw.trim();
  if (UUID.test(text)) return { accountId: text.toLowerCase() };
  return usernameProblem(text) ? null : { username: normalizeUsername(text) };
}
