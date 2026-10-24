import { Suspense } from "react";
import { MapView } from "@/features/map/map-view";

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapView />
    </Suspense>
  );
}
