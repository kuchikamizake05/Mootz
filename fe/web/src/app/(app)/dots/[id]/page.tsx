"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { DotDetail } from "@/features/dots/dot-detail";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <DotDetail id={id} />;
}

export default function DotPage() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
