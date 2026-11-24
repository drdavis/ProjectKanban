'use client';
import {useEffect,useState} from 'react';
import {Button} from './ui/button';
type Invite={id:string;email:string;role:string;state:string;expiresAt:string};
export function Invitations({productId}:{productId:string}){
 const [emailAvailable,setEmailAvailable]=useState(false);
 const [rows,setRows]=useState<Invite[]>([]),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/invitations?product='+productId);const data=await r.json();if(!r.ok)throw new Error(data.error);setRows(data);setEmailAvailable(r.headers.get("X-Email-Available")==="true");}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[productId]);
 async function send(input:object){setBusy(true);setError('');try{const r=await fetch('/api/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,productId})});const data=await r.json();if(!r.ok)throw new Error(data.error);if(data.url)setUrl(data.url);if(data.warning)setError(data.warning);else if(data.emailSent)setError("Invitation email sent.");await load();}catch(e){setError(e instanceof Error?e.message:'Could not save invitation.');}finally{setBusy(false);}}
 return <section><h3>Invite by email</h3><p>Create a seven-day invitation link and share it with the intended person. Only their verified email can accept it. Email delivery is optional when configured by your administrator.</p><form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'invite',email:d.get('email'),name:d.get('name'),role:d.get('role'),sendEmail:d.has('sendEmail')});}}><label>Name<input name="name" maxLength={100}/></label><label>Email<input name="email" type="email" required/></label><label>Role<select name="role"><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><label className="checkbox"><input name="sendEmail" type="checkbox" disabled={!emailAvailable}/>Also send invitation email{!emailAvailable&&" (email delivery is not configured)"}</label><Button disabled={busy}>Create invitation</Button></form>
 {url&&<label>Invitation link<input readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>}{error&&<p role="alert">{error}</p>}
 {rows.map(r=><p key={r.id}>{r.email} · {r.role} · {r.state} · Expires {new Date(r.expiresAt).toLocaleDateString()} {r.state==='pending'&&<Button variant="ghost" disabled={busy} onClick={()=>void send({action:'revoke',invitationId:r.id})}>Revoke</Button>}</p>)}</section>;
}
