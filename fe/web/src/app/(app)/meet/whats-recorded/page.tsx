import { Suspense } from "react";
import { WhatsRecorded } from "@/features/meet/onboarding/whats-recorded";

export default function Page() {
  return (
    <Suspense>
      <WhatsRecorded />
    </Suspense>
  );
}
