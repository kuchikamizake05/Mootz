"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Address, EIP1193Provider } from "viem";
import { CircleSlash, LoaderCircle, PlugZap, RefreshCw, ServerCrash, ShieldCheck, Wallet, WalletMinimal, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/status";
import { env } from "@/lib/env";
import { contractsDeployed, getInjectedProvider, proveControl, readRecognition, requestAccount } from "./chain";
import { DEMO_ADDRESS, runDemo, type DemoScenario } from "./demo";
import { isUserRejection, shortAddress, type Recognition } from "./logic";

type State =
  | { step: "disconnected" }
  | { step: "connecting" }
  | { step: "authenticating"; address: Address }
  | { step: "reading"; address: Address }
  | { step: "result"; address: Address; result: Recognition }
  | { step: "error"; address: Address; demo?: DemoScenario }
  | { step: "failed"; reason: "cancelled" | "no-wallet" | "mismatch" | "wallet-error" };

const LIMITATION =
  "Recognition reads public ownership and recorded Meets. It isn't proof of attendance or unique people; Meets not saved onchain aren't counted.";

export function OrganizerDemo({ collectionId }: { collectionId: string | null }) {
  const [state, setState] = useState<State>({ step: "disconnected" });
  const attempt = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const reset = () => {
    attempt.current++;
    cleanup.current?.();
    cleanup.current = null;
    setState({ step: "disconnected" });
  };

  const read = async (address: Address, id: number) => {
    if (collectionId === null) return;
    setState({ step: "reading", address });
    try {
      const result = await readRecognition(address, BigInt(collectionId));
      if (attempt.current === id) setState({ step: "result", address, result });
    } catch {
      if (attempt.current === id) setState({ step: "error", address });
    }
  };

  const connect = async () => {
    const id = ++attempt.current;
    const provider = getInjectedProvider();
    if (!provider) return setState({ step: "failed", reason: "no-wallet" });
    setState({ step: "connecting" });
    let address: Address;
    try {
      address = await requestAccount(provider);
      if (attempt.current !== id) return;
      setState({ step: "authenticating", address });
      const ok = await proveControl(provider, address);
      if (attempt.current !== id) return;
      if (!ok) return setState({ step: "failed", reason: "mismatch" });
    } catch (error) {
      if (attempt.current !== id) return;
      return setState({ step: "failed", reason: isUserRejection(error) ? "cancelled" : "wallet-error" });
    }
    watchAccounts(provider);
    if (contractsDeployed) await read(address, id);
    else setState({ step: "result", address, result: { kind: "missing-collection" } });
  };

  const watchAccounts = (provider: EIP1193Provider) => {
    cleanup.current?.();
    const onChange = () => reset();
    provider.on("accountsChanged", onChange);
    cleanup.current = () => provider.removeListener("accountsChanged", onChange);
  };

  const demo = async (scenario: DemoScenario) => {
    const id = ++attempt.current;
    cleanup.current?.();
    cleanup.current = null;
    setState({ step: "reading", address: DEMO_ADDRESS });
    try {
      const result = await runDemo(scenario);
      if (attempt.current === id) setState({ step: "result", address: DEMO_ADDRESS, result });
    } catch {
      if (attempt.current === id) setState({ step: "error", address: DEMO_ADDRESS, demo: scenario });
    }
  };

  const retry = () => {
    if (state.step !== "error") return;
    const id = ++attempt.current;
    if (state.demo) void demo("alumni");
    else void read(state.address, id);
  };

  const connected = state.step === "authenticating" || state.step === "reading" || state.step === "result" || state.step === "error";

  return (
    <main className="min-h-dvh bg-mootz-canvas text-mootz-ink">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:px-10 lg:py-16">
        <section className="flex flex-col gap-4">
          <p className="text-xs font-extrabold text-mootz-deep">Organizer demo / Monad Testnet</p>
          <h1 className="font-display text-5xl leading-none lg:text-7xl">Demo Gathering B</h1>
          <p className="font-bold text-mootz-muted">Recognizing Workshop A memories</p>
          <div className="raised flex items-center gap-4 rounded-[28px] bg-mootz-surface p-4">
            <Avatar name="Demo Workshop A" size={80} frame="event" />
            <div className="flex flex-col text-sm font-extrabold text-mootz-deep">
              <span>Demo Workshop A frame</span>
              <span>Demo Community</span>
              <span>From Demo Workshop A{collectionId ? ` · Collection #${collectionId}` : ""}</span>
            </div>
          </div>
          <p className="hidden text-sm text-mootz-muted lg:block">
            Gathering B is an independent organizer. It never calls a Mootz API or database: it reads public contracts directly from Monad.
          </p>
        </section>

        <section className="flex flex-col gap-4 lg:rounded-[28px] lg:bg-mootz-surface lg:p-8 lg:shadow-float" aria-live="polite">
          {collectionId === null ? (
            <StateMessage icon={CircleSlash} title="Collection not valid">
              The collection in the link must be a positive whole number, for example ?collection=1.
            </StateMessage>
          ) : (
            <Body
              state={state}
              collectionId={collectionId}
              onConnect={connect}
              onRetry={retry}
            />
          )}

          {connected && (
            <p className="text-sm font-bold text-mootz-muted">
              {shortAddress(state.address)}
              {state.address === DEMO_ADDRESS ? " · Demo fixture" : state.step === "authenticating" ? " · Confirm in wallet" : " · Authenticated"}
            </p>
          )}
          <p className="text-sm text-mootz-muted">{LIMITATION}</p>
          {connected && (
            <Button variant="secondary" size="lg" block onClick={reset}>
              Disconnect
            </Button>
          )}

          {env.demoFixtures && (
            <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-dashed border-mootz-hairline p-3">
              <p className="text-xs font-extrabold text-mootz-deep">Demo mode (fixtures, no chain reads)</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="soft" onClick={() => void demo("alumni")}>Demo: alumni</Button>
                <Button variant="soft" onClick={() => void demo("nonholder")}>Demo: nonholder</Button>
                <Button variant="soft" onClick={() => void demo("error")}>Demo: RPC error</Button>
              </div>
            </div>
          )}

          <p className="text-xs font-bold text-mootz-muted">
            Illustrative hackathon page. No real partnership or admission benefit. Private photos stay in Mootz; only wallet-level records are read here.
          </p>
        </section>
      </div>
    </main>
  );
}

function Body({ state, collectionId, onConnect, onRetry }: { state: State; collectionId: string; onConnect: () => void; onRetry: () => void }) {
  const connectButton = (label: string): ReactNode => (
    <Button size="lg" icon={Wallet} onClick={onConnect}>{label}</Button>
  );

  switch (state.step) {
    case "disconnected":
      return (
        <>
          {!contractsDeployed && (
            <StateMessage icon={PlugZap} title="Contracts aren't deployed yet">
              This organizer demo can&apos;t read the chain. You can still connect a wallet to review the flow.
            </StateMessage>
          )}
          {contractsDeployed && (
            <StateMessage icon={WalletMinimal} title="Connect a wallet to be recognized">
              Gathering B checks the wallet directly on Monad. No Mootz account is needed.
            </StateMessage>
          )}
          <div>{connectButton("Connect wallet")}</div>
        </>
      );
    case "connecting":
      return <StateMessage busy icon={LoaderCircle} title="Connecting wallet">Approve the connection in your wallet.</StateMessage>;
    case "authenticating":
      return (
        <StateMessage busy icon={LoaderCircle} title="Confirm this wallet">
          Sign the fresh message in your wallet. It proves you control this wallet and costs nothing.
        </StateMessage>
      );
    case "reading":
      return (
        <StateMessage busy icon={LoaderCircle} title="Reading directly from Monad">
          Source: EventCollection {env.eventCollectionAddress ?? "(demo fixture)"} · collection #{collectionId}
        </StateMessage>
      );
    case "error":
      return (
        <StateMessage
          icon={ServerCrash}
          title="Couldn't read from Monad"
          actions={<Button icon={RefreshCw} onClick={onRetry}>Retry</Button>}
        >
          The network didn&apos;t answer, so we can&apos;t tell whether this wallet holds the collectible. This is not a nonholder result.
        </StateMessage>
      );
    case "failed":
      return <Failure reason={state.reason} action={state.reason === "no-wallet" ? null : connectButton("Try again")} />;
    case "result":
      return <Result result={state.result} collectionId={collectionId} />;
  }
}

function Failure({ reason, action }: { reason: "cancelled" | "no-wallet" | "mismatch" | "wallet-error"; action: ReactNode }) {
  const copy = {
    "no-wallet": ["No wallet found", "Open this page in a wallet browser or install a wallet extension, then reload."],
    cancelled: ["Request cancelled", "Nothing was read. Connect again whenever you're ready."],
    mismatch: ["Signature didn't match", "The signature did not come from the connected wallet, so nothing was read."],
    "wallet-error": ["Wallet couldn't confirm", "Your wallet returned an error. Try again."],
  }[reason];
  return (
    <StateMessage icon={reason === "cancelled" ? XCircle : CircleSlash} title={copy[0]} actions={action}>
      {copy[1]}
    </StateMessage>
  );
}

function Result({ result, collectionId }: { result: Recognition; collectionId: string }) {
  if (result.kind === "missing-collection") {
    return (
      <StateMessage icon={PlugZap} title={contractsDeployed ? `Collection #${collectionId} doesn't exist` : "Contracts aren't deployed yet"}>
        {contractsDeployed ? "The contract has no event for this collection, so there is nothing to compare." : "This organizer demo can't read the chain."}
      </StateMessage>
    );
  }
  const count = Number(result.meetCount);
  const meets = `${count} Meet${count === 1 ? "" : "s"} recorded at Workshop A`;
  return (
    <div className="flex flex-col gap-3">
      <ShieldCheck aria-hidden size={32} className="text-mootz-deep" />
      <h2 className="font-display text-[34px] leading-tight">
        {result.kind === "alumni" ? "Welcome back, Workshop A alumni" : "No Workshop A collectible found"}
      </h2>
      <p className="text-lg font-extrabold text-mootz-deep">{meets}</p>
      {result.kind === "nonholder" && (
        <p className="text-sm text-mootz-muted">
          This wallet doesn&apos;t hold the collectible. It was read successfully, so this is a confirmed nonholder.
        </p>
      )}
      <p className="text-sm font-bold text-mootz-muted">Read directly from Monad.</p>
      <p className="text-sm text-mootz-muted">Meets not saved onchain aren&apos;t counted here.</p>
    </div>
  );
}
