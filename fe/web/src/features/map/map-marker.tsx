"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";

/**
 * A DOM marker whose content is rendered by React through a portal. React's key keeps one
 * stable element per moment, and DOM markers survive `setStyle`, so no duplicates appear.
 */
export function MapMarker({
  map,
  latitude,
  longitude,
  zIndex,
  children,
}: {
  map: MapLibreMap;
  latitude: number;
  longitude: number;
  zIndex?: number;
  children: ReactNode;
}) {
  const [el] = useState(() => document.createElement("div"));
  // MapLibre needs a position before addTo(); later moves go through setLngLat below.
  const [marker] = useState(() => new Marker({ element: el }).setLngLat([longitude, latitude]));

  useEffect(() => {
    marker.addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, marker]);

  useEffect(() => {
    marker.setLngLat([longitude, latitude]);
  }, [marker, latitude, longitude]);

  useEffect(() => {
    marker.getElement().style.zIndex = String(zIndex ?? 0);
  }, [marker, zIndex]);

  return createPortal(children, el);
}
