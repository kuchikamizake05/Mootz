"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { EventDetails } from "@/features/events/event-details";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <EventDetails id={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
