import { Suspense } from "react";
import { AppShell } from "@/features/shell/app-shell";

// The shell is client-rendered behind the auth gate; it can block rather than ship a
// prerendered instant-navigation shell (Cache Components).
export const instant = false;

export default function ShellLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
