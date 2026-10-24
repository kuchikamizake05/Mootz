"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MeetFrame } from "../ui/meet-frame";
import { closeFlow } from "../ui/nav";

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
  const back = () => closeFlow(router);
  return (
    <MeetFrame title="What's recorded?" onClose={back}>
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="font-display text-[22px] leading-tight">{s.title}</h2>
          <p className="mt-1 text-[15px] text-mootz-muted">{s.body}</p>
        </section>
      ))}
      <Button variant="secondary" block onClick={back}>
        Back
      </Button>
    </MeetFrame>
  );
}
