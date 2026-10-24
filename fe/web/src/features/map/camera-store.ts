export type MapCamera = { center: [number, number]; zoom: number; bearing: number };
export type BasemapKind = "map" | "satellite";

/** UGM campus. */
const defaultCamera: MapCamera = { center: [110.3775, -7.7713], zoom: 15, bearing: 0 };

/*
 * Session-only view state kept at module level so leaving Map for Feed and coming back
 * restores the same camera and basemap. Deliberately not persisted across sessions.
 */
let camera = defaultCamera;
let basemap: BasemapKind = "map";

export const getCamera = () => camera;
export const saveCamera = (next: MapCamera) => {
  camera = next;
};
export const getBasemap = () => basemap;
export const saveBasemap = (next: BasemapKind) => {
  basemap = next;
};
