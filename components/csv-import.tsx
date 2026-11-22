'use client';
import {useMemo,useState} from 'react';
import {csvLimit,defaultMapping,parseCsv,previewCsv,type CsvMapping} from '../lib/csv-import';
import {Button} from './ui/button';
export function CsvImport({productId,revision,onImported}:{productId:string;revision:number;onImported:()=>Promise<void>}){
  const [csv,setCsv]=useState(''),[filename,setFilename]=useState(''),[mapping,setMapping]=useState<CsvMapping>(defaultMapping([]));
  const [doneOnly,setDoneOnly]=useState(false),[preserveDone,setPreserveDone]=useState(false),[confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const preview=useMemo(()=>{if(!csv)return null;try{return previewCsv(csv,mapping,doneOnly,preserveDone);}catch(e){return {error:(e as Error).message};}},[csv,mapping,doneOnly,preserveDone]);
  const headers=useMemo(()=>csv?parseCsv(csv)[0]:[],[csv]);
  function changed(){setConfirmed(false);setNotice('');}
  return <section className="history">
    <p>Import an Airtable CSV export or another CSV into this product's Development board. Preview the column mapping before saving. Exact source rows previously imported into this product are skipped; edited source rows count as new tasks.</p>
    <p>Up to 500 rows / 2 MB. Attachment URLs and extra columns are preserved as text; files are not downloaded. Long titles are shortened on cards and preserved in full in their notes.</p>
    <label>CSV file<input type="file" accept=".csv,text/csv" disabled={busy} onChange={async event=>{
      const file=event.target.files?.[0];setCsv('');setError('');changed();if(!file)return;
      try{if(file.size>csvLimit)throw new Error('CSV must be 2 MB or smaller.');const text=await file.text();const [columns]=parseCsv(text);setMapping(defaultMapping(columns));setFilename(file.name);setCsv(text);}catch(e){setError((e as Error).message);}
    }}/></label>
    {csv && <>
      <fieldset disabled={busy}><legend>Map columns</legend>
      {(Object.keys(mapping) as (keyof CsvMapping)[]).map(key=><label key={key}>{{title:'Task title',notes:'Notes',assignee:'Assignee',status:'Source status',attachments:'Attachments',summary:'Attachment summary'}[key]}<select value={mapping[key]} onChange={e=>{setMapping({...mapping,[key]:e.target.value});changed();}}><option value="">Not mapped</option>{headers.map(h=><option key={h}>{h}</option>)}</select></label>)}
      <label className="checkbox"><input type="checkbox" checked={doneOnly} onChange={e=>{setDoneOnly(e.target.checked);changed();}}/>Import completed rows only (Done, Complete, Completed, Closed)</label>
      <label className="checkbox"><input type="checkbox" checked={preserveDone} onChange={e=>{setPreserveDone(e.target.checked);changed();}}/>Preserve completed status as historical Done</label>
      <p>Historical Done means the source reported completion. It does not mean tests passed here. Verification remains Pending and readiness checks can flag these records. Reopen a card before continuing work; normal completion checks still apply. All other rows enter Backlog, with their source status in the notes.</p>
      </fieldset>
      {preview && ('error' in preview ? <p role="alert">{preview.error}</p>:<>
        <p role="status">{preview.rows.length} matching tasks · {preview.skipped} blank-title or filtered rows skipped. Exact duplicates will be skipped when saved.</p>
        <div style={{maxHeight:320,overflow:'auto'}}><table><thead><tr><th>Source row</th><th>Task</th><th>Assignee</th><th>Destination</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.row}><td>{row.row}</td><td>{row.title}</td><td>{row.responsible}</td><td>{row.status}</td></tr>)}</tbody></table></div>
        <label className="checkbox"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed the mapping and destination statuses. Import these records.</label>
        <Button disabled={busy || !confirmed || !preview.rows.length} onClick={async()=>{
          setBusy(true);setError('');setNotice('');
          try{const response=await fetch('/api/csv-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,revision,filename,csv,mapping,doneOnly,preserveDone,confirmed:true})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Import failed.');setNotice(`Imported ${result.imported} tasks. Skipped ${result.duplicates} exact duplicates and ${result.skipped} excluded rows.`);setConfirmed(false);await onImported();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
        }}>{busy?'Importing…':'Import CSV'}</Button>
      </>)}
    </>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
