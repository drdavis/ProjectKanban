import {z} from 'zod';
const text=z.string().trim().max(10000);
export const dateOnly=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Choose a valid date');
export const workFields=z.object({
  client:z.string().trim().max(120).default(''),agency:z.string().trim().max(120).default(''),
  assigneeId:z.string().max(100).nullable().default(null), dueDate:dateOnly.nullable().default(null),
  checklist:z.array(z.object({id:z.uuid(),text:z.string().trim().min(1).max(500),done:z.boolean()}).strict()).max(100).default([]),
  recurrenceDays:z.number().int().min(1).max(366).nullable().default(null),
  cycle:z.string().trim().max(100).default(''), outcome:z.string().trim().max(500).default(''),
  impact:z.number().int().min(0).max(5).default(0),effort:z.number().int().min(0).max(5).default(0),
  source:z.union([z.literal(''),z.url({protocol:/^https?$/})]).default(''),
}).strict();
export type Work=z.output<typeof workFields>;
export const handoffFields=z.object({objective:text,decisions:text,files:text,remaining:text,blockers:text,evidence:text,state:z.enum(['working','paused','failed','ready-for-review'])}).strict();
export const deliveryFields=z.object({kind:z.enum(['pull-request','commit','ci','preview','production']),url:z.url({protocol:/^https?$/}),commit:z.string().trim().max(100),state:z.enum(['pending','passed','failed','merged','deployed']),summary:text}).strict();
export const outcomeFields=z.object({id:z.uuid(),name:z.string().trim().min(1).max(100),ownerId:z.string().max(200).nullable().default(null),measure:z.string().trim().min(1).max(500),baseline:z.number(),target:z.number(),current:z.number(),unit:z.string().max(50),releaseIds:z.array(z.uuid()).max(100),status:z.enum(['planned','active','achieved','paused'])}).strict();
export const cycleFields=z.object({id:z.uuid(),name:z.string().trim().min(1).max(100),start:dateOnly,end:dateOnly,capacity:z.number().int().min(1).max(1000)}).strict().refine(x=>x.end>=x.start,'End must follow start');
export const collabCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('outcome'),fields:outcomeFields}),
 z.object({action:z.literal('cycle'),fields:cycleFields}),
 z.object({action:z.literal('classify'),cardIds:z.array(z.uuid()).min(1).max(100),client:z.string().trim().max(120),agency:z.string().trim().max(120)}),
 z.object({action:z.literal('bulk'),cardIds:z.array(z.uuid()).min(1).max(100),status:z.string().max(30)}),
 z.object({action:z.literal('release.review'),releaseId:z.uuid(),approved:z.boolean(),evidence:text.min(1)}),
 z.object({action:z.literal('work'),cardId:z.uuid(),fields:workFields}),
 z.object({action:z.literal('comment'),cardId:z.uuid(),text:text.min(1),mentions:z.array(z.string().max(100)).max(30).default([])}),
 z.object({action:z.literal('claim'),cardId:z.uuid(),release:z.boolean().default(false)}),
 z.object({action:z.literal('handoff'),cardId:z.uuid(),fields:handoffFields}),
 z.object({action:z.literal('delivery'),cardId:z.uuid(),fields:deliveryFields}),
 z.object({action:z.literal('archive'),archived:z.boolean()}),
 z.object({action:z.literal('triage'),cardId:z.uuid(),decision:z.enum(['accept','request-details','defer','decline','duplicate']),reason:text.min(1),deferUntil:dateOnly.nullable().default(null),duplicateOf:z.uuid().nullable().default(null)}),
 z.object({action:z.literal('ack'),notificationId:z.uuid()}),
]).and(z.object({productId:z.uuid(),revision:z.number().int().min(0),requestId:z.uuid()}));
export type Claim={actor:string;expiresAt:string;released?:boolean};
export function claimIsActive(claim:Claim|null|undefined,now=Date.now()){return !!claim && !claim.released && Date.parse(claim.expiresAt)>now;}
export function canClaim(claim:Claim|null|undefined,actor:string,now=Date.now()){return !claimIsActive(claim,now)||claim?.actor===actor;}
export function nextDueDate(dueDate:string|null,days:number,now=new Date()){
 const base=dueDate??now.toISOString().slice(0,10);const next=new Date(base+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+days);return next.toISOString().slice(0,10);
}
export const preferenceFields=z.object({productId:z.uuid(),key:z.enum(['views','planning']),version:z.uuid().nullable(),value:z.unknown()});
