'use client';
import {useEffect,useRef,useState} from 'react';
import {deliveryLabel,type InvitationDelivery} from '../lib/invitation-delivery';
import {Button} from './ui/button';
type Invite={id:string;email:string;role:string;state:string;expiresAt:string;delivery?:InvitationDelivery};
type Result={email?:string;url?:string;delivery?:InvitationDelivery;warning?:string;revoked?:boolean};
export function Invitations({productId}:{productId:string}){
 const [emailAvailable,setEmailAvailable]=useState(false),[loaded,setLoaded]=useState(false),[emailChoice,setEmailChoice]=useState<boolean|null>(null);
 const [rows,setRows]=useState<Invite[]>([]),[result,setResult]=useState<Result>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const lock=useRef(false),feedback=useRef<HTMLDivElement>(null);
 const sendEmail=emailAvailable&&(emailChoice??true);
 async function load(){const r=await fetch('/api/invitations?product='+productId,{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error);setRows(data);setEmailAvailable(r.headers.get('X-Email-Available')==='true');setLoaded(true);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[productId]);
 async function send(input:{action:string;[key:string]:unknown}){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setResult(undefined);setCopied(false);
  try{
   const r=await fetch('/api/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,productId})});const data=await r.json();if(!r.ok)throw new Error(data.error);
   setResult(input.action==='revoke'?{revoked:true}:data);
   await load().catch(()=>setError('The invitation result is shown above, but the history could not refresh. Refresh the list before sending again.'));
  }catch(e){setError(e instanceof Error?e.message:'Could not confirm the request. Refresh invitation history before trying again.');}
  finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{if(result)feedback.current?.focus();},[result]);
 return <section><h3>Invite to this board</h3><p>Only the invited verified email receives access to this board. Invitations expire after seven days.</p>
 <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'invite',email:d.get('email'),name:d.get('name'),role:d.get('role'),sendEmail});}}>
 <fieldset disabled={busy}><label>Name<input name="name" maxLength={100}/></label><label>Email<input name="email" type="email" required/></label><label>Role<select name="role"><option value="editor">Editor — update tasks</option><option value="viewer">Viewer — read only</option></select></label>
 <label className="checkbox"><input type="checkbox" checked={sendEmail} disabled={!emailAvailable||!loaded} onChange={e=>setEmailChoice(e.target.checked)}/>Send invitation email</label>
 {loaded&&!emailAvailable&&<p>Email delivery is not configured. You can create a link and share it yourself.</p>}
 <Button type="submit" disabled={busy||!loaded}>{busy?(sendEmail?'Sending invitation…':'Saving invitation…'):sendEmail?'Send invitation email':'Create link only'}</Button></fieldset></form>
 {result&&<div ref={feedback} tabIndex={-1} className={'invitation-result '+(result.delivery?.status==='sent'?'success':'')} role="status" aria-live="polite">
 <strong>{result.revoked?'Invitation revoked':deliveryLabel(result.delivery)}</strong>
 {result.email&&<p>Recipient: <strong>{result.email}</strong></p>}
 {result.delivery?.status==='sent'&&<p>Resend accepted the email for sending. Inbox delivery and acceptance of the invitation are not yet confirmed.</p>}
 {result.delivery?.reason&&<p>{result.delivery.reason}</p>}
 {result.delivery?.status==='not-requested'&&<p>No email was requested. Copy this link and share it with the invited person.</p>}
 {result.warning&&<p>{result.warning}</p>}
 {result.url&&<><label>Invitation link<input readOnly value={result.url} onFocus={e=>e.currentTarget.select()}/></label><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(result.url!).then(()=>setCopied(true),()=>setError('Select and copy the invitation link manually.'))}>{copied?'Link copied':'Copy invitation link'}</Button></>}
 </div>}
 {error&&<p role="alert">{error}</p>}
 <h3>Invitation history</h3><Button variant="outline" disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>Refresh status</Button>
 {loaded&&!rows.length&&<p>No invitations have been created for this board.</p>}
 {rows.map(r=><article className="invitation-history" key={r.id}><strong>{r.email}</strong><p>{deliveryLabel(r.delivery)}{r.delivery?.at?' · '+new Date(r.delivery.at).toLocaleString():''}</p>{r.delivery?.reason&&<p>{r.delivery.reason}</p>}<p>Board access: {r.state==='accepted'?'Invitation accepted':r.state==='revoked'?'Invitation revoked':Date.parse(r.expiresAt)<Date.now()?'Invitation expired':'Awaiting acceptance'} · {r.role}</p>{r.delivery?.messageId&&<details><summary>Email receipt</summary><p>Resend message ID: {r.delivery.messageId}</p><p>Check this message in Resend Emails for delivery or bounce details.</p></details>}<p>Expires {new Date(r.expiresAt).toLocaleString()}</p>{r.state==='pending'&&<Button variant="ghost" disabled={busy} onClick={()=>void send({action:'revoke',invitationId:r.id})}>Revoke invitation</Button>}</article>)}
 </section>;
}
