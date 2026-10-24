import { Suspense } from "react";
import { UsernameView } from "@/features/profile/username-view";

export default function ProfileUsernamePage() {
  return (
    <Suspense>
      <UsernameView />
    </Suspense>
  );
}
