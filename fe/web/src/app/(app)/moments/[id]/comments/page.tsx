"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CommentsView } from "@/features/social/comments-view";

function Route() {
  const { id } = useParams<{ id: string }>();
  return <CommentsView momentId={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Route />
    </Suspense>
  );
}
