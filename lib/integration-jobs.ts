import {and,eq,sql,inArray} from 'drizzle-orm';
import {activity,cards,products} from './schema';
import type {Transaction} from './product-access';
import {latestEvent} from './collaboration-store';
import {RequestError} from './card-write';
export type DeliveryJob={deliveryId:string;hash:string;provider:'github'|'vercel';state:'pending'|'unmatched'|'processed';linked:number;attempts:number;info:{identity:string;commit:string;mergeCommit?:string;cardIds:string[];kind:string;url:string;state:string;summary:string}};
// Caller holds the product lock. The normalized signed event is durable before processing.
export async function processIntegrationJob(tx:Transaction,product:typeof products.$inferSelect,jobId:string){
 const [row]=await tx.select().from(activity).where(and(eq(activity.productId,product.id),eq(activity.id,jobId),sql`${activity.action} in ('Private webhook github','Private webhook vercel')`));
 if(!row)throw new RequestError('Integration event not found.',404);
 const job=row.after as DeliveryJob;if(!job.info)throw new RequestError('This older event must be redelivered by its provider.',409);
 if(job.state==='processed')return {replayed:true,linked:job.linked};
 const config=(await latestEvent(tx,product.id,'Private integration '+job.provider))?.after as {enabled:boolean;externalId:string}|undefined;
 if(!config?.enabled||config.externalId!==job.info.identity)throw new RequestError('Enable the matching integration before retrying.',409);
 const info=job.info;
 const linked=await tx.select({after:activity.after}).from(activity).where(and(eq(activity.productId,product.id),eq(activity.action,'Delivery evidence'),sql`(${activity.after}->>'commit' = ${info.commit} or ${activity.after}->>'mergeCommit' = ${info.commit})`));
 const ids=[...new Set([...info.cardIds,...linked.map(r=>(r.after as {cardId:string}).cardId)])];
 const targets=ids.length?await tx.select({id:cards.id}).from(cards).where(and(eq(cards.productId,product.id),inArray(cards.id,ids))):[];
 for(const card of targets)await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:product.id,actor:job.provider,action:'Delivery evidence',after:{...info,cardId:card.id,source:job.provider,deliveryId:job.deliveryId}});
 await tx.update(activity).set({after:{...job,state:targets.length?'processed':'unmatched',linked:targets.length,attempts:job.attempts+1}}).where(eq(activity.id,row.id));
 if(targets.length)await tx.update(products).set({revision:product.revision+1}).where(eq(products.id,product.id));
 return {linked:targets.length,state:targets.length?'processed':'unmatched'};
}
