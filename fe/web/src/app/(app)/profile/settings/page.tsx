import { Suspense } from "react";
import { SettingsView } from "@/features/profile/settings-view";

export default function ProfileSettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
