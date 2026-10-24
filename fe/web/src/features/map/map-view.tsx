"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AttributionControl, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { Layers, LoaderCircle, LocateFixed, LocateOff, Map as MapIcon, MapPinOff, Users, X } from "lucide-react";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { AvatarMomentMarker, MeetDotMarker, PhotoMomentMarker, YourLocationDot } from "@/components/ui/map-markers";
import { MomentSheet, Sheet } from "@/components/ui/moment";
import { StateMessage } from "@/components/ui/status";
import { useMapDots } from "@/features/dots/queries";
import { useMoment, useMoments } from "@/features/moments/queries";
import { canStartMeet, type MomentCard } from "@/features/moments/model";
import { EventChip } from "@/features/events/event-chip";
import { useViewState } from "@/features/shell/view-state";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { getBasemap, getCamera, saveBasemap, saveCamera, type BasemapKind } from "./camera-store";
import { MapMarker } from "./map-marker";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const satelliteStyle = () => `https://api.maptiler.com/maps/satellite/style.json?key=${env.mapTilerKey}`;
const styleUrl = (kind: BasemapKind) => (kind === "satellite" && env.mapTilerKey ? satelliteStyle() : MAP_STYLE);

type Phase = "loading" | "ready" | "error";
type Locate = { state: "idle" | "pending" } | { state: "error"; denied: boolean };

const card = "pointer-events-auto rounded-3xl bg-mootz-surface p-4 shadow-float";

