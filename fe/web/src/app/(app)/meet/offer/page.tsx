import { Suspense } from "react";
import { PosterFlow } from "@/features/meet/poster/poster-flow";

export default function Page() {
  return (
    <Suspense>
      <PosterFlow />
    </Suspense>
  );
}
