"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { loadMomentPhotos } from "@/features/moments/photos";
import { Photo } from "./photo";

type Props = {
  momentId?: string;
  backSrc?: string | null;
  frontSrc?: string | null;
  authorName: string;
  className?: string;
  selfie?: "md" | "lg";
};

export function PairedPhoto(props: Props) {
  return <PhotoPair key={props.momentId ?? `${props.backSrc}:${props.frontSrc}`} {...props} />;
}

function PhotoPair({ momentId, backSrc, frontSrc, authorName, className, selfie = "md" }: Props) {
  const [swapped, setSwapped] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const api = useApi();
  const { ready, authenticated, user } = usePrivy();
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const originals = useQuery({
    queryKey: ["moment-photos", user?.id, momentId],
    queryFn: ({ signal }) => loadMomentPhotos(api, momentId!, signal),
    enabled: !!momentId && visible && ready && authenticated && !env.demoFixtures,
    // Signed URLs expire after 60 seconds; never persist them as permanent assets.
    staleTime: 45_000,
    gcTime: 60_000,
  });
  const back = originals.isError ? null : originals.data?.back ?? backSrc;
  const front = originals.isError ? null : originals.data?.front ?? frontSrc;
  const canSwap = !!back && !!front;
  const main = swapped ? front : back;
  const inset = swapped ? back : front;
  const mainAlt = swapped ? `Selfie by ${authorName}` : `Back camera photo by ${authorName}`;
  const insetAlt = swapped ? `Back camera photo by ${authorName}` : `Selfie by ${authorName}`;
  const swap = () => setSwapped((value) => !value);

  return (
    <div ref={root} className={cn("relative overflow-hidden rounded-[22px] bg-mootz-lilac", className)}>
      <button type="button" disabled={!canSwap} onClick={swap} aria-label={`Swap front and back photos by ${authorName}`} aria-pressed={swapped}
        className="absolute inset-0 rounded-[22px] focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-mootz-deep disabled:cursor-default">
        <Photo src={main} alt={mainAlt} className="absolute inset-0" />
      </button>
      <button type="button" disabled={!canSwap} onClick={swap} aria-label={`Show ${swapped ? "back camera photo" : "selfie"} by ${authorName}`}
        className={cn("absolute overflow-hidden border-[3px] border-white focus-visible:outline-4 focus-visible:outline-mootz-deep disabled:cursor-default",
          selfie === "md" ? "left-3 top-3 h-[104px] w-[84px] rounded-[18px]" : "left-4 top-4 h-[146px] w-[112px] rounded-[20px]")}>
        <Photo src={inset} alt={insetAlt} className="size-full" />
      </button>
      {originals.isError && <button type="button" onClick={() => originals.refetch()} className="absolute inset-x-3 bottom-3 min-h-11 rounded-xl bg-white px-3 text-sm font-bold text-mootz-deep">Photos unavailable · Retry</button>}
    </div>
  );
}
