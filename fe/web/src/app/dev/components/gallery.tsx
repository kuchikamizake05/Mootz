"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarDays, Images, ImageOff, LoaderCircle, LocateFixed, LocateOff, Map as MapIcon, MapPin, MapPinOff, Users, WifiOff, X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { BottomActions, ControlChip, DotsCountChip, FilterChip, PostMomentButton } from "@/components/ui/controls";
import {
  AvatarMomentMarker, ClusterMarker, EventVenueMarker, MeetDotMarker, PhotoMomentMarker, YourLocationDot,
} from "@/components/ui/map-markers";
import { FeedPost, MeetDotChip, MomentActions, MomentSheet, PairedPhoto, type MomentView } from "@/components/ui/moment";
import { RecordingStatusRow, SelfieTile, StateMessage } from "@/components/ui/status";
import { ViewSwitch } from "@/components/ui/view-switch";

// Fictional demo photos from Mootz.pen (local only, public/demo is gitignored).
const demo = {
  friendA: "/demo/generated-2.jpg",
  faaid: "/demo/generated-4.jpg",
  coffee: "/demo/generated-6.jpg",
};

const momentA: MomentView = {
  author: { name: "Demo friend A", avatarSrc: demo.friendA, frame: "lilac" },
  postedLabel: "12m ago · Demo moment",
  backSrc: demo.coffee,
  frontSrc: demo.friendA,
  caption: "Coffee before the next session.",
  place: "UGM campus",
  commentCount: 3,
  dot: { label: "Demo A & Demo B were here", savedOnchain: true },
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-mootz-hairline py-10">
      <h2 id={id} className="mb-6 text-xs font-extrabold uppercase tracking-wider text-mootz-deep">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-start gap-3">
      {children}
      <figcaption className="text-sm text-mootz-muted">{label}</figcaption>
    </figure>
  );
}

const tokens = [
  ["Deep purple", "bg-mootz-deep text-white", "#4C1D95"],
  ["Primary purple", "bg-mootz-purple text-white", "#6D28D9"],
  ["Light purple", "bg-mootz-light text-mootz-ink", "#C4B5FD"],
  ["Lilac canvas", "bg-mootz-canvas text-mootz-ink", "#F4F0FF"],
  ["Primary ink", "bg-mootz-ink text-white", "#21152F"],
  ["Secondary ink", "bg-mootz-muted text-white", "#62566F"],
] as const;

