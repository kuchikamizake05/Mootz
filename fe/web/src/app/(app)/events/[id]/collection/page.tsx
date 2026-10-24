"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CollectionView } from "@/features/events/collection-view";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <CollectionView id={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
