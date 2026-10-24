"use client";

import { useSearchParams } from "next/navigation";
import { OrganizerDemo } from "./organizer-demo";
import { parseCollectionId } from "./logic";

export function OrganizerRoute() {
  const raw = useSearchParams().getAll("collection");
  const id = parseCollectionId(raw.length === 0 ? undefined : raw.length === 1 ? raw[0] : raw);
  return <OrganizerDemo collectionId={id === null ? null : id.toString()} />;
}
