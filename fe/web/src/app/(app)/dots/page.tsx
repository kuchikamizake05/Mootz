import { Suspense } from "react";
import { DotsList } from "@/features/dots/dots-list";

export default function DotsPage() {
  return (
    <Suspense>
      <DotsList />
    </Suspense>
  );
}
