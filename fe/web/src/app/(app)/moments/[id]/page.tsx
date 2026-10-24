"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { MomentDetail } from "@/features/social/moment-detail";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <MomentDetail id={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
