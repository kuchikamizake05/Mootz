"use client";

import { useRouter } from "next/navigation";
import { MeetFrame } from "../ui/meet-frame";
import { Card, SectionLabel } from "@/components/ui/page";
import { CircleUserRound, Eye, LockKeyhole, Settings2 } from "lucide-react";

const sections = [
  {
    title: "Public, only with both opt-ins",
    icon: Eye,
    body: "Wallet pair, Meet time, optional event ID and a salted photo commitment.",
  },
  {
    title: "Private in Mootz",
    icon: LockKeyhole,
    body: "Photos, selfies, names and both verification and display locations stay offchain with audience checks.",
  },
  {
    title: "Your choice, future Meets only",
    icon: Settings2,
    body: "Turning saving off does not remove old records. Hiding a Dot changes the map, not an existing onchain record.",
  },
  {
    title: "No proof of unique humans",
    icon: CircleUserRound,
    body: "Signatures confirm approval. The backend checks a one-time distance; none of this guarantees photo authenticity or physical attendance.",
  },
];

export function WhatsRecorded() {
  const router = useRouter();
  const back = () => router.back();
  return (
    <MeetFrame title="What's recorded?" onBack={back} centeredTitle>
      {sections.map((s) => (
        <Card key={s.title}>
          <SectionLabel icon={s.icon}>{s.title}</SectionLabel>
          <p className="mt-2 text-[15px] leading-relaxed text-mootz-muted">{s.body}</p>
        </Card>
      ))}
    </MeetFrame>
  );
}
