import { readFile, writeFile } from 'node:fs/promises';
const source = new URL('../../sc/specs/protocol.ts', import.meta.url);
const target = new URL('../src/protocol/generated.ts', import.meta.url);
const canonical = await readFile(source);
if (process.argv.includes('--write')) await writeFile(target, canonical);
const generated = await readFile(target);
if (!canonical.equals(generated)) {
  console.error('Backend protocol drift: run node scripts/check-protocol.mjs --write from be/');
  process.exitCode = 1;
} else console.log('Backend protocol matches canonical sc/specs/protocol.ts exactly.');
const abiSource=await readFile(new URL('../../sc/abi/MeetRegistry.json',import.meta.url));
const abiTarget=new URL('../abi/MeetRegistry.json',import.meta.url);
if(process.argv.includes('--write'))await writeFile(abiTarget,abiSource);
if(!abiSource.equals(await readFile(abiTarget))){console.error('Backend registry ABI drift');process.exitCode=1;}
else console.log('Backend registry ABI matches canonical SC export.');
const collectionSource = await readFile(new URL('../../sc/abi/EventCollection.json', import.meta.url));
const collectionTarget = new URL('../abi/EventCollection.json', import.meta.url);
if (process.argv.includes('--write')) await writeFile(collectionTarget, collectionSource);
if (!collectionSource.equals(await readFile(collectionTarget))) { console.error('Backend collection ABI drift'); process.exitCode = 1; }
else console.log('Backend collection ABI matches canonical SC export.');
