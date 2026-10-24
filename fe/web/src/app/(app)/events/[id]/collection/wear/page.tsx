"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { WearView } from "@/features/events/wear-view";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <WearView id={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
