"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ReactView } from "@/features/social/react-view";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <ReactView momentId={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