export function Gallery() {
  const [expanded, setExpanded] = useState(false);
  const [selfie, setSelfie] = useState(0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
      <img src="/brand/mootz-logo-v1.svg" alt="Mootz" width={160} height={56} />
      <h1 className="mt-6 font-display text-5xl text-mootz-ink">A little closer. A memory together.</h1>
      <p className="mt-2 text-mootz-muted">Component review · compare with pen.dev boards A.01–A.05 and B.01</p>

      <Section id="tokens" title="Tokens · A.01">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {tokens.map(([name, cls, hex]) => (
            <div key={name} className={`rounded-[20px] p-4 ${cls}`}>
              <p>{name}</p>
              <p className="text-sm">{hex}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-2">
          <p className="font-display text-4xl text-mootz-ink">Your friends, in the picture.</p>
          <p className="text-mootz-muted">Barlow Condensed ExtraBold / short display</p>
          <p className="text-mootz-muted">Nunito Sans / names, captions, actions · 16 body · 14 metadata · 12 map labels</p>
        </div>
      </Section>

      <Section id="controls" title="Controls · A.01">
        <div className="flex flex-wrap items-end gap-8">
          <Specimen label="Map selected"><ViewSwitch active="map" hrefs={{ map: "#", feed: "#" }} /></Specimen>
          <Specimen label="Feed selected"><ViewSwitch active="feed" hrefs={{ map: "#", feed: "#" }} /></Specimen>
          <Specimen label="View on map"><Button variant="secondary" size="lg" icon={MapPin} className="w-[180px]">View on map</Button></Specimen>
          <Specimen label="Close"><IconButton icon={X} label="Close" /></Specimen>
          <Specimen label="Locate me"><IconButton icon={LocateFixed} label="Locate me" size={56} /></Specimen>
          <Specimen label="Friends"><IconButton icon={Users} label="Friends" size={56} /></Specimen>
        </div>
        <div className="mt-10 flex flex-wrap items-end gap-8">
          <Specimen label="Button feel · Raised"><Button className="w-44">Raised</Button></Specimen>
          <Specimen label="Unavailable"><Button className="w-44" disabled>Unavailable</Button></Specimen>
          <Specimen label="Soft"><Button variant="soft">Open feed</Button></Specimen>
          <Specimen label="Events"><ControlChip icon={CalendarDays} label="Events" /></Specimen>
          <Specimen label="Your Dots"><DotsCountChip count={12} /></Specimen>
          <Specimen label="Filter"><FilterChip value="all" /></Specimen>
          <Specimen label="Post moment"><PostMomentButton /></Specimen>
        </div>
        <div className="mt-10 flex flex-wrap items-end gap-8">
          <Specimen label="Bottom actions · Events · Camera · Scan to Meet"><BottomActions /></Specimen>
          <Specimen label="Moment actions"><MomentActions commentCount={3} className="w-[358px]" /></Specimen>
        </div>
      </Section>

      <Section id="avatars" title="Avatars and frames · A.01 / A.03 / A.05">
        <div className="flex flex-wrap items-end gap-8">
          <Specimen label="Lilac frame"><Avatar src={demo.friendA} name="Demo friend A" /></Specimen>
          <Specimen label="Event frame"><Avatar src={demo.faaid} name="Faaid" frame="event" size={56} /></Specimen>
          <Specimen label="Achievement frame"><Avatar src={demo.faaid} name="Faaid" frame="achievement" size={56} /></Specimen>
          <Specimen label="Selected ≠ frame"><Avatar src={demo.friendA} name="Demo friend A" selected /></Specimen>
          <Specimen label="No photo"><Avatar name="Demo friend C" /></Specimen>
        </div>
      </Section>

      <Section id="markers" title="Map markers · A.01 / A.03 / A.05">
        <div className="flex flex-wrap items-center gap-10 rounded-[28px] bg-[#F2F1ED] p-8">
          <Specimen label="Avatar-led post"><AvatarMomentMarker author="Demo friend A" avatarSrc={demo.friendA} photoSrc={demo.coffee} /></Specimen>
          <Specimen label="Photo-led post"><PhotoMomentMarker author="Demo friend A" avatarSrc={demo.friendA} photoSrc={demo.coffee} /></Specimen>
          <Specimen label="Selected"><PhotoMomentMarker author="Demo friend A" avatarSrc={demo.friendA} photoSrc={demo.coffee} selected /></Specimen>
          <Specimen label="2 demo posts"><ClusterMarker count={2} /></Specimen>
          <Specimen label="Event venue"><EventVenueMarker place="GIK" name="Demo event" /></Specimen>
          <Specimen label="Saved onchain"><MeetDotMarker savedOnchain label="Meet Dot, saved onchain" /></Specimen>
          <Specimen label="Not saved onchain"><MeetDotMarker savedOnchain={false} label="Meet Dot" /></Specimen>
          <Specimen label="Your location"><YourLocationDot /></Specimen>
        </div>
      </Section>

      <Section id="moment" title="Moment + Feed · A.02">
        <div className="flex flex-wrap items-start gap-10">
          <div className="w-[390px] max-w-full">
            <MomentSheet moment={momentA} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
          </div>
          <div className="w-[390px] max-w-full">
            <FeedPost moment={momentA} onViewOnMap={() => {}} />
          </div>
          <Specimen label="Paired photo · Map size">
            <PairedPhoto backSrc={demo.coffee} frontSrc={demo.friendA} authorName="Demo friend A" className="size-[280px]" />
          </Specimen>
        </div>
      </Section>

      <Section id="meet" title="Meet and Dot · A.05">
        <div className="grid max-w-xl gap-3">
          <RecordingStatusRow status="saved" />
          <RecordingStatusRow status="pending" />
          <RecordingStatusRow status="failed" onRetry={() => {}} />
          <RecordingStatusRow status="off" />
          <MeetDotChip label="Faaid & Demo B were here" savedOnchain className="rounded-[14px]" />
        </div>
        <div className="mt-8 grid max-w-xl gap-3">
          <Button size="lg" block>Meet</Button>
          <Button size="lg" block>Approve</Button>
        </div>
      </Section>

      <Section id="selfies" title="Saved selfies · M09">
        <div className="grid max-w-xl grid-cols-3 gap-3">
          {["Saved 01", "Saved 02", "Saved 03"].map((label, i) => (
            <SelfieTile key={label} label={label} src={[demo.faaid, demo.friendA, demo.faaid][i]} selected={selfie === i} onClick={() => setSelfie(i)} />
          ))}
        </div>
      </Section>

      <Section id="states" title="States · B.01">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <StateMessage icon={MapIcon} title="Loading the map…">Keep Map | Feed visible.</StateMessage>
          <StateMessage icon={LoaderCircle} busy title="Loading this moment…" />
          <StateMessage icon={MapPin} title="No moments on the map yet." actions={<Button>Open feed</Button>}>
            Shared locations will appear here.
          </StateMessage>
          <StateMessage icon={Images} title="No moments yet." actions={<PostMomentButton size={64} />}>
            Share both sides of your day.
          </StateMessage>
          <StateMessage icon={MapPinOff} title="The map couldn’t load." actions={<><Button>Retry</Button><Button variant="soft">Open feed</Button></>}>
            Retry map tiles only. Feed stays available.
          </StateMessage>
          <StateMessage icon={WifiOff} title="Your moments couldn’t load." actions={<Button>Retry</Button>}>
            Retry the Feed without resetting the map.
          </StateMessage>
          <StateMessage icon={ImageOff} title="Photo unavailable." />
          <StateMessage icon={LocateOff} title="We couldn’t find your location." actions={<Button>Retry</Button>}>
            You can still browse the map and Feed.
          </StateMessage>
        </div>
      </Section>
    </main>
  );
}
