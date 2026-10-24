import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "Components", robots: { index: false } };

// Development-only review page for comparing components with pen.dev boards A.01–A.05 and B.01.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
