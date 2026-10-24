"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, WalletMinimal } from "lucide-react";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import type { Profile } from "@/lib/api/use-api";
import { useMeetWallet } from "@/features/wallet/use-meet-wallet";
import { MeetFrame } from "./meet-frame";
import { closeFlow, stashPayload } from "./nav";

export type ReadyWallet = {
  address: Address;
  profile: Profile;
  signTypedData: ReturnType<typeof useMeetWallet>["signTypedData"];
};

/**
 * Meet needs a linked, usable wallet and a finished Meet onboarding. Only then do the
 * children render. Onboarding sends the user back via `next`.
 */
export function MeetGate({
  title,
  children,
}: {
  title: string;
  children: (wallet: ReadyWallet) => ReactNode;
}) {
  const router = useRouter();
  const wallet = useMeetWallet();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const profile = wallet.profile;
  const needsOnboarding = wallet.status === "ready" && !!profile && !profile.onboardingCompletedAt;

  useEffect(() => {
    if (!needsOnboarding) return;
    const { pathname, search, hash } = window.location;
    // The QR payload must not travel in the query string; it waits in sessionStorage instead.
    if (hash) stashPayload(hash);
    router.replace(`/meet/onboarding?next=${encodeURIComponent(pathname + search)}`);
  }, [needsOnboarding, router]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // Gate screens always use the light frame: StateMessage text is ink-on-light.
  const frame = (body: ReactNode) => (
    <MeetFrame title={title} onClose={() => closeFlow(router)}>
      <div className="my-auto flex w-full flex-col py-8 [&_h2]:text-[32px] [&_h2]:leading-tight [&_button]:w-full [&_button]:min-h-12 [&>div]:gap-3 [&>div>div:last-child]:w-full">{body}</div>
    </MeetFrame>
  );

  if (wallet.status === "loading" || needsOnboarding || (wallet.status === "ready" && !profile)) {
    return frame(<StateMessage icon={LoaderCircle} busy title="Loading…" />);
  }

  if (wallet.status === "none" || wallet.status === "disconnected") {
    const none = wallet.status === "none";
    return frame(
      <StateMessage
        icon={WalletMinimal}
        title={none ? "Set up your wallet" : "Reconnect your wallet"}
        actions={
          <Button icon={WalletMinimal} disabled={busy} onClick={() => run(none ? wallet.linkWallet : async () => wallet.reconnect())}>
            {busy ? "Working…" : none ? "Set up wallet" : "Reconnect wallet"}
          </Button>
        }
      >
        <p>
          {none
            ? "Meet needs a wallet linked to your Mootz account so both of you can confirm a Meet. Setting it up doesn't save anything onchain."
            : "Your linked wallet isn't available in this browser. Reconnect it to confirm a Meet."}
        </p>
        <p role="status" className="mt-2">
          {failed ? "That didn't work. Nothing was changed. Try again." : ""}
        </p>
      </StateMessage>,
    );
  }

  return children({ address: wallet.address as Address, profile: profile!, signTypedData: wallet.signTypedData });
}
