import { Suspense } from "react";
import { ScannerFlow } from "@/features/meet/scanner/scanner-flow";

export default function Page() {
  return (
    <Suspense>
      <ScannerFlow />
    </Suspense>
  );
}
