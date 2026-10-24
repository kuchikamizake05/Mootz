import { Suspense } from "react";
import { AcceptFlow } from "@/features/meet/accept/accept-flow";

export default function Page() {
  return (
    <Suspense>
      <AcceptFlow />
    </Suspense>
  );
}
