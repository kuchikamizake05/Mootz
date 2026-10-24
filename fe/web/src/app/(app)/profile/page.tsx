import { Suspense } from "react";
import { ProfileView } from "@/features/profile/profile-view";

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileView />
    </Suspense>
  );
}
