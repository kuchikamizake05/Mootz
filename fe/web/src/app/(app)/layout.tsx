import { AuthGate } from "@/features/shell/auth-gate";
import { PresenceProvider } from "@/features/presence/provider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AuthGate><PresenceProvider>{children}</PresenceProvider></AuthGate>;
}
