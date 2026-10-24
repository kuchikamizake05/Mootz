import type {Pool,PoolClient} from 'pg';
import type {Address} from 'viem';
import type {CollectionGateway} from '../collections/types.ts';
import {uuidBytes32} from '../protocol/index.ts';
export const frames=[
 {id:'first_meet',name:'First Meet',assetKey:'achievement/first-meet',metric:'dotCount',target:1},
 {id:'together',name:'Together',assetKey:'achievement/together',metric:'dotCount',target:10},
 {id:'social_butterfly',name:'Social Butterfly',assetKey:'achievement/social-butterfly',metric:'distinctFriendPartners',target:5},
] as const;
export type FrameId=typeof frames[number]['id'];
type AchievementFrame={kind:'achievement';id:FrameId;name:string;assetKey:string;equippedAt:string};
type CollectionFrame={kind:'collection';collectionRef:string;eventId:string;collectionId:string;chainId:number;contractAddress:string;displayName:string;artworkUrl:string|null;equippedAt:string};
export type FrameState={status:'active'|'none'|'unavailable';frame:AchievementFrame|CollectionFrame|null};
export type FrameGateway=Pick<CollectionGateway,'domain'|'read'>;
export async function metrics(client:Pick<PoolClient,'query'>,accountId:string){
 const row=(await client.query<{dot_count:string;friend_count:string}>(`SELECT count(*)::text dot_count,
 count(DISTINCT CASE WHEN f.status='accepted' THEN CASE WHEN m.poster_id=$1 THEN m.scanner_id ELSE m.poster_id END END)::text friend_count
 FROM dots d JOIN meets m ON m.id=d.meet_id
 LEFT JOIN friendships f ON f.account_low=LEAST(m.poster_id,m.scanner_id) AND f.account_high=GREATEST(m.poster_id,m.scanner_id)
 WHERE m.poster_id=$1 OR m.scanner_id=$1`,[accountId])).rows[0]!;
 return{dotCount:Number(row.dot_count),distinctFriendPartners:Number(row.friend_count)};
}
export async function syncAchievements(client:PoolClient,accountIds:string[]):Promise<void>{
 const sorted=[...new Set(accountIds)].sort();
 for(const id of sorted)await client.query("SELECT pg_advisory_xact_lock(hashtextextended('frame-unlock:' || $1::text,0))",[id]);
 for(const id of sorted){const counts=await metrics(client,id);for(const frame of frames)if(counts[frame.metric]>=frame.target)await client.query('INSERT INTO achievement_unlocks(account_id,frame_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,frame.id]);}
}
export async function readFrame(pool:Pick<Pool,'query'>,accountId:string,gateway?:FrameGateway):Promise<FrameState>{
 const row=(await pool.query<{achievement_id:FrameId|null;equipped_at:Date;collection_ref:string|null;event_id:string;chain_id:string;contract_address:string;collection_id:string;display_name:string;artwork_url:string|null}>(`SELECT p.*,c.event_id,c.chain_id,c.contract_address,c.collection_id,c.display_name,c.artwork_url FROM profile_frames p LEFT JOIN event_collections c ON c.id=p.collection_ref WHERE p.account_id=$1`,[accountId])).rows[0];
 if(!row)return{status:'none',frame:null};
 if(row.achievement_id){const frame=frames.find(f=>f.id===row.achievement_id)!;return{status:'active',frame:{kind:'achievement',id:frame.id,name:frame.name,assetKey:frame.assetKey,equippedAt:row.equipped_at.toISOString()}};}
 const wallet=(await pool.query<{address:Address}>('SELECT address FROM wallet_bindings WHERE account_id=$1 AND chain_id=$2 AND revoked_at IS NULL',[accountId,row.chain_id])).rows[0];
 if(!wallet)return{status:'none',frame:null};
 if(!gateway||Number(row.chain_id)!==gateway.domain.chainId||row.contract_address.toLowerCase()!==gateway.domain.verifyingContract.toLowerCase())return{status:'unavailable',frame:null};
 try{const state=await gateway.read(BigInt(row.collection_id),wallet.address);if(state.eventId.toLowerCase()!==uuidBytes32(row.event_id))return{status:'unavailable',frame:null};if(state.balance<=0n)return{status:'none',frame:null};return{status:'active',frame:{kind:'collection',collectionRef:row.collection_ref!,eventId:row.event_id,collectionId:row.collection_id,chainId:Number(row.chain_id),contractAddress:row.contract_address,displayName:row.display_name,artworkUrl:row.artwork_url,equippedAt:row.equipped_at.toISOString()}};}catch{return{status:'unavailable',frame:null};}
}
