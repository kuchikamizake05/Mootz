"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/cn";

/**
 * Renders `text` as a QR with error correction M and a 4-module white quiet zone.
 * The payload is dense (signed Offer), so it is drawn large and with hard pixel edges.
 */
export function QrImage({ text, label, className }: { text: string; label: string; className?: string }) {
  const [made, setMade] = useState<{ text: string; url: string } | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 4, scale: 6, color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => live && setMade({ text, url }))
      .catch(() => live && setMade(null));
    return () => {
      live = false;
    };
  }, [text]);

  const url = made?.text === text ? made.url : null;
  return (
    <div className={cn("aspect-square w-full bg-white", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img src={url} alt={label} className="size-full" style={{ imageRendering: "pixelated" }} draggable={false} />
      ) : (
        <div role="status" className="grid size-full place-items-center text-sm text-mootz-muted">
          Preparing QR…
        </div>
      )}
    </div>
  );
}
