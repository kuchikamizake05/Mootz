import { Suspense } from "react";
import { FriendsView } from "@/features/friends/friends-view";

export default function FriendsPage() {
  return (
    <Suspense>
      <FriendsView />
    </Suspense>
  );
}
