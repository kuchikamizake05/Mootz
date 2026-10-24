import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, LockKeyhole, MapPin, MapPinOff, MessageCircle, ScanFace, ScanLine, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, type AvatarFrame } from "./avatar";
import { Button, IconButton } from "./button";
import { Photo } from "./photo";

export type MomentAuthor = { name: string; avatarSrc?: string | null; frame?: AvatarFrame };

export type MomentView = {
  author: MomentAuthor;
  postedLabel: string; // e.g. "12m ago"
  backSrc?: string | null;
  frontSrc?: string | null;
  caption?: string | null;
  /** Posting place label. Null when location was not shared: no pin and no map button. */
  place?: string | null;
  commentCount: number;
  /** Authorized Meet Dot attached to this moment, if any. */
  dot?: { label: string; savedOnchain: boolean } | null;
  /** Authored by the viewer: shows "Location not shared" instead of hiding the place row. */
  own?: boolean;
};

/**
 * The same front/back pair everywhere (A.02): back photo fills, the selfie sits in
 * the top-left corner. Both photos keep their own audience checks upstream.
 */
export function PairedPhoto({
  backSrc,
  frontSrc,
  authorName,
  className,
  selfie = "md",
}: {
  backSrc?: string | null;
  frontSrc?: string | null;
  authorName: string;
  className?: string;
  selfie?: "md" | "lg";
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[22px] bg-mootz-lilac", className)}>
      <Photo src={backSrc} alt={`Back camera photo by ${authorName}`} className="absolute inset-0" />
      <Photo
        src={frontSrc}
        alt={`Selfie by ${authorName}`}
        className={cn(
          "absolute left-3 top-3 rounded-[18px] border-[3px] border-white",
          selfie === "md" ? "h-[104px] w-[84px]" : "h-[150px] w-[120px]",
        )}
      />
    </div>
  );
}

export function MomentByline({ author, postedLabel, avatarSize = 52 }: { author: MomentAuthor; postedLabel: string; avatarSize?: number }) {
  return (
    <div className="flex min-h-[52px] items-center gap-3">
      <Avatar src={author.avatarSrc} name={author.name} frame={author.frame} size={avatarSize} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-mootz-ink">{author.name}</p>
        <p className="truncate text-sm text-mootz-muted">{postedLabel}</p>
      </div>
    </div>
  );
}

/** React + Comments. Both open supporting panels that replace the moment sheet. */
export function MomentActions({
  commentCount,
  onReact,
  onComments,
  className,
}: {
  commentCount: number;
  onReact?: () => void;
  onComments?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Button variant="secondary" icon={ScanFace} className="flex-1" onClick={onReact}>
        React
      </Button>
      <Button variant="secondary" icon={MessageCircle} className="flex-1" onClick={onComments}>
        Comments {commentCount}
      </Button>
    </div>
  );
}

/** "A & B were here". Lock only after confirmed onchain recording. */
export function MeetDotChip({ label, savedOnchain, className }: { label: string; savedOnchain: boolean; className?: string }) {
  return (
    <p className={cn("flex min-h-11 items-center gap-2 bg-mootz-lilac px-3 text-[13px] text-mootz-deep", className)}>
      {savedOnchain && <LockKeyhole aria-label="Saved onchain" size={14} strokeWidth={2.5} />}
      {label}
    </p>
  );
}

/** Own eligible moment (01.07): optional entry into Meet. Never blocks the post itself. */
export function MeetEntry({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center justify-between gap-2 bg-mootz-lilac px-4 text-[13px] font-bold text-mootz-deep", className)}>
      Meet · Photographed a friend?
      <ScanLine aria-hidden size={18} />
    </Link>
  );
}

function NoLocationRow() {
  return (
    <p className="flex min-h-11 items-center gap-1.5 text-xs text-mootz-muted">
      <MapPinOff aria-hidden size={18} strokeWidth={2.25} />
      Location not shared
    </p>
  );
}

function PlaceRow({ place, onViewOnMap, compact }: { place: string; onViewOnMap?: () => void; compact?: boolean }) {
  return (
    <div className="flex min-h-11 items-center gap-1.5">
      <MapPin aria-hidden size={18} strokeWidth={2.25} className="shrink-0 text-mootz-deep" />
      <p className={cn("min-w-0 flex-1 truncate text-mootz-muted", compact ? "text-sm" : "text-xs")}>{place} · Posted here</p>
      {onViewOnMap && (
        <Button variant="secondary" icon={MapPin} onClick={onViewOnMap} className="shrink-0 px-3">
          View on map
        </Button>
      )}
    </div>
  );
}

