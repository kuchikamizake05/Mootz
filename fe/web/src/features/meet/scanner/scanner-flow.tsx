"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, ScanLine } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { decodeQr, encodeQr } from "../protocol";
import { DemoBadge, MeetFrame } from "../ui/meet-frame";
import { closeFlow, stashPayload } from "../ui/nav";
import { useAlive, useStartOnce } from "../ui/use-start-once";

type Detector = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (options: { formats: string[] }) => Detector;

type Phase = "starting" | "scanning" | "denied" | "unsupported";

const SCAN_MS = 250;
const MAX_WIDTH = 960;

export function ScannerFlow() {
  const router = useRouter();
  const close = () => closeFlow(router);
  if (env.demoFixtures) {
    // Demo: no camera is opened and no fake feed is drawn.
    return (
      <MeetFrame title="Scan to Meet" onClose={close}>
        <DemoBadge />
        <div className="grid aspect-square w-full place-items-center rounded-[28px] bg-mootz-ink p-6 text-center text-sm font-bold text-white">
          Demo viewfinder · Camera not connected
        </div>
        <p className="text-mootz-muted">Open Meet on your phone to scan a friend&apos;s QR. For a preview of the next step, open the demo preview.</p>
        <Button variant="secondary" block onClick={() => router.push("/meet/accept")}>
          Open demo preview
        </Button>
      </MeetFrame>
    );
  }
  return <Scanner onClose={close} />;
}

function Scanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [invalid, setInvalid] = useState(false);
  const [help, setHelp] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  const alive = useAlive();
  // Strict Mode may unmount right after mount: stop on unmount, restart explicitly via "Try again".
  useEffect(() => () => stopRef.current(), []);

  async function startCamera() {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let clearInvalid: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearInterval(timer);
      clearTimeout(clearInvalid);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };
    stopRef.current = stop;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("No camera API", "NotSupportedError");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const element = video.current;
      if (!alive.current || !element) return stop();
      element.srcObject = stream;
      await element.play();
      if (!alive.current) return stop();
      setPhase("scanning");

      const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      const detector = Native ? new Native({ formats: ["qr_code"] }) : null;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      let busy = false;
      let done = false;

      const read = async (): Promise<string | null> => {
        if (detector) return (await detector.detect(element))[0]?.rawValue ?? null;
        if (!context || !element.videoWidth) return null;
        const scale = Math.min(1, MAX_WIDTH / element.videoWidth);
        canvas.width = Math.round(element.videoWidth * scale);
        canvas.height = Math.round(element.videoHeight * scale);
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" })?.data ?? null;
      };

      timer = setInterval(async () => {
        if (busy || done || element.readyState < 2) return;
        busy = true;
        try {
          const raw = await read();
          if (!raw || done || !alive.current) return;
          const payload = decodeQr(raw);
          if (!payload) {
            setInvalid(true);
            clearTimeout(clearInvalid);
            clearInvalid = setTimeout(() => setInvalid(false), 2500);
            return;
          }
          done = true;
          stop();
          // Hold the payload in the tab as well: the first render of /meet/accept can run before the URL fragment is visible.
          const url = encodeQr(payload, "");
          stashPayload(url.slice(url.indexOf("#")));
          router.push(url);
        } catch {
          // A frame that fails to decode is skipped; the next tick tries again.
        } finally {
          busy = false;
        }
      }, SCAN_MS);
    } catch (error) {
      stop();
      if (!alive.current) return;
      const name = error instanceof DOMException ? error.name : "";
      setPhase(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotSupportedError" || name === "NotFoundError" ? "unsupported" : "denied");
    }
  }

  useStartOnce(() => void startCamera());

  const retry = () => {
    stopRef.current();
    setPhase("starting");
    void startCamera();
  };

  const failed = phase === "denied" || phase === "unsupported";
  const denied = phase === "denied";

  // The <video> stays mounted in every phase so a retry can attach a new stream to it.
  return (
    <MeetFrame title={failed ? "Meet" : "Scan to Meet"} onClose={onClose}>
      {failed && (
        <StateMessage
          icon={CameraOff}
          title={denied ? "Camera access is off. Allow the camera to scan your friend's Mootz QR." : "This device can't scan here."}
          actions={
            <>
              {denied && <Button onClick={retry}>Try again</Button>}
              <Button variant="secondary" onClick={onClose}>Back to moment</Button>
            </>
          }
        >
          {denied
            ? "Allow camera access for Mootz in your browser settings, then try again. On a desktop, use your phone to scan."
            : "No camera was found, or this page isn't allowed to use it. Use your phone to scan your friend's QR."}
        </StateMessage>
      )}
      <div className={cn("flex flex-col gap-4", failed && "hidden")}>
        <h2 className="font-display text-[30px] leading-none">Point at your friend&apos;s Mootz QR</h2>
        <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-[28px] bg-mootz-ink">
          <video ref={video} playsInline muted aria-label="Camera viewfinder" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="relative z-10 grid size-3/4 place-items-center rounded-[28px] border-[3px] border-mootz-light">
            <ScanLine size={56} className="text-white/80" />
          </div>
          {phase === "starting" && <p className="absolute bottom-4 z-10 text-sm font-bold text-white">Starting camera…</p>}
        </div>
        <p role="status" aria-live="polite" className="min-h-6 font-bold text-mootz-deep">
          {invalid ? "That's not a Mootz Meet QR." : ""}
        </p>
        <p className="text-mootz-muted">A scan shows a preview of one moment only. It doesn&apos;t add a friend or open their other posts.</p>
        <Button variant="secondary" block aria-expanded={help} onClick={() => setHelp(!help)}>
          Camera help
        </Button>
        {help && (
          <p className="text-sm text-mootz-muted">
            Hold your phone steady about 20 to 30 cm from your friend&apos;s screen and ask them to turn their brightness up. You can also open the QR with your phone&apos;s camera app.
          </p>
        )}
      </div>
    </MeetFrame>
  );
}
