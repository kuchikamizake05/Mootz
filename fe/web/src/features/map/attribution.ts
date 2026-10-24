import { AttributionControl, type ControlPosition, type Map as MapLibreMap } from "maplibre-gl";

/**
 * Map credits as a small "i" button that expands on tap. MapLibre's compact control
 * starts expanded, so close it once the map has loaded; the credits stay one tap away.
 */
export function addCollapsedAttribution(map: MapLibreMap, position: ControlPosition) {
  const control = new AttributionControl({ compact: true });
  map.addControl(control, position);
  map.once("load", () => {
    const node = map.getContainer().querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
    node?.classList.remove("maplibregl-compact-show");
    node?.removeAttribute("open");
  });
  return control;
}
