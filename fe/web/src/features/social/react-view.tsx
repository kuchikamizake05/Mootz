"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Check, LoaderCircle, RefreshCw, ScanFace, Send, Trash2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { SelfieTile, StateMessage } from "@/components/ui/status";
import { shotFromVideo, makeShot, type Shot } from "@/features/capture/image";
import { useCamera } from "@/features/capture/use-camera";
import { useMoment } from "@/features/moments/queries";
import { errorCopy, isNotFound, libraryLabel } from "./model";
import { Page } from "@/components/ui/page";
import { useReactionActions, useReactions, useSelfies } from "./queries";

const PRIVACY = "Only you can see your saved selfies. A selfie you send is visible to people who can see this moment.";

function SelfieCapture({ onShot, onCancel }: { onShot: (shot: Shot) => void; onCancel: () => void }) {
  const { videoRef, status } = useCamera("user");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (status === "denied" || status === "unavailable" || status === "insecure") {
    const copy = {
      denied: "Allow camera access in your browser settings, then retry. Your saved selfies still work.",
      unavailable: "We couldn't find a working camera. Your saved selfies still work.",
      insecure: "The camera needs a secure (HTTPS) connection. Your saved selfies still work.",
    }[status];
    return (
      <StateMessage icon={CameraOff} title="Camera access is off." actions={<Button variant="secondary" onClick={onCancel}>Back to library</Button>}>
        {copy}
      </StateMessage>
    );
  }

  const snap = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    setFailed(false);
    try {
      onShot(makeShot(await shotFromVideo(video)));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-mootz-ink">
        {/* Preview is mirrored like a mirror; the saved image is not. */}
        <video ref={videoRef} aria-label="Selfie camera preview" autoPlay playsInline muted className="absolute inset-0 size-full -scale-x-100 object-cover" />
        {status === "starting" && (
          <p role="status" className="absolute inset-0 grid place-items-center text-sm font-bold text-white">
            <span className="flex items-center gap-2"><LoaderCircle aria-hidden size={18} className="animate-spin" /> Starting camera…</span>
          </p>
        )}
      </div>
      <p className="text-sm text-mootz-muted" aria-live="polite">{failed ? "Couldn't take that selfie. Try again." : "Center your face, then take the selfie."}</p>
      <Button size="lg" block icon={Camera} disabled={status !== "ready" || busy} onClick={() => void snap()}>Take selfie</Button>
      <Button variant="secondary" size="lg" block icon={X} onClick={onCancel}>Cancel</Button>
    </>
  );
}

