"use client";

import type { ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { env } from "@/lib/env";

/** Requires a Privy session for app routes. Demo fixture mode is a UI-only preview without login. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authenticated, login } = usePrivy();

  if (env.demoFixtures) return children;

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-mootz-canvas p-6">
        <StateMessage icon={LoaderCircle} busy title="Loading…" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-mootz-canvas px-4 py-12 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/brand/mootz-logo-v1.svg" alt="Mootz" width={240} height={83} />
        <h1 className="font-display text-4xl text-mootz-deep">Your friends, in the picture.</h1>
        <Button size="lg" onClick={() => login()} className="w-60">
          Sign in
        </Button>
      </main>
    );
  }

  return children;
}
