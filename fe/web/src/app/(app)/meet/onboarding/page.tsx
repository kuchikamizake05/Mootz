import { Suspense } from "react";
import { OnboardingScreen } from "@/features/meet/onboarding/onboarding-screen";

export default function Page() {
  return (
    <Suspense>
      <OnboardingScreen />
    </Suspense>
  );
}
