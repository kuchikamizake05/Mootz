import {readFile} from 'node:fs/promises';
import {createPublicClient,createWalletClient,defineChain,http,type Abi,type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {loadConfig} from '../config.ts';
import {createDatabase} from '../database.ts';
import {createRegistryAccess} from '../chain/registry.ts';
import {loadFeePolicy} from '../chain/fees.ts';
import {purgeExpiredOfferLocations} from '../meet/routes.ts';
import {processMeetOutbox} from './worker.ts';
import {createViemMeetTransport} from './viem.ts';

async function main(){
 if(process.env.RELAYER_ENABLED!=='true')throw new Error('Relayer disabled');
 const config=loadConfig(process.env);const privateKey=process.env.RELAYER_PRIVATE_KEY;
 if(!config.meet||!privateKey||!/^0x[0-9a-fA-F]{64}$/.test(privateKey))throw new Error('Relayer configuration required');
 const chain=defineChain({id:10143,name:'Configured Mootz testnet',nativeCurrency:{name:'MON',symbol:'MON',decimals:18},rpcUrls:{default:{http:[config.meet.rpcUrl]}}});
 const transport=http(config.meet.rpcUrl,{timeout:5000,retryCount:1});
 const publicClient=createPublicClient({chain,transport});
 await createRegistryAccess(config.meet,publicClient);
 const account=privateKeyToAccount(privateKey as Hex);
 const walletClient=createWalletClient({chain,transport,account});
 const abi=JSON.parse(await readFile(new URL('../../abi/MeetRegistry.json',import.meta.url),'utf8')) as Abi;
 const feePolicy=loadFeePolicy(process.env,'MEET_RELAY');
 const database=createDatabase(config.databaseUrl);
 try{
  await purgeExpiredOfferLocations(database.pool);
  const result=await processMeetOutbox(database.pool,createViemMeetTransport({publicClient,walletClient,account,abi,chainId:10143,verifyingContract:config.meet.registryAddress,feePolicy}));
  process.stdout.write(JSON.stringify(result)+'\n');
 }finally{await database.close();}
}
main().catch(()=>{process.stderr.write('Relayer unavailable or disabled; inspect deployment, role and private server configuration\n');process.exitCode=1;});
