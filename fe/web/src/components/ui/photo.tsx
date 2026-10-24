"use client";

import { useState, type CSSProperties } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Private media comes from short-lived signed URLs, so this uses a plain <img>
 * rather than next/image. A failed load shows the B.01 "Photo unavailable" glyph
 * in place, keeping the surrounding layout intact.
 */
export function Photo({
  src,
  alt,
  className,
  style,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  return (
    // A span (display block) so avatars stay valid inside text like <p>; callers position it via className.
    <span className={cn("block overflow-hidden bg-mootz-lilac", className)} style={style}>
      {failed ? (
        <span role="img" aria-label={`${alt} (unavailable)`} className="grid size-full place-items-center text-mootz-deep">
          <ImageOff aria-hidden size={24} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- signed private media URL
        <img src={src} alt={alt} className="size-full object-cover" onError={() => setFailedSrc(src)} draggable={false} />
      )}
    </span>
  );
}
