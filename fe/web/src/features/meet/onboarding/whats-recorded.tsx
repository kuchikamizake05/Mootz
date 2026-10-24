"use client";

import { useRouter } from "next/navigation";
import { MeetFrame } from "../ui/meet-frame";

const sections = [
  {
    title: "Public, only with both opt-ins",
    body: "Wallet pair, Meet time, optional event ID and a salted photo commitment.",
  },
  {
    title: "Private in Mootz",
    body: "Photos, selfies, names and both verification and display locations stay offchain with audience checks.",
  },
  {
    title: "Your choice, future Meets only",
    body: "Turning saving off does not remove old records. Hiding a Dot changes the map, not an existing onchain record.",
  },
  {
    title: "No proof of unique humans",
    body: "Signatures confirm approval. The backend checks a one-time distance; none of this guarantees photo authenticity or physical attendance.",
  },
];

export function WhatsRecorded() {
  const router = useRouter();
  const back = () => router.back();
  return (
    <MeetFrame title="What's recorded?" onBack={back} centeredTitle>
      {sections.map((s) => (
        <section key={s.title} className="border-b border-mootz-hairline pb-5 last:border-0">
          <h2 className="font-display text-[25px] leading-tight">{s.title}</h2>
          <p className="mt-2 text-[15px] leading-[1.4] text-mootz-muted">{s.body}</p>
        </section>
      ))}
    </MeetFrame>
  );
}
