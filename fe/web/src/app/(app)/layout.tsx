import { AuthGate } from "@/features/shell/auth-gate";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AuthGate>{children}</AuthGate>;
}