export function MapView() {
  const router = useRouter();
  const { filter, momentId, href } = useViewState();
  const moments = useMoments("map", filter);
  const dots = useMapDots();
  const selectedQuery = useMoment(momentId);

  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [basemap, setBasemap] = useState<BasemapKind>(() => (env.mapTilerKey ? getBasemap() : "map"));
  const [phase, setPhase] = useState<Phase>("loading");
  const [styleOpen, setStyleOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [locate, setLocate] = useState<Locate>({ state: "idle" });
  const [you, setYou] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  // Latest values for map event handlers created once.
  const phaseRef = useRef<Phase>("loading");
  const basemapRef = useRef(basemap);
  const mapRef = useRef<MapLibreMap | null>(null);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const camera = getCamera();
      // Served from public/vendor by scripts/copy-vendor.mjs (see predev/prebuild).
      setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      const instance = new MapLibreMap({
        container: node,
        style: styleUrl(basemapRef.current),
        center: camera.center,
        zoom: camera.zoom,
        bearing: camera.bearing,
        attributionControl: false,
        pitchWithRotate: false,
      });
      instance.addControl(new AttributionControl({ compact: window.innerWidth < 640 }), "top-left");
      instance.on("style.load", () => setPhaseBoth("ready"));
      instance.on("error", (event) => {
        const status = (event.error as { status?: number } | undefined)?.status;
        const blocked = status === 401 || status === 403 || status === 429;
        // Single missing tiles on a loaded map are not fatal; style/network failures are.
        if (phaseRef.current === "loading" || (basemapRef.current === "satellite" && blocked)) setPhaseBoth("error");
      });
      instance.on("moveend", () => {
        const c = instance.getCenter();
        saveCamera({ center: [c.lng, c.lat], zoom: instance.getZoom(), bearing: instance.getBearing() });
      });
      mapRef.current = instance;
      setMap(instance);
      return () => {
        mapRef.current = null;
        setMap(null);
        instance.remove();
      };
    },
    [setPhaseBoth],
  );

  const applyBasemap = (kind: BasemapKind) => {
    const next = kind === "satellite" && !env.mapTilerKey ? "map" : kind;
    basemapRef.current = next;
    setBasemap(next);
    saveBasemap(next);
    setPhaseBoth("loading");
    // Camera and DOM markers are untouched by setStyle.
    mapRef.current?.setStyle(styleUrl(next));
  };

  const items = moments.items.filter((m): m is MomentCard & { location: NonNullable<MomentCard["location"]> } => !!m.location);
  const selected = (momentId ? (moments.items.find((m) => m.id === momentId) ?? selectedQuery.data) : null) ?? null;
  const markers = selected?.location && !items.some((m) => m.id === selected.id)
    ? [...items, selected as (typeof items)[number]]
    : items;

  const select = (id: string) => router.replace(href("/map", { moment: id }), { scroll: false });
  const close = () => router.replace(href("/map", { moment: null }), { scroll: false });

  const selLat = selected?.location?.latitude;
  const selLng = selected?.location?.longitude;
  useEffect(() => {
    if (!map || !momentId || selLat === undefined || selLng === undefined) return;
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    map.easeTo({ center: [selLng, selLat], offset: wide ? [-192, 0] : [0, -140], duration: 500 });
  }, [map, momentId, selLat, selLng]);

  const findMe = () => {
    if (locate.state === "pending") return;
    setLocate({ state: "pending" });
    if (!navigator.geolocation) {
      setLocate({ state: "error", denied: false });
      return;
    }
    // One-shot foreground read. The position stays in this component and is never sent anywhere.
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setYou({ latitude: coords.latitude, longitude: coords.longitude });
        setLocate({ state: "idle" });
        mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: Math.max(mapRef.current.getZoom(), 16) });
      },
      (error) => setLocate({ state: "error", denied: error.code === error.PERMISSION_DENIED }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const sheetRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => setSheetHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const open = !!momentId;
  const missing = open && !selected && (env.demoFixtures || selectedQuery.isError || (!selectedQuery.isPending && !selectedQuery.data));
  const satelliteFailed = phase === "error" && basemap === "satellite";
  const mapFailed = phase === "error" && basemap === "map";
  const lift = open ? sheetHeight + 120 : 112;

  return (
    <div className="absolute inset-0 overflow-hidden bg-mootz-canvas">
      {/* size-full, not absolute: maplibre-gl.css forces position: relative on this node. */}
      <div ref={containerRef} className="size-full [&_.maplibregl-ctrl-top-left]:mt-[84px] [&_.maplibregl-ctrl-top-left_.maplibregl-ctrl]:ml-2" />

      {/* Dot areas sit under moment markers (zIndex 0); a Dot area is never anyone's live position. */}
      {map &&
        dots.map((d) => (
          <MapMarker key={d.id} map={map} latitude={d.location!.latitude} longitude={d.location!.longitude} zIndex={0}>
            <MeetDotMarker
              size={144}
              savedOnchain={d.onchainStatus === "recorded"}
              label={d.onchainStatus === "recorded" ? "Meet Dot, saved onchain" : "Meet Dot"}
              onClick={() => router.push(`/dots/${d.id}`)}
            />
          </MapMarker>
        ))}
      {map &&
        markers.map((m) => (
          <MapMarker key={m.id} map={map} latitude={m.location.latitude} longitude={m.location.longitude} zIndex={m.id === momentId ? 2 : 1}>
            {m.backSrc ? (
              <PhotoMomentMarker
                author={m.author.name}
                avatarSrc={m.author.avatarSrc}
                frame={m.author.frame}
                photoSrc={m.backSrc}
                selected={m.id === momentId}
                onClick={() => select(m.id)}
              />
            ) : (
              <AvatarMomentMarker
                author={m.author.name}
                avatarSrc={m.author.avatarSrc}
                frame={m.author.frame}
                selected={m.id === momentId}
                onClick={() => select(m.id)}
              />
            )}
          </MapMarker>
        ))}
      {map && you && (
        <MapMarker map={map} latitude={you.latitude} longitude={you.longitude}>
          <YourLocationDot />
        </MapMarker>
      )}

      {phase === "loading" && !mapFailed && (
        <div className="pointer-events-none absolute inset-x-4 top-1/3 z-10 flex justify-center">
          <div className={card}>
            <StateMessage icon={basemap === "satellite" ? LoaderCircle : MapIcon} busy={basemap === "satellite"} title={basemap === "satellite" ? "Loading satellite…" : "Loading the map…"} />
          </div>
        </div>
      )}

      {mapFailed && (
        <div className="absolute inset-x-4 top-1/3 z-10 flex justify-center">
          <div className={cn(card, "max-w-sm")}>
            <StateMessage
              icon={MapPinOff}
              title="The map couldn’t load."
              actions={
                <>
                  <Button onClick={() => applyBasemap("map")}>Retry</Button>
                  <ButtonLink variant="soft" href={href("/feed", { moment: null })}>
                    Open feed
                  </ButtonLink>
                </>
              }
            >
              Retry map tiles only. Feed stays available.
            </StateMessage>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-4 top-[132px] z-20 mx-auto flex max-w-sm flex-col gap-2">
        {satelliteFailed && (
          <div className={card} role="alert">
            <StateMessage
              icon={MapPinOff}
              title="Satellite couldn’t load. Try again or use Map."
              actions={
                <>
                  <Button onClick={() => applyBasemap("satellite")}>Retry</Button>
                  <Button variant="soft" onClick={() => applyBasemap("map")}>
                    Use Map
                  </Button>
                </>
              }
            />
          </div>
        )}
        {locate.state === "error" && (
          <div className={card} role="status">
            <StateMessage
              icon={LocateOff}
              title={locate.denied ? "Location access is off. You can still browse the map." : "We couldn’t find your location. You can still browse the map and Feed."}
              actions={<Button onClick={findMe}>Retry</Button>}
            />
          </div>
        )}
        {moments.error && (
          <div className={card} role="alert">
            <StateMessage icon={MapPinOff} title="Your moments couldn’t load." actions={<Button onClick={() => void moments.refetch()}>Retry</Button>} />
          </div>
        )}
        {!moments.error && !moments.isPending && moments.items.length === 0 && !open && (
          <div className={card}>
            <StateMessage
              icon={MapPinOff}
              title="No moments on the map yet."
              actions={
                <ButtonLink href={href("/feed", { moment: null })}>Open feed</ButtonLink>
              }
            >
              Shared locations will appear here.
            </StateMessage>
          </div>
        )}
      </div>

      <div className="absolute right-4 top-[84px] z-20 flex flex-col items-end gap-2">
        <IconButton icon={Layers} label="Map style" aria-expanded={styleOpen} onClick={() => setStyleOpen((v) => !v)} />
        {styleOpen && (
          <div
            role="group"
            aria-label="Map style"
            onKeyDown={(e) => e.key === "Escape" && setStyleOpen(false)}
            className="flex w-56 flex-col gap-1 rounded-3xl bg-mootz-surface p-2 shadow-float"
          >
            {(["map", "satellite"] as const).map((kind) => {
              const disabled = kind === "satellite" && !env.mapTilerKey;
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={disabled}
                  aria-pressed={basemap === kind && !satelliteFailed}
                  onClick={() => {
                    setStyleOpen(false);
                    if (basemap !== kind || satelliteFailed) applyBasemap(kind);
                  }}
                  className={cn(
                    "flex min-h-11 flex-col items-start justify-center rounded-2xl px-3 text-left text-sm font-extrabold text-mootz-deep",
                    basemap === kind && !satelliteFailed ? "bg-mootz-lilac" : "bg-mootz-surface",
                    "disabled:text-mootz-muted",
                  )}
                >
                  {kind === "map" ? "Map" : "Satellite"}
                  {disabled && <span className="text-xs font-normal">Satellite isn’t available yet.</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{ "--lift": `${lift}px` } as React.CSSProperties}
        className={cn(
          "pointer-events-none absolute inset-x-4 bottom-(--lift) z-20 flex items-end justify-between",
          open && "lg:bottom-6 lg:right-[416px]",
        )}
      >
        <IconButton icon={Users} size={56} label="Friends" className="pointer-events-auto" onClick={() => router.push("/friends")} />
        <IconButton
          icon={locate.state === "pending" ? LoaderCircle : LocateFixed}
          size={56}
          label={locate.state === "pending" ? "Finding your location…" : "Locate me"}
          aria-busy={locate.state === "pending"}
          onClick={findMe}
          className={cn("pointer-events-auto", locate.state === "pending" && "[&_svg]:animate-spin")}
        />
      </div>

      {open && (
        <div
          ref={sheetRef}
          className="absolute inset-x-0 bottom-[104px] z-20 max-h-[calc(100dvh-200px)] overflow-y-auto lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[104px] lg:max-h-none lg:w-96"
        >
          {selected ? (
            <MomentSheet
              moment={selected}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              onClose={close}
              onPhotoClick={() => router.push(href("/feed", { moment: selected.id }))}
              meetHref={canStartMeet(selected) ? `/meet/offer?moment=${selected.id}` : undefined}
              onReact={() => router.push(`${href("/feed", { moment: selected.id })}&panel=react`)}
              onComments={() => router.push(`${href("/feed", { moment: selected.id })}&panel=comments`)}
              footer={selected.eventId ? <EventChip eventId={selected.eventId} /> : undefined}
            />
          ) : missing ? (
            <Sheet label="Moment unavailable">
              <StateMessage icon={MapPinOff} title="This moment is no longer available." actions={<Button onClick={close}>Close preview</Button>}>
                Dismiss this preview; keep the remaining moments.
              </StateMessage>
            </Sheet>
          ) : (
            <Sheet label="Loading moment">
              <div className="flex justify-end">
                <IconButton icon={X} label="Close preview" onClick={close} />
              </div>
              <StateMessage icon={LoaderCircle} busy title="Loading this moment…" />
            </Sheet>
          )}
        </div>
      )}
    </div>
  );
}
