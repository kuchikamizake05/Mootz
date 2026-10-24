import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy,useWallets,useCreateWallet} from '@privy-io/react-auth';
import './style.css';
const base=import.meta.env.VITE_BACKEND_URL||'http://localhost:3001';
function App(){
 const {ready,authenticated,login,logout,getAccessToken}=usePrivy();
 const {wallets}=useWallets();const {createWallet}=useCreateWallet();
 const [status,setStatus]=useState('Siap untuk pemeriksaan lokal.');const [busy,setBusy]=useState(false);const [profile,setProfile]=useState(null);const [wallet,setWallet]=useState('');const [moment,setMoment]=useState(null);
 const [targetMoment,setTargetMoment]=useState('');const [audienceResult,setAudienceResult]=useState('');
 async function api(path,options={}){
  const token=await getAccessToken();if(!token)throw Error('AUTH_REQUIRED');
  const response=await fetch(base+path,{...options,headers:{...options.headers,authorization:`Bearer ${token}`}});
  if(!response.ok)throw Error(`HTTP_${response.status}`);
  return response.json();
 }
 const json=(body)=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 async function run(work){setBusy(true);setStatus('Memproses…');try{await work();setStatus('Berhasil.');}catch(error){setStatus(/^HTTP_\d+$/.test(error.message)?`Permintaan gagal: ${error.message}`:'Tindakan gagal atau dibatalkan. Coba lagi.');}finally{setBusy(false);}}
 async function check(){setProfile(await api('/v1/me'));}
 async function checkAudience(){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetMoment))throw Error('INVALID_MOMENT');
  await check();
  const results=[];
  for(const [label,path] of [['Detail',`/v1/moments/${targetMoment}`],['Foto depan',`/v1/moments/${targetMoment}/media/front`],['Foto belakang',`/v1/moments/${targetMoment}/media/back`]]){
   const token=await getAccessToken();if(!token)throw Error('AUTH_REQUIRED');
   const response=await fetch(base+path,{headers:{authorization:`Bearer ${token}`}});
   results.push(`${label}: HTTP ${response.status}`);
   await response.body?.cancel();
  }
  setAudienceResult(results.join(' · '));
 }
 async function bind(){
  const selected=wallets.find(w=>w.address===wallet);if(!selected)throw Error('WALLET_REQUIRED');
  const challenge=await api('/v1/me/wallet-challenges',json({wallet:selected.address}));
  const provider=await selected.getEthereumProvider();
  const message='0x'+Array.from(new TextEncoder().encode(challenge.message),b=>b.toString(16).padStart(2,'0')).join('');
  const signature=await provider.request({method:'personal_sign',params:[message,selected.address]});
  await api('/v1/me/wallet-bindings',json({challengeId:challenge.challengeId,wallet:selected.address,signature}));await check();
 }
 async function synthetic(side){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');ctx.fillStyle=side==='front'?'#743ab5':'#285a83';ctx.fillRect(0,0,640,480);ctx.fillStyle='white';ctx.font='30px sans-serif';ctx.fillText(`Synthetic test ${side}`,35,240);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error()),'image/jpeg',0.85));}
 async function publish(){
  await check();const draft=await api('/v1/moments',json({source:'upload',caption:'Synthetic backend integration test'}));setMoment({id:draft.id});
  for(const side of ['front','back'])await api(`/v1/moments/${draft.id}/media/${side}`,{method:'PUT',headers:{'content-type':'image/jpeg'},body:await synthetic(side)});
  await api(`/v1/moments/${draft.id}/publish`,json({}));const published=await api(`/v1/moments/${draft.id}`);setMoment({id:published.id,publishedAt:published.publishedAt,thumbnails:published.thumbnails});
 }
 return <main><h1>Mootz</h1><p><strong>Backend integration test</strong> · lokal</p><p>Halaman diagnostik backend. Masuk menggunakan Privy, lalu jalankan pemeriksaan secara terpisah.</p><p role="status" aria-live="polite">{status}</p>
 {!authenticated?<button disabled={!ready||busy} onClick={()=>login()}>Masuk dengan Privy</button>:<><button disabled={busy} onClick={()=>run(async()=>{await logout();setProfile(null);setMoment(null);setWallet('');setAudienceResult('');})}>Keluar</button><h2>Akun</h2><button disabled={busy} onClick={()=>run(check)}>Periksa profil backend</button>{profile&&<><dl><dt>ID akun</dt><dd>{profile.id}</dd><dt>Record Meet</dt><dd>{String(profile.recordMeet)}</dd><dt>Wallet terverifikasi</dt><dd>{profile.wallet||'Belum terhubung'}</dd></dl><button disabled={busy} onClick={()=>run(async()=>setProfile(await api('/v1/me/preferences',{...json({recordMeet:!profile.recordMeet}),method:'PATCH'})))}>Ubah preferensi Record Meet</button></>}
 <h2>Periksa audiens</h2><p>Gunakan ID momen sintetis yang sama pada akun pemilik dan akun kedua. HTTP 200 berarti akses diizinkan; HTTP 404 berarti tidak ditemukan atau di luar audiens.</p><label>ID momen<input value={targetMoment} onChange={event=>{setTargetMoment(event.target.value);setAudienceResult('');}} /></label><button disabled={busy||!targetMoment} onClick={()=>run(checkAudience)}>Periksa akses momen dan foto</button>{audienceResult&&<p role="status">{audienceResult}</p>}
 <h2>Wallet</h2><p>Pembuatan wallet hanya melalui tombol ini. Pengikatan memerlukan tanda tangan pesan pada dialog wallet.</p><button disabled={busy||wallets.length>0} onClick={()=>run(async()=>{await createWallet();})}>Create test wallet</button><label>Wallet yang akan diikat<select value={wallet} onChange={event=>setWallet(event.target.value)}><option value="">Pilih wallet</option>{wallets.map(w=><option key={w.address} value={w.address}>{w.address}</option>)}</select></label><button disabled={busy||!wallet} onClick={()=>run(bind)}>Tandatangani bukti dan ikat wallet</button>
 <h2>Media sintetis</h2><p>Tombol berikut mengunggah dua gambar warna buatan dan menerbitkan momen ke backend pengujian. Tidak menggunakan kamera, file pribadi, atau GPS.</p><button disabled={busy} onClick={()=>run(publish)}>Unggah dan terbitkan momen sintetis</button>{moment&&<><p>Momen: {moment.id} · {moment.publishedAt?'Terbit':'Draft'}</p>{Object.entries(moment.thumbnails||{}).map(([side,url])=><img key={side} src={url} alt={`Synthetic ${side}`} referrerPolicy="no-referrer" />)}</>}</>}
 </main>;
}
createRoot(document.getElementById('root')).render(<PrivyProvider appId={import.meta.env.VITE_PRIVY_APP_ID||'cmvkda7qi01ks0gjt1mrmlydu'} config={{loginMethods:['email','google','wallet'],embeddedWallets:{ethereum:{createOnLogin:'off'}}}}><App/></PrivyProvider>);
