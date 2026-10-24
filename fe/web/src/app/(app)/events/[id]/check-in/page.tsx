"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CheckInView } from "@/features/events/check-in-view";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <CheckInView id={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
