'use client';
import {useState,useEffect} from 'react';
import {Button} from './ui/button';
export function IntegrationJobs({productId}:{productId:string}){
 const [jobs,setJobs]=useState<Array<{id:string;provider:string;state:string;attempts:number;linked:number;summary:string}>>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/integration-jobs?product='+productId);const d=await r.json();if(!r.ok)throw new Error(d.error);setJobs(d);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[productId]);
 async function retry(jobId:string){setBusy(true);setError('');try{const r=await fetch('/api/integration-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,jobId})});const d=await r.json();if(!r.ok)throw new Error(d.error);await load();}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <section><h4>Recent integration events</h4><p>Unmatched events can be retried after linking the corresponding PR or commit. No evidence is duplicated.</p><Button variant="outline" disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>Refresh events</Button>{error&&<p role="alert">{error}</p>}{jobs.map(j=><p key={j.id}>{j.provider} · {j.summary} · {j.state} · {j.linked} linked · {j.attempts} attempts {['pending','unmatched'].includes(j.state)&&<Button variant="outline" disabled={busy} onClick={()=>void retry(j.id)}>Retry</Button>}</p>)}</section>;
}