export function ReactView({ momentId, onClose }: { momentId: string; onClose?: () => void }) {
  const router = useRouter();
  const moment = useMoment(momentId);
  const reactions = useReactions(momentId);
  const library = useSelfies();
  const actions = useReactionActions(momentId);

  const [picked, setPicked] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState("");
  // A selfie already uploaded for the current review; a retry after a failed react skips re-upload.
  const uploadedId = useRef<string | null>(null);

  const forName = moment.data ? `For ${moment.data.author.name}'s moment` : undefined;
  const items = library.items;
  const selectedId = picked && items.some((s) => s.id === picked) ? picked : (items[0]?.id ?? null);
  const selectedIndex = items.findIndex((s) => s.id === selectedId);
  const mine = reactions.mine;

  const closeCapture = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setCapturing(false);
    uploadedId.current = null;
    actions.upload.reset();
    actions.send.reset();
  };

  const sendSelected = () => {
    if (!selectedId) return;
    actions.send.mutate(selectedId, {
      onSuccess: () => {
        setChanging(false);
        setNotice("Reaction sent.");
      },
    });
  };

  const saveAndReact = async () => {
    if (!shot) return;
    try {
      if (!uploadedId.current) uploadedId.current = (await actions.upload.mutateAsync(shot.blob)).id;
      const id = uploadedId.current;
      await actions.send.mutateAsync(id);
      setPicked(id);
      setChanging(false);
      setNotice("Selfie saved and reaction sent.");
      closeCapture();
    } catch {
      /* mutation state shows the error; the saved selfie is kept for a retry */
    }
  };

  if (moment.error && isNotFound(moment.error)) {
    return (
      <Page title="Selfie reaction" backHref="/feed" onBack={onClose ?? (() => router.push("/feed"))}>
        <StateMessage icon={TriangleAlert} title="Moment not available">It may have been removed, or it isn&apos;t shared with you.</StateMessage>
      </Page>
    );
  }
  const pageBack = { backHref: `/moments/${momentId}`, backLabel: "Back to moment", onBack: onClose ?? (() => router.push(`/moments/${momentId}`)) };
  const live = <p className="sr-only" aria-live="polite">{notice}</p>;

  // Capture and review
  if (capturing) {
    if (shot) {
      const failed = actions.upload.isError ? actions.upload.error : actions.send.isError ? actions.send.error : null;
      const busy = actions.upload.isPending || actions.send.isPending;
      return (
        <Page {...pageBack} title="Keep this face?" subtitle="New saved selfie">
          <Photo src={shot.url} alt="Your new selfie" className="aspect-[3/4] w-full rounded-[22px]" />
          <Button variant="secondary" size="lg" block icon={RefreshCw} disabled={busy} onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); uploadedId.current = null; actions.upload.reset(); actions.send.reset(); }}>Retake</Button>
          <Button size="lg" block icon={Check} disabled={busy} onClick={() => void saveAndReact()}>
            {actions.upload.isPending ? "Saving…" : actions.send.isPending ? "Sending…" : failed ? "Retry" : "Save & react"}
          </Button>
          {failed && (
            <p role="alert" className="text-sm font-bold text-mootz-ink">
              {actions.upload.isError ? "Your selfie couldn't be saved. " : "Your selfie is saved, but the reaction couldn't send. " }
              {errorCopy(failed, "Sending")}
            </p>
          )}
          <p className="text-sm text-mootz-muted">Save to your private library, then send to this moment. If sending fails, the saved selfie is kept. One active reaction; this replaces the old one.</p>
        </Page>
      );
    }
    return (
      <Page {...pageBack} title="Take a selfie" subtitle={forName}>
        <SelfieCapture onShot={setShot} onCancel={closeCapture} />
      </Page>
    );
  }

  // Sent state (04.08)
  if (mine && !changing) {
    return (
      <Page {...pageBack} title="Reaction sent" subtitle={forName}>
        {live}
        <figure className="flex flex-col items-center gap-3 py-4">
          <Photo src={mine.thumbnailUrl} alt="Your reaction selfie" className="h-60 w-48 rounded-[28px]" />
          <figcaption className="text-sm font-bold text-mootz-muted">Your reaction · Visible with this moment</figcaption>
        </figure>
        <Button size="lg" block icon={RefreshCw} onClick={() => { setChanging(true); setNotice(""); actions.send.reset(); }}>Change reaction</Button>
        <Button variant="secondary" size="lg" block icon={Trash2} disabled={actions.remove.isPending} onClick={() => actions.remove.mutate(undefined, { onSuccess: () => setNotice("Reaction removed. Your saved selfie is still in your library.") })}>
          {actions.remove.isPending ? "Removing…" : "Remove reaction"}
        </Button>
        {actions.remove.isError && <p role="alert" className="text-sm font-bold text-mootz-ink">{errorCopy(actions.remove.error, "Removing")}</p>}
        <p className="text-sm text-mootz-muted">Remove reaction retracts it from this moment. Your private saved selfie remains reusable.</p>
      </Page>
    );
  }

  // Library / tray
  return (
    <Page {...pageBack} title={items.length === 0 && !library.isPending ? "Your selfie collection" : changing ? "Change your reaction" : "A face says it better."} subtitle={forName}>
      {live}
      {notice && !mine && <p aria-hidden className="text-sm font-bold text-mootz-deep">{notice}</p>}
      <p className="text-sm text-mootz-muted">{PRIVACY}</p>

      {library.isPending || reactions.isPending ? (
        <StateMessage icon={LoaderCircle} busy title="Loading your selfies…" />
      ) : library.error || reactions.error ? (
        <StateMessage icon={TriangleAlert} title="Couldn't load your selfies" actions={<Button onClick={() => { void library.refetch(); void reactions.refetch(); }}>Retry</Button>}>
          {errorCopy(library.error ?? reactions.error, "Loading")}
        </StateMessage>
      ) : items.length === 0 ? (
        <>
          <StateMessage icon={ScanFace} title="No saved selfies yet." className="items-center rounded-[28px] bg-mootz-lilac px-4 py-14 text-center" />
          <p className="text-sm text-mootz-muted">Take one selfie now. Save it privately and reuse it on future moments.</p>
          <Button size="lg" block icon={Camera} onClick={() => setCapturing(true)}>Take a selfie</Button>
        </>
      ) : (
        <>
          <div role="group" aria-label="Saved selfies" className="grid grid-cols-3 gap-2">
            {items.map((s, i) => (
              <SelfieTile key={s.id} src={s.thumbnailUrl} label={libraryLabel(i)} selected={s.id === selectedId} className="h-40" onClick={() => { setPicked(s.id); setConfirmRemove(false); }} />
            ))}
          </div>
          {library.hasNextPage && (
            <Button variant="secondary" block disabled={library.isFetchingNextPage} onClick={() => void library.fetchNextPage()}>
              {library.isFetchingNextPage ? "Loading…" : "Load more selfies"}
            </Button>
          )}
          <Button variant="secondary" size="lg" block icon={Camera} onClick={() => setCapturing(true)}>Take a selfie</Button>
          <Button size="lg" block icon={Send} disabled={!selectedId || actions.send.isPending} onClick={sendSelected}>
            {actions.send.isPending ? "Sending…" : actions.send.isError ? "Retry reaction" : "Send reaction"}
          </Button>
          {changing && <Button variant="secondary" size="lg" block icon={Check} onClick={() => { setChanging(false); actions.send.reset(); }}>Keep current reaction</Button>}
          {actions.send.isError && (
            <p role="alert" className="text-sm font-bold text-mootz-ink">
              Your reaction couldn&apos;t send. {errorCopy(actions.send.error, "Sending")} {mine ? "Your previous reaction is unchanged." : "Your selection is kept."}
            </p>
          )}

          {confirmRemove ? (
            <div role="alertdialog" aria-labelledby="rm-title" aria-describedby="rm-desc" className="flex flex-col gap-2 rounded-2xl bg-mootz-surface p-4 shadow-float">
              <h2 id="rm-title" className="font-display text-2xl text-mootz-ink">Remove saved selfie?</h2>
              <p id="rm-desc" className="text-sm text-mootz-muted">
                Remove {selectedIndex >= 0 ? libraryLabel(selectedIndex) : "this selfie"} from your private collection only. Sent reactions are unaffected.
              </p>
              <div className="flex gap-2">
                <Button icon={Trash2} disabled={actions.deleteSelfie.isPending} onClick={() => selectedId && actions.deleteSelfie.mutate(selectedId, { onSuccess: () => { setConfirmRemove(false); setPicked(null); setNotice("Saved selfie removed from your library."); } })}>
                  {actions.deleteSelfie.isPending ? "Removing…" : "Remove saved selfie"}
                </Button>
                <Button icon={X} variant="secondary" onClick={() => setConfirmRemove(false)}>Cancel</Button>
              </div>
              {actions.deleteSelfie.isError && <p role="alert" className="text-sm font-bold text-mootz-ink">{errorCopy(actions.deleteSelfie.error, "Removing")}</p>}
            </div>
          ) : (
            <>
              <Button variant="secondary" size="lg" block icon={Trash2} disabled={!selectedId} onClick={() => setConfirmRemove(true)}>Remove saved selfie</Button>
              <p className="text-sm text-mootz-muted">Removing a saved selfie affects your private library only. It does not retract a sent reaction.</p>
            </>
          )}
        </>
      )}
    </Page>
  );
}
