"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
type Attachment={id:string;metadata:{name:string;type:string;size:number}};
export function CardAttachments({productId,cardId,canEdit}:{productId:string;cardId?:string;canEdit:boolean}) {
  const [files,setFiles]=useState<Attachment[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const endpoint=`/api/attachments?product=${productId}&card=${cardId}`;
  async function refresh(){const response=await fetch(endpoint);const data=await response.json();if(!response.ok)throw new Error(data.error);setFiles(data.files);}
  useEffect(()=>{if(cardId)void refresh().catch(e=>setError(e.message));},[cardId,productId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function upload(items:File[]){if(!canEdit||busy)return;setBusy(true);setError("");try{for(const file of items){const body=new FormData();body.set("file",file);const res=await fetch(endpoint,{method:"POST",body});const data=await res.json();if(!res.ok)throw new Error(data.error);} }catch(e){setError((e as Error).message);}finally{await refresh().catch(e=>setError(e.message));setBusy(false);}}
  if(!cardId)return <p className="muted">Save this card first to attach screenshots or documents.</p>;
  return <section className="attachment-panel" aria-label="Card attachments" tabIndex={0}
    onPaste={e=>{const items=Array.from(e.clipboardData.files);if(items.length){e.preventDefault();void upload(items);}}}
    onDragOver={e=>{if(canEdit)e.preventDefault();}} onDrop={e=>{e.preventDefault();void upload(Array.from(e.dataTransfer.files));}}>
    <h3>Attachments</h3><p className="muted">Paste screenshots here, drop files, or choose files. Up to 2 MB each and 50 MB per product. Files are private to product members. Remove sensitive information before uploading.</p>
    {canEdit&&<label>Choose screenshots or documents<input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.csv,.json" disabled={busy} onChange={e=>{void upload(Array.from(e.target.files??[]));e.target.value="";}}/></label>}
    {busy&&<p role="status">Uploading…</p>}{error&&<p role="alert" className="error">{error}</p>}
    {files.map(file=><article key={file.id}>
      {file.metadata.type.startsWith("image/")&&<a href={`${endpoint}&attachment=${file.id}&preview=1`} target="_blank" rel="noreferrer"><img loading="lazy" style={{maxWidth:"100%",maxHeight:180,borderRadius:8}} src={`${endpoint}&attachment=${file.id}&preview=1`} alt={file.metadata.name}/></a>}
      <p><a href={`${endpoint}&attachment=${file.id}`}>{file.metadata.name}</a> · {Math.ceil(file.metadata.size/1024)} KB</p>
      {canEdit&&<Button variant="ghost" disabled={busy} onClick={async()=>{if(!confirm(`Remove ${file.metadata.name}?`))return;setBusy(true);try{const res=await fetch(`${endpoint}&attachment=${file.id}`,{method:"DELETE"});if(!res.ok)throw new Error((await res.json()).error);await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Remove attachment</Button>}
    </article>)}
  </section>;
}
