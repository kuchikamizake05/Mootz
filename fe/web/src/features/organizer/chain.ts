import { createPublicClient, createWalletClient, custom, http, recoverMessageAddress, isAddressEqual, type Address, type EIP1193Provider } from "viem";
import { mootzChain } from "@/lib/chain/network";
import eventCollectionAbiJson from "@/lib/chain/generated/abi/EventCollection.json";
import meetRegistryAbiJson from "@/lib/chain/generated/abi/MeetRegistry.json";
import { env } from "@/lib/env";
import { buildChallenge, classify, newNonce, type Recognition } from "./logic";

const eventCollectionAbi = eventCollectionAbiJson as typeof eventCollectionAbiJson & readonly unknown[];
const meetRegistryAbi = meetRegistryAbiJson as typeof meetRegistryAbiJson & readonly unknown[];

export function getInjectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum ?? null;
}

export const contractsDeployed = env.eventCollectionAddress !== null && env.meetRegistryAddress !== null;

export async function requestAccount(provider: EIP1193Provider): Promise<Address> {
  const wallet = createWalletClient({ chain: mootzChain, transport: custom(provider) });
  const [address] = await wallet.requestAddresses();
  if (!address) throw new Error("No account returned by wallet");
  return address;
}

/** Signs a fresh challenge and verifies locally that the signer is the claimed address. */
export async function proveControl(provider: EIP1193Provider, address: Address): Promise<boolean> {
  const wallet = createWalletClient({ account: address, chain: mootzChain, transport: custom(provider) });
  const message = buildChallenge(address, newNonce(), new Date());
  const signature = await wallet.signMessage({ message });
  const recovered = await recoverMessageAddress({ message, signature });
  return isAddressEqual(recovered, address);
}

/** Reads straight from the contracts. Any failure throws; callers must treat that as an error, never as nonholder. */
export async function readRecognition(address: Address, collectionId: bigint): Promise<Recognition> {
  const collection = env.eventCollectionAddress;
  const registry = env.meetRegistryAddress;
  if (!collection || !registry) throw new Error("Contracts are not deployed");
  const client = createPublicClient({ chain: mootzChain, transport: http() });
  const [eventId] = await client.readContract({
    address: collection,
    abi: eventCollectionAbi,
    functionName: "collections",
    args: [collectionId],
  }) as readonly [`0x${string}`, bigint, string];
  const [balance, meetCount] = await Promise.all([
    client.readContract({ address: collection, abi: eventCollectionAbi, functionName: "balanceOf", args: [address, collectionId] }) as Promise<bigint>,
    client.readContract({ address: registry, abi: meetRegistryAbi, functionName: "eventMeetCount", args: [address, eventId] }) as Promise<bigint>,
  ]);
  return classify(eventId, balance, meetCount);
}
