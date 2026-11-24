import {z} from 'zod';
const label=z.string().trim().min(1).max(40);
export const taskBoardFields=z.object({
 title:label.default('Tasks'),clientLabel:label.default('Client'),agencyLabel:label.default('Agency'),showAgency:z.boolean().default(true),
 defaultView:z.enum(['clients','agency','list','status']).default('clients'),
 statusLabels:z.object({Backlog:label.default('To do'),Ready:label.default('Scheduled'),'In Progress':label.default('In progress'),Review:label.default('Awaiting approval'),Done:label.default('Done')}).default(()=>({Backlog:'To do',Ready:'Scheduled','In Progress':'In progress',Review:'Awaiting approval',Done:'Done'})),
}).refine(v=>new Set(Object.values(v.statusLabels).map(x=>x.toLowerCase())).size===5,'Use a different label for each task status');
export type TaskBoard=z.output<typeof taskBoardFields>;
export const defaultTaskBoard=taskBoardFields.parse({});
export function taskStatusLabel(status:string,config:TaskBoard=defaultTaskBoard){return config.statusLabels[status as keyof TaskBoard['statusLabels']]??status;}
export function taskGroups<T extends {execution?:{work?:{client?:string;agency?:string}}|null}>(cards:T[],by:'clients'|'agency'|'list'){
 const groups=new Map<string,{client:string;agency:string;items:T[]}>();
 for(const card of cards){const work=card.execution?.work;const client=by==='clients'?(work?.client??''):'';const agency=by==='list'?'':work?.agency??'';const key=JSON.stringify([agency,client]);const group=groups.get(key)??{client,agency,items:[]};group.items.push(card);groups.set(key,group);}
 return [...groups.values()].sort((a,b)=>a.agency.localeCompare(b.agency)||a.client.localeCompare(b.client));
}
