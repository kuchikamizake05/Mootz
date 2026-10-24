"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AttributionControl, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { MapPinOff } from "lucide-react";
import { PhotoMomentMarker } from "@/components/ui/map-markers";
import type { MomentCard } from "@/features/moments/model";
import { MapMarker } from "./map-marker";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/**
 * Desktop Feed companion (10.02): a small map following the moment in view. It shows the
 * posting place only — never where the friend is now. Moments without a shared location
 * get a note instead of a pin.
 */
export function SupportingMap({ moment, onOpen }: { moment: MomentCard | undefined; onOpen: (id: string) => void }) {
  const router = useRouter();
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!node) return;
    setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    const instance = new MapLibreMap({
      container: node,
      style: MAP_STYLE,
      center: [110.3775, -7.7713],
      zoom: 15,
      attributionControl: false,
    });
    instance.addControl(new AttributionControl({ compact: true }), "bottom-left");
    instance.on("load", () => setMap(instance));
    return () => {
      setMap(null);
      instance.remove();
    };
  }, [node]);

  const location = moment?.location;
  useEffect(() => {
    if (map && location) map.easeTo({ center: [location.longitude, location.latitude], zoom: 15.5, duration: 400 });
  }, [map, location]);

  return (
    <aside aria-label="Where this moment was posted" className="flex flex-col gap-3">
      {moment && (
        <div className="rounded-2xl bg-mootz-surface px-4 py-3 shadow-soft">
          <p className="font-black text-mootz-ink">{moment.author.name}&apos;s moment</p>
          <p className="text-sm text-mootz-muted">
            {moment.place ? `${moment.place} · ` : ""}
            {moment.postedLabel}
          </p>
        </div>
      )}
      <div className="relative h-[520px] overflow-hidden rounded-[28px] bg-mootz-canvas">
        <div ref={setNode} className="size-full" />
        {map && moment && location && (
          <MapMarker map={map} latitude={location.latitude} longitude={location.longitude}>
            <PhotoMomentMarker
              author={moment.author.name}
              avatarSrc={moment.author.avatarSrc}
              frame={moment.author.frame}
              photoSrc={moment.backSrc}
              selected
              onClick={() => onOpen(moment.id)}
            />
          </MapMarker>
        )}
        {moment && !location && (
          <div className="absolute inset-0 grid place-items-center bg-mootz-canvas/85 p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-mootz-muted">
              <MapPinOff aria-hidden size={28} className="text-mootz-deep" />
              <p className="font-display text-2xl text-mootz-ink">Location not shared</p>
              <p className="text-sm">No pin. This moment stays in Feed.</p>
            </div>
          </div>
        )}
      </div>
      <div>
        <p className="font-display text-2xl text-mootz-ink">Two photos. One shared moment.</p>
        <p className="text-sm text-mootz-muted">This pin marks where the moment was posted, not where your friend is now.</p>
        {moment?.location && (
          <button type="button" className="mt-2 min-h-11 text-sm font-extrabold text-mootz-deep underline" onClick={() => router.push(`/map?moment=${moment.id}`)}>
            Open in Map
          </button>
        )}
      </div>
    </aside>
  );
}
