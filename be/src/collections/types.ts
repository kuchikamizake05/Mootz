import type { Address, Hex } from 'viem';
import type { Claim } from '../protocol/index.ts';
export interface CollectionGateway {
 domain:{chainId:number;verifyingContract:Address};
 issuerAddress:Address|null;
 read(collectionId:bigint,recipient:Address):Promise<{eventId:Hex;cap:bigint;totalSupply:bigint;balance:bigint;claimed:boolean;issuerAuthorized:boolean;metadataURI:string}>;
 signClaim?:(claim:Claim)=>Promise<Hex>;
}
