"use client";

import { useEffect, useRef } from "react";
import { useConnectWallet, useCreateWallet, useWallets, type ConnectedWallet } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { createWalletClient, custom, type Address, type Hex, type TypedDataDefinition } from "viem";
import { mootzChain } from "@/lib/chain/network";
import { jsonBody } from "@/lib/api/client";
import { useApi, useProfile, type Profile } from "@/lib/api/use-api";
import { canonicalSignature } from "@/features/meet/protocol";

/**
 * "none": no wallet linked to the Mootz account yet.
 * "disconnected": a wallet is linked but isn't available in this browser (reconnect it).
 * "ready": the linked wallet can sign here.
 * Login identity and wallet are separate; only the backend-verified binding counts.
 */
export type MeetWalletStatus = "loading" | "none" | "disconnected" | "ready";

async function walletClient(wallet: ConnectedWallet) {
  // Some wallets refuse typed data whose domain chain isn't the active chain.
  await wallet.switchChain(mootzChain.id).catch(() => {});
  return createWalletClient({ account: wallet.address as Address, chain: mootzChain, transport: custom(await wallet.getEthereumProvider()) });
}

export function useMeetWallet() {
  const { wallets, ready } = useWallets();
  const { createWallet } = useCreateWallet();
  const { connectWallet } = useConnectWallet();
  const profile = useProfile();
  const api = useApi();
  const queryClient = useQueryClient();

  const bound = (profile.data?.wallet ?? null) as Address | null;
  const active = bound ? wallets.find((w) => w.address.toLowerCase() === bound.toLowerCase()) : undefined;
  const status: MeetWalletStatus = !ready || profile.isPending ? "loading" : !bound ? "none" : active ? "ready" : "disconnected";

  // createWallet() resolves before useWallets() re-renders with the new ConnectedWallet.
  const walletsRef = useRef(wallets);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  /** Creates an embedded wallet if the user has none, then proves control with the backend challenge. */
  const linkWallet = async () => {
    let target: ConnectedWallet | undefined = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    if (!target) {
      const created = await createWallet();
      for (let i = 0; i < 50 && !target; i++) {
        await new Promise((r) => setTimeout(r, 100));
        target = walletsRef.current.find((w) => w.address.toLowerCase() === created.address.toLowerCase());
      }
    }
    if (!target) throw new Error("WALLET_NOT_READY");
    const challenge = await api<{ challengeId: string; message: string }>("/v1/me/wallet-challenges", jsonBody({ wallet: target.address }));
    const client = await walletClient(target);
    const signature = canonicalSignature(await client.signMessage({ account: target.address as Address, message: challenge.message }));
    await api("/v1/me/wallet-bindings", jsonBody({ challengeId: challenge.challengeId, wallet: target.address, signature }));
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  /** Signs EIP-712 data with the linked wallet; returns a canonical 65-byte signature (v = 27/28). */
  const signTypedData = async (data: TypedDataDefinition): Promise<Hex> => {
    if (!active) throw new Error("WALLET_NOT_READY");
    const client = await walletClient(active);
    return canonicalSignature(await client.signTypedData({ account: active.address as Address, ...data } as Parameters<typeof client.signTypedData>[0]));
  };

  /** Updates the Save Meets onchain preference (applies to future Meets only). */
  const setRecordMeet = async (recordMeet: boolean) => {
    const next = await api<Profile>("/v1/me/preferences", jsonBody({ recordMeet }, "PATCH"));
    queryClient.setQueriesData({ queryKey: ["me"] }, next);
    return next;
  };

  return { status, address: bound, linkWallet, reconnect: () => connectWallet(), signTypedData, setRecordMeet, profile: profile.data } as const;
}
