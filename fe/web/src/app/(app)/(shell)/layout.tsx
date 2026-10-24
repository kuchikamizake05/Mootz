import { Suspense } from "react";
import { AppShell } from "@/features/shell/app-shell";

export default function ShellLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
