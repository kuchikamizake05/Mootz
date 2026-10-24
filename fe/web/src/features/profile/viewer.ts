import { env } from "@/lib/env";
import { demoViewer } from "@/features/moments/demo";

/** The API exposes no names or avatars, so only the demo viewer has either. */
export function useViewerIdentity() {
  return env.demoFixtures ? { name: demoViewer.name, avatarSrc: demoViewer.avatarSrc } : { name: "You", avatarSrc: null };
}
