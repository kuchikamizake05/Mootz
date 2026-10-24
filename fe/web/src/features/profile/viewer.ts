import { env } from "@/lib/env";
import { demoViewer } from "@/features/moments/demo";
import { useProfile } from "@/lib/api/use-api";

/** Real avatars come from the authenticated profile, never another account's local state. */
export function useViewerIdentity() {
  const profile = useProfile();
  return env.demoFixtures ? { name: demoViewer.name, avatarSrc: demoViewer.avatarSrc } : { name: "You", avatarSrc: profile.data?.avatarUrl ?? null };
}