/** Feed post (A.02, 390 wide): immersive pair with actions overlaid on the photo. */
export function FeedPost({
  moment,
  onReact,
  onComments,
  onViewOnMap,
  meetHref,
  detailHref,
  footer,
}: {
  moment: MomentView;
  onReact?: () => void;
  onComments?: () => void;
  onViewOnMap?: () => void;
  meetHref?: string;
  /** Moment detail page; makes the byline and caption open it. */
  detailHref?: string;
  /** Extra row under the post, e.g. an event chip. */
  footer?: ReactNode;
}) {
  return (
    <article className="flex w-full flex-col gap-2">
      {detailHref ? (
        <Link href={detailHref} className="block px-4">
          <MomentByline author={moment.author} postedLabel={moment.postedLabel} avatarSize={40} />
        </Link>
      ) : (
        <div className="px-4">
          <MomentByline author={moment.author} postedLabel={moment.postedLabel} avatarSize={40} />
        </div>
      )}
      <div className="relative">
        <PairedPhoto
          backSrc={moment.backSrc}
          frontSrc={moment.frontSrc}
          authorName={moment.author.name}
          className="aspect-[390/470] w-full lg:aspect-[560/540]"
        />
        <MomentActions
          commentCount={moment.commentCount}
          onReact={onReact}
          onComments={onComments}
          className="absolute inset-x-3 bottom-3"
        />
      </div>
      {moment.caption &&
        (detailHref ? (
          <Link href={detailHref} className="px-4 text-lg leading-tight text-mootz-ink">
            {moment.caption}
          </Link>
        ) : (
          <p className="px-4 text-lg leading-tight text-mootz-ink">{moment.caption}</p>
        ))}
      {moment.place ? (
        <div className="px-4">
          <PlaceRow place={moment.place} onViewOnMap={onViewOnMap} />
        </div>
      ) : (
        moment.own && (
          <div className="px-4">
            <NoLocationRow />
          </div>
        )
      )}
      {moment.dot && <MeetDotChip label={moment.dot.label} savedOnchain={moment.dot.savedOnchain} className="px-4" />}
      {meetHref && <MeetEntry href={meetHref} />}
      {footer}
    </article>
  );
}

/** White sheet surface with drag handle; used for moment preview and supporting panels. */
export function Sheet({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <section
      aria-label={label}
      className={cn("flex flex-col gap-2 rounded-t-[32px] bg-mootz-surface px-4 pb-4 pt-2.5 shadow-float sm:rounded-[32px]", className)}
    >
      {children}
    </section>
  );
}

/** Moment preview sheet on the Map (A.02). Compact shows less; expanded adds caption, place and Dot. */
export function MomentSheet({
  moment,
  expanded,
  onToggle,
  onClose,
  onReact,
  onComments,
  meetHref,
  footer,
}: {
  moment: MomentView;
  expanded: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  onReact?: () => void;
  onComments?: () => void;
  meetHref?: string;
  footer?: ReactNode;
}) {
  return (
    <Sheet label={`Moment by ${moment.author.name}`}>
      <div className="flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex h-11 w-[88px] items-center gap-1.5 text-xs text-mootz-muted"
        >
          <ChevronDown aria-hidden size={18} className={cn("transition-transform", !expanded && "rotate-180")} />
          {expanded ? "Compact" : "Expand"}
        </button>
        <span aria-hidden className="h-1 w-10 rounded bg-mootz-handle" />
        <IconButton icon={X} label="Close preview" onClick={onClose} />
      </div>
      <MomentByline author={moment.author} postedLabel={moment.postedLabel} />
      <PairedPhoto
        backSrc={moment.backSrc}
        frontSrc={moment.frontSrc}
        authorName={moment.author.name}
        className={cn("w-full", expanded ? "h-[280px]" : "h-[200px]")}
      />
      {expanded && moment.caption && <p className="text-base text-mootz-ink">{moment.caption}</p>}
      {expanded && moment.place && <PlaceRow place={moment.place} compact />}
      <MomentActions commentCount={moment.commentCount} onReact={onReact} onComments={onComments} />
      {expanded && moment.dot && (
        <MeetDotChip label={moment.dot.label} savedOnchain={moment.dot.savedOnchain} className="rounded-[14px]" />
      )}
      {meetHref && <MeetEntry href={meetHref} className="rounded-[14px]" />}
      {footer}
    </Sheet>
  );
}
