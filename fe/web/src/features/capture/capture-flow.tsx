"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Flame, ImagePlus, LoaderCircle, MapPin, RefreshCw, ScanLine, X } from "lucide-react";
import { BackButton, Button, IconButton } from "@/components/ui/button";
import { PairedPhoto } from "@/components/ui/moment";
import { Photo } from "@/components/ui/photo";
import { StateMessage } from "@/components/ui/status";
import { useApi } from "@/lib/api/use-api";
import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { getBrowseOrigin } from "@/features/shell/browse-origin";
import { makeShot, shotFromFile, shotFromVideo, type Shot } from "./image";
import { UPLOAD_STEPS, describeError, newJob, runUpload, StepError, type Coords, type StreakDto, type UploadJob, type UploadStep } from "./publish";
import { useCamera } from "./use-camera";

type Step = "rear" | "selfie" | "review" | "uploading" | "posted" | "upload-pick" | "upload-review";
type Mode = "capture" | "upload";
type LocationState = "off" | "locating" | "on" | "denied";
type Result = { id: string; streak: { kind: "updated"; days: number } | { kind: "unchanged" } | { kind: "none" }; demo: boolean };

const STEP_LABEL: Record<Step, string> = {
  rear: "Step 1 of 2 · Back camera",
  selfie: "Step 2 of 2 · Front camera",
  review: "Paired review",
  uploading: "Posting",
  posted: "Done",
  "upload-pick": "Upload photos",
  "upload-review": "Review",
};
const TITLE: Partial<Record<Step, string>> = { rear: "Post a moment", selfie: "Now take your selfie", review: "Your moment", "upload-review": "Your moment", uploading: "Posting moment", posted: "Moment posted", "upload-pick": "Upload photos" };
const STEP_NAME: Record<UploadStep, string> = { draft: "Creating your moment", back: "Uploading back photo", front: "Uploading selfie", publish: "Publishing" };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CaptureFlow() {
  const router = useRouter();
  const api = useApi();
  const [step, setStep] = useState<Step>("rear");
  const [mode, setMode] = useState<Mode>("capture");
  const [back, setBack] = useState<Shot | null>(null);
  const [front, setFront] = useState<Shot | null>(null);
  const [caption, setCaption] = useState("");
  const [locState, setLocState] = useState<LocationState>("off");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [done, setDone] = useState<UploadStep[]>([]);
  const [failure, setFailure] = useState<{ step: UploadStep; message: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const job = useRef<UploadJob | null>(null);
  const streakBefore = useRef<StreakDto | null>(null);
  const running = useRef(false);

  // Revoke object URLs when replaced or on unmount.
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  const keep = useCallback((blob: Blob) => {
    const shot = makeShot(blob);
    urls.current.add(shot.url);
    return shot;
  }, []);
  const release = (shot: Shot | null) => {
    if (!shot) return;
    URL.revokeObjectURL(shot.url);
    urls.current.delete(shot.url);
  };

  const setSide = (side: "back" | "front", blob: Blob) => {
    const shot = keep(blob);
    if (side === "back") {
      release(back);
      setBack(shot);
    } else {
      release(front);
      setFront(shot);
    }
  };

  const goUpload = () => {
    setMode("upload");
    release(back);
    release(front);
    setBack(null);
    setFront(null);
    job.current = null;
    setStep("upload-pick");
  };

  const toggleLocation = (on: boolean) => {
    if (!on) {
      setLocState("off");
      setCoords(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocState("denied");
      return;
    }
    setLocState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocState("on");
      },
      () => setLocState("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const post = async () => {
    if (!back || !front || running.current) return;
    running.current = true;
    setFailure(null);
    setStep("uploading");
    const key = `${mode}|${caption.trim()}|${coords?.latitude},${coords?.longitude}`;
    if (job.current?.key !== key) {
      job.current = newJob(key);
      setDone([]);
    }
    const j = job.current;
    try {
      if (env.demoFixtures) {
        for (const s of UPLOAD_STEPS) {
          await wait(500);
          setDone((d) => (d.includes(s) ? d : [...d, s]));
        }
        setResult({ id: "demo", streak: mode === "capture" ? { kind: "updated", days: 3 } : { kind: "none" }, demo: true });
        setStep("posted");
        return;
      }
      if (!j.draftId && mode === "capture") {
        streakBefore.current = await api<StreakDto>("/v1/me/streak").catch(() => null);
      }
      const id = await runUpload(
        api,
        j,
        { source: mode, caption: caption.trim(), location: coords, back: back.blob, front: front.blob },
        (s) => setDone((d) => (d.includes(s) ? d : [...d, s])),
      );
      let streak: Result["streak"] = { kind: "none" };
      if (mode === "capture") {
        const after = await api<StreakDto>("/v1/me/streak").catch(() => null);
        if (streakBefore.current?.postedToday) streak = { kind: "unchanged" };
        else if (after) streak = { kind: "updated", days: after.currentStreak };
      }
      setResult({ id, streak, demo: false });
      setStep("posted");
    } catch (e) {
      const failedStep = e instanceof StepError ? e.step : "draft";
      setFailure({ step: failedStep, message: describeError(e) });
    } finally {
      running.current = false;
    }
  };

  const cancelUpload = () => {
    setFailure(null);
    setStep(mode === "capture" ? "review" : "upload-review");
  };

  const close = () => router.push(getBrowseOrigin());
  const title = TITLE[step];
  const wide = step === "review" || step === "upload-review";

  return (
    <main className="min-h-dvh bg-mootz-surface lg:grid lg:place-items-center lg:p-8">
      <div className={cn("mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3 px-4 pb-6 pt-4 lg:min-h-0 lg:max-w-[760px] lg:rounded-[32px] lg:bg-mootz-surface lg:p-8 lg:shadow-float", wide && "lg:max-w-[760px]")}>
        <header className="flex min-h-11 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {(step === "selfie" || step === "review" || step === "upload-review") && <BackButton onClick={() => setStep(step === "selfie" ? "rear" : mode === "capture" ? "selfie" : "upload-pick")} />}
            {title && <h1 className={cn("font-display leading-none text-mootz-ink", step === "rear" || step === "posted" ? "text-[30px]" : "text-[26px]")}>{title}</h1>}
          </div>
          {(step === "rear" || step === "upload-pick") && <IconButton icon={X} label="Close capture" onClick={close} />}
        </header>
        <p className="text-sm font-bold text-mootz-muted" aria-live="polite">{STEP_LABEL[step]}{env.demoFixtures && " · Demo: nothing is uploaded"}</p>

        {step === "rear" && (
          <Viewfinder
            key="rear"
            facing="environment"
            label="Back camera viewfinder"
            hint="First the scene. Then your selfie."
            shutter="Take back photo"
            onShot={(b) => {
              setSide("back", b);
              setStep(front ? "review" : "selfie");
            }}
            onFallback={goUpload}
          />
        )}

        {step === "selfie" && (
          <Viewfinder
            key="selfie"
            facing="user"
            mirror
            label="Front camera viewfinder"
            hint="Back photo saved for this draft. Your selfie completes the pair."
            shutter="Capture selfie"
            previewSrc={back?.url}
            onRetakeBack={() => setStep("rear")}
            onShot={(b) => {
              setSide("front", b);
              setStep("review");
            }}
            onFallback={goUpload}
          />
        )}

        {step === "upload-pick" && (
          <UploadPick
            back={back}
            front={front}
            error={pickError}
            onPick={async (side, file) => {
              setPickError(null);
              try {
                setSide(side, await shotFromFile(file));
              } catch {
                setPickError("That photo couldn't be read. Choose a JPEG or PNG under 8 MiB.");
              }
            }}
            onContinue={() => setStep("upload-review")}
            onCamera={() => {
              setMode("capture");
              setStep("rear");
            }}
          />
        )}

        {(step === "review" || step === "upload-review") && back && front && (
          <Review
            mode={mode}
            back={back}
            front={front}
            caption={caption}
            onCaption={setCaption}
            locState={locState}
            onLocation={toggleLocation}
            onRetake={(side) => {
              if (mode === "upload") setStep("upload-pick");
              else {
                setStep(side === "back" ? "rear" : "selfie");
              }
            }}
            onPost={post}
          />
        )}

        {step === "uploading" && <Progress done={done} failure={failure} onRetry={post} onCancel={cancelUpload} />}

        {step === "posted" && result && back && front && <Posted result={result} mode={mode} back={back} front={front} />}
      </div>
    </main>
  );
}

function Viewfinder({
  facing,
  mirror,
  label,
  hint,
  shutter,
  previewSrc,
  onShot,
  onRetakeBack,
  onFallback,
}: {
  facing: "environment" | "user";
  mirror?: boolean;
  label: string;
  hint: string;
  shutter: string;
  previewSrc?: string | null;
  onShot: (blob: Blob) => void;
  onRetakeBack?: () => void;
  onFallback: () => void;
}) {
  const { videoRef, status } = useCamera(facing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (status === "denied" || status === "unavailable" || status === "insecure") {
    const copy = {
      denied: "Allow camera access in your browser settings to take photos, or upload two photos instead.",
      unavailable: "We couldn't find a working camera on this device. You can upload two photos instead.",
      insecure: "The camera needs a secure (HTTPS) connection. You can upload two photos instead.",
    }[status];
    return (
      <StateMessage
        icon={CameraOff}
        title="Camera access is off."
        className="mt-6"
        actions={<Button icon={ImagePlus} onClick={onFallback}>Upload photos instead</Button>}
      >
        {copy}
      </StateMessage>
    );
  }

  const snap = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    setError(false);
    try {
      onShot(await shotFromVideo(video));
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className={cn("relative overflow-hidden rounded-[28px] bg-mootz-ink", facing === "environment" ? "h-[438px]" : "h-[400px]")}>
        <video
          ref={videoRef}
          aria-label={label}
          autoPlay
          playsInline
          muted
          className={cn("absolute inset-0 size-full object-cover", mirror && "-scale-x-100")}
        />
        {status === "starting" && (
          <p role="status" className="absolute inset-0 grid place-items-center text-sm font-bold text-white">
            <span className="flex items-center gap-2">
              <LoaderCircle aria-hidden size={18} className="animate-spin" /> Starting camera…
            </span>
          </p>
        )}
        {previewSrc && (
          <div className="absolute left-3 top-3">
            <Photo src={previewSrc} alt="Your back photo" className="h-[104px] w-[84px] rounded-[18px] border-[3px] border-white" />
          </div>
        )}
      </div>
      <p className="text-lg font-bold text-mootz-ink" aria-live="polite">
        {error ? "Couldn't save that photo. Try again." : hint}
      </p>
      <div className="flex flex-col-reverse items-center gap-3">
        {onRetakeBack && (
          <Button variant="secondary" block onClick={onRetakeBack}>
            Retake back
          </Button>
        )}
        <Button size="lg" icon={Camera} aria-label={shutter} className={facing === "environment" ? "size-[76px] rounded-full p-0 [&>svg]:size-[30px]" : "w-full"} disabled={status !== "ready" || busy} onClick={snap}>
          {facing === "user" && shutter}
        </Button>
      </div>
      <button type="button" onClick={onFallback} className="raised min-h-12 rounded-2xl bg-white px-3 text-[15px] font-extrabold text-mootz-deep">
        Upload photos instead
      </button>
      <p className="text-sm font-bold leading-[1.4] text-mootz-muted">{facing === "environment" ? "Post any time. A completed camera pair can extend your daily streak and start an optional Meet." : "If this stage fails, keep the back capture. Never publish an incomplete pair."}</p>
    </div>
  );
}

function UploadPick({
  back,
  front,
  error,
  onPick,
  onContinue,
  onCamera,
}: {
  back: Shot | null;
  front: Shot | null;
  error: string | null;
  onPick: (side: "back" | "front", file: File) => void;
  onContinue: () => void;
  onCamera: () => void;
}) {
  const ready = !!back && !!front;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-mootz-muted">Choose one back photo and one selfie. Uploaded moments don&apos;t count toward your streak or Meet.</p>
      <div className="grid grid-cols-2 gap-3">
        <Picker label="Back photo" shot={back} onFile={(f) => onPick("back", f)} />
        <Picker label="Selfie" shot={front} onFile={(f) => onPick("front", f)} />
      </div>
      {error && <p role="alert" className="text-sm font-bold text-mootz-deep">{error}</p>}
      <Button size="lg" block disabled={!ready} onClick={onContinue}>
        Continue
      </Button>
      {!ready && <p className="text-sm text-mootz-muted">Choose both photos to continue.</p>}
      <button type="button" onClick={onCamera} className="min-h-11 text-sm font-extrabold text-mootz-deep underline">
        Use the camera instead
      </button>
    </div>
  );
}

function Picker({ label, shot, onFile }: { label: string; shot: Shot | null; onFile: (f: File) => void }) {
  return (
    <label className="raised relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px] bg-mootz-surface text-mootz-deep focus-within:outline focus-within:outline-2 focus-within:outline-mootz-deep">
      {shot ? (
        <Photo src={shot.url} alt={`${label} chosen`} className="absolute inset-0" />
      ) : (
        <ImagePlus aria-hidden size={28} />
      )}
      <span className={cn("relative text-sm font-extrabold", shot && "absolute bottom-2 rounded-lg bg-mootz-surface px-2 py-1")}>{shot ? `Change ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}</span>
      <input
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        aria-label={shot ? `Change ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function Review({
  mode,
  back,
  front,
  caption,
  onCaption,
  locState,
  onLocation,
  onRetake,
  onPost,
}: {
  mode: Mode;
  back: Shot;
  front: Shot;
  caption: string;
  onCaption: (v: string) => void;
  locState: LocationState;
  onLocation: (on: boolean) => void;
  onRetake: (side: "back" | "front") => void;
  onPost: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6">
      <PairedPhoto backSrc={back.url} frontSrc={front.url} authorName="you" className="h-[260px] w-full lg:aspect-[3/4]" />
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={() => onRetake("back")}>
            {mode === "upload" ? "Change photos" : "Retake back"}
          </Button>
          {mode === "capture" && (
            <Button variant="secondary" block onClick={() => onRetake("front")}>
              Retake selfie
            </Button>
          )}
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold text-mootz-muted">
          Caption (optional)
          <textarea
            value={caption}
            onChange={(e) => onCaption(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Add a caption"
            className="rounded-2xl border border-mootz-hairline bg-mootz-surface p-3 text-base font-normal text-mootz-ink"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-mootz-ink">
          <input
            type="checkbox"
            className="size-5 accent-mootz-deep"
            checked={locState === "on" || locState === "locating"}
            onChange={(e) => onLocation(e.target.checked)}
          />
          <MapPin aria-hidden size={18} className="text-mootz-deep" />
          Share posting location
        </label>
        <p className="text-xs text-mootz-muted" aria-live="polite">
          {locState === "locating" && "Finding your location…"}
          {locState === "denied" && "Location is unavailable, so this moment will post without it. "}
          This is where you posted, not your live location. Location is optional. Shared directly with friends.
        </p>
        <Button size="lg" block disabled={locState === "locating"} onClick={onPost}>
          Post moment
        </Button>
      </div>
    </div>
  );
}

function Progress({
  done,
  failure,
  onRetry,
  onCancel,
}: {
  done: UploadStep[];
  failure: { step: UploadStep; message: string } | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const pct = Math.round((done.length / UPLOAD_STEPS.length) * 100);
  const current = UPLOAD_STEPS.find((s) => !done.includes(s));
  const body: ReactNode = (
    <>
      <div className="flex items-baseline justify-between">
        <p className="text-base font-black text-mootz-ink" aria-live="polite">
          {failure ? `${STEP_NAME[failure.step]} failed` : current ? `${STEP_NAME[current]}…` : "Done"}
        </p>
        <p className="font-display text-[28px] text-mootz-deep">{pct}%</p>
      </div>
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-3 overflow-hidden rounded-full bg-mootz-lilac"
      >
        <div className="h-full rounded-full bg-mootz-deep transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </>
  );
  return (
    <div className="mt-4 flex flex-col gap-3">
      {env.demoFixtures && <p className="text-sm font-extrabold text-mootz-deep">Demo: nothing was uploaded</p>}
      {body}
      <p className="text-sm text-mootz-muted">Your moment is published only after both photos finish uploading.</p>
      {failure && (
        <div role="alert" className="flex flex-col gap-3">
          <p className="text-sm font-bold text-mootz-ink">{failure.message} Nothing has been published.</p>
          <div className="flex gap-2">
            <Button block icon={RefreshCw} onClick={onRetry}>
              Retry
            </Button>
            <Button variant="secondary" block onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Posted({ result, mode, back, front }: { result: Result; mode: Mode; back: Shot; front: Shot }) {
  const router = useRouter();
  const { streak } = result;
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6">
      <PairedPhoto backSrc={back.url} frontSrc={front.url} authorName="you" className="aspect-[358/320] w-full lg:aspect-[3/4]" />
      <div className="flex flex-col gap-3" aria-live="polite">
        {result.demo && <p className="text-sm font-extrabold text-mootz-deep">Demo: nothing was uploaded. The streak below is illustrative.</p>}
        {streak.kind === "updated" && (
          <div className="px-2">
            <p className="flex items-center gap-2 font-display text-[40px] leading-none text-mootz-deep">
              <Flame aria-hidden size={30} />
              {streak.days}-day streak
            </p>
            <p className="mt-1 text-sm font-bold text-mootz-muted">Posted today</p>
          </div>
        )}
        {streak.kind === "unchanged" && (
          <p className="px-2 text-base font-black text-mootz-deep">Streak unchanged — you already posted today.</p>
        )}
        {mode === "upload" && (
          <p className="px-2 text-sm font-bold text-mootz-muted">Uploaded photos don&apos;t count toward your streak or Meet.</p>
        )}
        {mode === "capture" && (
          <Link
            href={result.demo ? "/meet/offer?moment=00000000-0000-4000-8000-0000000000f1" : `/meet/offer?moment=${result.id}`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-mootz-lilac px-4 text-sm font-extrabold text-mootz-deep"
          >
            <span>
              Meet · Photographed a friend?
              <span className="block text-xs font-bold text-mootz-muted">Optional. Your moment is already posted.</span>
            </span>
            <ScanLine aria-hidden size={20} />
          </Link>
        )}
        <Button size="lg" block onClick={() => router.push(getBrowseOrigin())}>
          Done
        </Button>
      </div>
    </div>
  );
}
