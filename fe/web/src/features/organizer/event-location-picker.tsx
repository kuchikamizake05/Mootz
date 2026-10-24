"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useState } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { addCollapsedAttribution } from "@/features/map/attribution";
import { getCamera } from "@/features/map/camera-store";

/** Venue coordinates are deliberately public; never reuse participant verification locations. */
export function EventLocationPicker({ disabled }: { disabled: boolean }) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [failed, setFailed] = useState(false);
  const container = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({ container: node, style: "https://tiles.openfreemap.org/styles/positron", center: getCamera().center, zoom: 14, attributionControl: false });
    } catch { setFailed(true); return; }
    addCollapsedAttribution(instance, "bottom-left");
    instance.on("error", () => setFailed(true));
    instance.on("style.load", () => setFailed(false));
    setMap(instance);
    return () => { setMap(null); instance.remove(); };
  }, []);

  useEffect(() => {
    if (!map || disabled) return;
    const select = ({ lngLat }: { lngLat: { lat: number; lng: number } }) => {
      setLatitude(lngLat.lat.toFixed(6));
      setLongitude((((lngLat.lng + 180) % 360 + 360) % 360 - 180).toFixed(6));
    };
    map.on("click", select);
    return () => { map.off("click", select); };
  }, [map, disabled]);

  useEffect(() => {
    const lat = Number(latitude); const lng = Number(longitude);
    if (!map || !latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const marker = new Marker().setLngLat([lng, lat]).addTo(map);
    map.easeTo({ center: [lng, lat], duration: 300 });
    return () => { marker.remove(); };
  }, [map, latitude, longitude]);

  return <div className="flex flex-col gap-2">
    <p id="event-location-label" className="text-sm font-bold">Event location</p>
    <p id="event-location-help" className="text-sm text-mootz-muted">Tap the map to place the venue pin, or enter coordinates. This location will be visible to everyone who can view the event.</p>
    <div ref={container} role="region" aria-labelledby="event-location-label" style={{ height: 240 }} className="overflow-hidden rounded-2xl" />
    {failed && <p role="status" className="text-sm text-mootz-muted">Map preview unavailable. You can still enter the venue coordinates below.</p>}
    <div className="grid grid-cols-2 gap-3">
      <label className="flex min-w-0 flex-col gap-1 text-sm font-bold">Latitude<input name="latitude" type="number" step="any" min={-90} max={90} required value={latitude} onChange={e => setLatitude(e.target.value)} aria-describedby="event-location-help" className="min-h-12 w-full rounded-2xl border border-mootz-hairline px-3 py-2 text-base" /></label>
      <label className="flex min-w-0 flex-col gap-1 text-sm font-bold">Longitude<input name="longitude" type="number" step="any" min={-180} max={180} required value={longitude} onChange={e => setLongitude(e.target.value)} aria-describedby="event-location-help" className="min-h-12 w-full rounded-2xl border border-mootz-hairline px-3 py-2 text-base" /></label>
    </div>
  </div>;
}
