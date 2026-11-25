'use client';
import {Button} from './ui/button';
import {defaultTaskBoard,type TaskBoard} from '../lib/task-board';
export function TaskBoardSettings({config=defaultTaskBoard,busy,save}:{config?:TaskBoard;busy:boolean;save:(config:TaskBoard)=>void}){
 return <form key={JSON.stringify(config)} onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);save({layoutVersion:2,title:String(d.get('title')),clientLabel:String(d.get('clientLabel')),agencyLabel:String(d.get('agencyLabel')),showAgency:d.has('showAgency'),defaultView:d.get('defaultView') as TaskBoard['defaultView'],statusLabels:Object.fromEntries(Object.keys(config.statusLabels).map(status=>[status,String(d.get(status))])) as TaskBoard['statusLabels']});}}>
 <h3>Customize task board</h3><p>Organize work by client or agency. Labels apply to this board; saved views belong to each person. Agency and client filters organize work and do not grant or restrict access.</p>
 <label>Board tab name<input name="title" required maxLength={40} defaultValue={config.title}/></label>
 <label>Client field label<input name="clientLabel" required maxLength={40} defaultValue={config.clientLabel}/></label>
 <label>Agency field label<input name="agencyLabel" required maxLength={40} defaultValue={config.agencyLabel}/></label>
 <label className="checkbox"><input name="showAgency" type="checkbox" defaultChecked={config.showAgency}/>Show agency selector and field</label>
 <label>Default layout<select name="defaultView" defaultValue={config.defaultView}><option value="clients">Grouped by client</option><option value="agency">Grouped by agency</option><option value="list">All tasks</option><option value="status">Cards and columns</option></select></label>
 <fieldset><legend>Task column labels</legend>{Object.entries(config.statusLabels).map(([status,label])=><label key={status}>{defaultTaskBoard.statusLabels[status as keyof TaskBoard['statusLabels']]}<input name={status} required maxLength={40} defaultValue={label}/></label>)}</fieldset>
 <p>The final column means completed. Renaming columns preserves existing tasks, history, and AI connections.</p><Button type="submit" disabled={busy}>Save board customization</Button></form>;
}
