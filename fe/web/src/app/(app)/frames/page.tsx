import { Suspense } from "react";
import { FramesView } from "@/features/frames/frames-view";

export default function FramesPage() {
  return (
    <Suspense>
      <FramesView />
    </Suspense>
  );
}
