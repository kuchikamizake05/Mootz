import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// Functional browser regression using real organizer components/hooks with synthetic auth/API.
// Vite comes from the existing Vitest toolchain; Chrome matches the existing Playwright setup.
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const require=createRequire(root+'/package.json');
const {createServer}=await import(require.resolve('vite'));
const {chromium}=require('@playwright/test');
const dir=await mkdtemp(join(tmpdir(),'mootz-organizer-ui-'));
await writeFile(dir+'/index.html','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await writeFile(dir+'/router.ts',`export const navigate=(path)=>{history.pushState(null,'',path);dispatchEvent(new Event('popstate'));}; export const useRouter=()=>({push:navigate,replace:navigate,back:()=>history.back()});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);`);
await writeFile(dir+'/link.tsx',`import {navigate} from './router';export default function Link({href,children,...props}){return <a href={href} {...props} onClick={e=>{e.preventDefault();navigate(href)}}>{children}</a>}`);
await writeFile(dir+'/privy.ts',`const getAccessToken=async()=>'test-only-token';export function usePrivy(){return {ready:true,authenticated:true,user:{id:'test-only-subject'},getAccessToken}}`);
await writeFile(dir+'/entry.tsx',`import {useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {CreateEventPage} from '/@fs/${root}/src/features/organizer/create-event.tsx';import {MapView} from '/@fs/${root}/src/features/map/map-view.tsx';import {ManageEventsPage} from '/@fs/${root}/src/features/organizer/manage-events.tsx';const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});function App(){const [path,setPath]=useState(location.pathname);useEffect(()=>{const change=()=>setPath(location.pathname);addEventListener('popstate',change);return()=>removeEventListener('popstate',change)},[]);return <QueryClientProvider client={client}>{path==='/map'?<div style={{height:'100vh',position:'relative'}}><MapView/></div>:path.endsWith('/new')?<CreateEventPage/>:<ManageEventsPage/>}</QueryClientProvider>}createRoot(document.getElementById('root')).render(<App/>);`);
const server=await createServer({configFile:false,envDir:false,root:dir,cacheDir:dir+'/cache',server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,dir]}},resolve:{alias:{'lucide-react':root+'/node_modules/lucide-react','@':root+'/src','next/navigation':dir+'/router.ts','next/link':dir+'/link.tsx','@privy-io/react-auth':dir+'/privy.ts','react':root+'/node_modules/react','react-dom':root+'/node_modules/react-dom','@tanstack/react-query':root+'/node_modules/@tanstack/react-query'}},define:{'process.env':JSON.stringify({NODE_ENV:'development',NEXT_PUBLIC_API_BASE_URL:'https://organizer-api.test'})},oxc:{jsx:{runtime:'automatic'}},optimizeDeps:{include:['react','react-dom/client','@tanstack/react-query','lucide-react']}});
let browser;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/vendor/maplibre-gl-worker.mjs', route=>route.fulfill({path:root+'/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs',contentType:'text/javascript'}));
 await page.route('https://tiles.openfreemap.org/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:8,sources:{},layers:[{id:'test-background',type:'background',paint:{'background-color':'#f3edff'}}]})}));
 const profile={id:'00000000-0000-4000-8000-000000000001'};
 let approved=false;let created=null;let count=0;let posts=[];let attendancePosts=[];let failAttendance=true;
 await page.route('https://organizer-api.test/**',async route=>{
  const request=route.request();const url=new URL(request.url());let status=200,data={};
  if(request.headers()['authorization']!=='Bearer test-only-token')throw Error('Missing auth');
  if(url.pathname==='/v1/me')data=profile;
  else if(url.pathname==='/v1/me/organizer')data={enabled:approved};
  else if(url.pathname==='/v1/me/events')data={items:created?[{...created,collectionStatus:'not_configured',checkInCount:count}]:[],nextCursor:null};
  else if(url.pathname==='/v1/events'&&request.method()==='GET')data={items:[created,{...created,id:'00000000-0000-4000-8000-000000000004',title:'No venue pin',location:null}],nextCursor:null};
  else if(['/v1/map','/v1/dots','/v1/friends/locations'].includes(url.pathname))data={items:[],nextCursor:null};
  else if(url.pathname==='/v1/events'&&request.method()==='POST'){
   const input=request.postDataJSON();posts.push(input);
   if(!created){created={...input,id:'00000000-0000-4000-8000-000000000002'};await route.abort('failed');return;}
   data=created;
  }else if(url.pathname.endsWith('/check-ins')){
   attendancePosts.push({path:url.pathname,body:request.postDataJSON()});
   if(failAttendance){status=403;data={error:{code:'INVALID_REQUEST'}};}else{count=1;data={checkedIn:true,checkedInAt:'2026-10-24T02:00:00.000Z'};}
  }else throw Error('Unexpected endpoint '+url.pathname);
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(origin+'/organizer/events/new');
 await page.getByRole('heading',{name:'Organizer access required'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Create event',exact:true}).count(),0);
 assert.equal(posts.length,0);console.log('PASS unapproved account cannot access event form');
 approved=true;await page.reload();await page.getByLabel('Event name',{exact:true}).fill('Browser workshop');
 await page.getByLabel('Description',{exact:true}).fill('Friends at a workshop');
 await page.getByLabel('Venue',{exact:true}).fill('Jogja');
 await page.locator('.maplibregl-canvas').click({position:{x:100,y:100}});
 await page.waitForFunction(()=>document.querySelector('input[name=latitude]').value !== '');
 assert.equal(await page.locator('.maplibregl-marker').count(),1);
 await page.getByLabel('Latitude',{exact:true}).fill('-7.77');
 await page.getByLabel('Longitude',{exact:true}).fill('110.37');
 const future=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
 await page.getByLabel('Starts',{exact:true}).fill(future+'T09:00');
 await page.getByLabel('Ends',{exact:true}).fill(future+'T11:00');
 await page.getByRole('button',{name:'Create event',exact:true}).click();
 await page.getByRole('alert').filter({hasText:"couldn't confirm"}).waitFor();
 assert.equal(await page.getByLabel('Event name',{exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Retry same request',exact:true}).click();
 await page.getByRole('heading',{name:'Browser workshop',exact:true}).waitFor();
 assert.deepEqual(posts[0].location,{latitude:-7.77,longitude:110.37});
 assert.equal(posts.length,2);assert.deepEqual(posts[0],posts[1]);assert.equal(Object.hasOwn(posts[0],'organizerId'),false);
 assert.equal(await page.getByRole('link',{name:'View collectible',exact:true}).count(),0);
 console.log('PASS ambiguous create retains identity/payload and retries without duplicate; no false collectible');
 await page.getByRole('button',{name:'Manage check-ins',exact:true}).click();
 await page.getByLabel('Attendee account code',{exact:true}).fill('00000000-0000-4000-8000-000000000003');
 await page.getByRole('button',{name:'Record check-in',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'no longer have permission'}).waitFor();
 assert.equal(await page.getByRole('status').filter({hasText:'Check-in recorded'}).count(),0);
 failAttendance=false;await page.getByRole('button',{name:'Record check-in',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Check-in recorded'}).waitFor();
 await page.getByText('1 checked in',{exact:true}).waitFor();
 assert.deepEqual(attendancePosts[1],{path:'/v1/events/'+created.id+'/check-ins',body:{accountId:'00000000-0000-4000-8000-000000000003'}});
 assert.deepEqual(errors,[]);console.log('PASS attendance denies unauthorized success and updates count after confirmed API response');
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.getByRole('button',{name:'Record check-in',exact:true}).isVisible(),true);}
 await page.goto(origin+'/map?filter=events');
 await page.addStyleTag({content:'.absolute{position:absolute}.inset-0{inset:0}.size-full{width:100%;height:100%}'});
 const venue=page.getByRole('button',{name:'Browser workshop at Jogja',exact:true});
 await venue.waitFor(); assert.equal(await page.getByRole('button',{name:/No venue pin/}).count(),0);
 await venue.click();assert.equal(new URL(page.url()).pathname,'/events/'+created.id);
 await page.goto(origin+'/map?filter=friends');
 await page.getByRole('button',{name:'Locate me',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Browser workshop at Jogja',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS created event appears on Events map, opens event details, and stays out of Friends');
 console.log('PASS controls remain accessible at 320/390/768/1440 widths; mocked session/API only');
}finally{await browser?.close();await server.close();await rm(dir,{recursive:true,force:true});}
