import {and,desc,eq,sql} from 'drizzle-orm';
import {activity,cards,products} from './schema';
import {RequestError,saveCard} from './card-write';
import type {Transaction} from './product-access';
import {memberIds} from './product-access';
import {canClaim,collabCommand,workFields,type Claim} from './collaboration';
import {qualityIssues,executionFields} from './card-quality';
import {readQualityPolicy} from './quality-policy-store';
import {createHash} from 'node:crypto';
export async function latestEvent(tx:Transaction,productId:string,action:string,cardId?:string){
 const [event]=await tx.select().from(activity).where(and(eq(activity.productId,productId),eq(activity.action,action),cardId?sql`${activity.after}->>'cardId' = ${cardId}`:undefined)).orderBy(desc(activity.createdAt),desc(activity.id)).limit(1);return event;
}
export async function collaborate(tx:Transaction,product:typeof products.$inferSelect,actor:string,role:string,raw:unknown){
 const input=collabCommand.parse(raw);
 if(input.productId!==product.id)throw new RequestError('Product not found.',404);
 const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const [prior]=await tx.select().from(activity).where(and(eq(activity.productId,product.id),eq(activity.actor,actor),eq(activity.action,'Private collaboration request'),sql`${activity.after}->>'requestId' = ${input.requestId}`)).limit(1);
 if(prior){if((prior.after as {hash:string}).hash!==hash)throw new RequestError('Request ID already used with different content.',409);return {ok:true,replayed:true,revision:product.revision};}
 if(input.action!=='ack' && role==='viewer')throw new RequestError('Editor access is required.',403);
 if(input.action==='archive' && role!=='owner')throw new RequestError('Only the owner can archive this product.',403);
 if(input.revision!==product.revision)throw new RequestError('The board changed. Refresh before saving.',409);
 const archive=(await latestEvent(tx,product.id,'Product archive'))?.after as {archived?:boolean}|undefined;
 if(archive?.archived&&!['archive','ack'].includes(input.action))throw new RequestError('Restore this archived product before editing.',409);
 const members=await memberIds(tx,product.id,product.owner);
 let card:typeof cards.$inferSelect|undefined;
 if('cardId' in input){[card]=await tx.select().from(cards).where(and(eq(cards.productId,product.id),eq(cards.id,input.cardId)));if(!card)throw new RequestError('Card not found.',404);}
 const record=async(action:string,after:unknown)=>{await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:product.id,actor,action,after});};
 const notify=async(recipient:string,text:string)=>{if(members.has(recipient)&&recipient!==actor)await record('Private notification',{recipient,text,cardId:card?.id});};
 if(['outcome','cycle','release.review'].includes(input.action)&&role!=='owner')throw new RequestError('Owner access is required for planning and release approval.',403);
 if(input.action==='classify'){
  for(const id of new Set(input.cardIds)){const [item]=await tx.select().from(cards).where(and(eq(cards.productId,product.id),eq(cards.id,id)));if(!item)throw new RequestError('Card not found.',404);const current=workFields.parse(item.execution?.work??{});await saveCard(tx,product.id,actor,{...item,kind:item.kind as 'development'|'bug',priority:item.priority as 'Normal',severity:item.severity as '',execution:{...item.execution,work:{...current,client:input.client,agency:input.agency}}},item.id);}
 }else if(input.action==='bulk'){
  for(const id of new Set(input.cardIds)){
   const [item]=await tx.select().from(cards).where(and(eq(cards.productId,product.id),eq(cards.id,id)));if(!item)throw new RequestError('Card not found.',404);
   await saveCard(tx,product.id,actor,{...item,kind:item.kind as 'development'|'bug',priority:item.priority as 'Normal',severity:item.severity as '',execution:item.execution??undefined,status:input.status},item.id);
  }
 }else if(input.action==='outcome'){
  if(input.fields.ownerId&&!members.has(input.fields.ownerId))throw new RequestError('Choose an outcome owner with access to this board.');
  if(input.fields.releaseIds.some(id=>!product.releases.some(r=>r.id===id)))throw new RequestError('Choose releases from this product.');
  await record('Outcome '+input.fields.id,input.fields);
 }else if(input.action==='cycle'){
  await record('Cycle '+input.fields.id,input.fields);
 }else if(input.action==='release.review'){
  if(!product.releases.some(r=>r.id===input.releaseId))throw new RequestError('Release not found.',404);
  const all=await tx.select().from(cards).where(eq(cards.productId,product.id));
  const scope=all.filter(c=>c.roadmapAssignment?.releaseId===input.releaseId),policy=await readQualityPolicy(tx,product.id);
  if(input.approved&&(!scope.length||scope.some(c=>!['Done','Closed'].includes(c.status)||qualityIssues(c,c.status,policy).length)))throw new RequestError('Finish and verify all release cards before approving.',409);
  await record('Release review',{releaseId:input.releaseId,approved:input.approved,evidence:input.evidence,revision:product.revision});
 }else if(input.action==='work'){
  const claim=(await latestEvent(tx,product.id,'Agent claim',card!.id))?.after as Claim|undefined;
  if(actor.startsWith('MCP ·')&&!canClaim(claim,actor))throw new RequestError('Another agent holds this task.',409);
  if(input.fields.assigneeId && !members.has(input.fields.assigneeId))throw new RequestError('Choose an account with access to this board.');
  const execution=executionFields.parse(card!.execution??{});
  await tx.update(cards).set({execution:{...execution,work:input.fields}}).where(eq(cards.id,card!.id));
  await record('Updated work details',{cardId:card!.id,...input.fields});
  if(input.fields.assigneeId && input.fields.assigneeId!==execution.work?.assigneeId)await notify(input.fields.assigneeId,'Assigned: '+card!.title);
 }else if(input.action==='comment'){
  if(input.mentions.some(id=>!members.has(id)))throw new RequestError('Mention only members of this board.');
  await record('Comment',{cardId:card!.id,text:input.text,mentions:input.mentions});
  for(const id of new Set([...input.mentions,...(card!.execution?.work?.assigneeId?[card!.execution.work.assigneeId]:[])]))await notify(id,'Comment on '+card!.title);
 }else if(input.action==='claim'){
  const current=(await latestEvent(tx,product.id,'Agent claim',card!.id))?.after as Claim|undefined;
  if(!canClaim(current,actor))throw new RequestError('This task is claimed by '+current!.actor+' until '+current!.expiresAt+'.',409);
  await record('Agent claim',{cardId:card!.id,actor,expiresAt:new Date(Date.now()+30*60*1000).toISOString(),released:input.release});
 }else if(input.action==='handoff'){
  const current=(await latestEvent(tx,product.id,'Agent claim',card!.id))?.after as Claim|undefined;
  if(!canClaim(current,actor))throw new RequestError('Another agent holds this task.',409);
  await record('Agent handoff',{cardId:card!.id,...input.fields});
  if(card!.execution?.work?.assigneeId)await notify(card!.execution.work.assigneeId,'Handoff: '+card!.title);
 }else if(input.action==='delivery'){
  await record('Delivery evidence',{cardId:card!.id,...input.fields,source:'manual'});
 }else if(input.action==='archive'){
  await record('Product archive',{archived:input.archived});
 }else if(input.action==='triage'){
  if(input.decision==='defer'&&!input.deferUntil)throw new RequestError('Choose a date for this task to return to intake.');
  if(input.decision==='duplicate'){
   const [target]=input.duplicateOf?await tx.select({id:cards.id}).from(cards).where(and(eq(cards.productId,product.id),eq(cards.id,input.duplicateOf))):[];
   if(!target||target.id===card!.id)throw new RequestError('Choose a different card on this board.');
   const attachments=await tx.select().from(activity).where(and(eq(activity.productId,product.id),eq(activity.action,'Stored attachment'),sql`${activity.after}->>'cardId' = ${card!.id}`));
   for(const attachment of attachments){await tx.update(activity).set({after:{...attachment.after as object,cardId:target.id}}).where(eq(activity.id,attachment.id));await record('Merged duplicate attachment',{attachmentId:attachment.id,fromCardId:card!.id,cardId:target.id});}

  }
  await record('Triage decision',{cardId:card!.id,decision:input.decision,reason:input.reason,deferUntil:input.deferUntil,duplicateOf:input.duplicateOf});
  if(input.decision==='duplicate')await record('Comment',{cardId:input.duplicateOf,text:'Related duplicate: '+card!.title+' ('+card!.id+'). '+input.reason,mentions:[],relatedCardId:card!.id});
 }else if(input.action==='ack'){
  const [note]=await tx.select().from(activity).where(and(eq(activity.id,input.notificationId),eq(activity.productId,product.id),eq(activity.action,'Private notification'),sql`${activity.after}->>'recipient' = ${actor}`));
  if(!note)throw new RequestError('Notification not found.',404);
  await record('Private notification read',{notificationId:input.notificationId,recipient:actor});
 }
 await record('Private collaboration request',{requestId:input.requestId,hash});
 await tx.update(products).set({revision:product.revision+1}).where(eq(products.id,product.id));
 return {ok:true,revision:product.revision+1};
}
