import { env } from "@/lib/env";
import { demoViewer } from "@/features/moments/demo";
import { useProfile } from "@/lib/api/use-api";
import { handleLabel } from "./username";
import { useOwnUsername } from "./queries";

/**
 * The viewer is always "You". `username` is undefined while the profile loads, null when none is
 * chosen. `avatarName` feeds avatar initials/alt text: the @handle when known. Real avatars come
 * from the authenticated profile, never another account's local state.
 */
export function useViewerIdentity() {
  const profile = useProfile();
  const username = useOwnUsername();
  return {
    name: "You",
    username,
    avatarName: handleLabel(username, "You"),
    avatarSrc: env.demoFixtures ? demoViewer.avatarSrc : (profile.data?.avatarUrl ?? null),
  };
}
