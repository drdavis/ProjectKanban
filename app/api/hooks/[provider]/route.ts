import {z} from 'zod';
import {and,eq,sql} from 'drizzle-orm';
import {createHash} from 'node:crypto';
import {database} from '../../../../lib/db';
import {activity,products} from '../../../../lib/schema';
import {latestEvent} from '../../../../lib/collaboration-store';
import {decryptApiKey} from '../../../../lib/provider-secrets';
import {deliveryFromWebhook,validSignature} from '../../../../lib/delivery';
import {processIntegrationJob,type DeliveryJob} from '../../../../lib/integration-jobs';
import {RequestError} from '../../../../lib/card-write';
export async function POST(request:Request,context:{params:Promise<{provider:string}>}){try{
 const provider=z.enum(['github','vercel']).parse((await context.params).provider),productId=z.uuid().parse(new URL(request.url).searchParams.get('product'));
 const raw=await request.text();if(Buffer.byteLength(raw)>1000000)return new Response('Payload too large.',{status:413});
 const db=database();
 const staged=await db.transaction(async tx=>{
  const [product]=await tx.select().from(products).where(eq(products.id,productId)).for('update');if(!product)throw new RequestError('Not configured.',404);
  const config=(await latestEvent(tx,productId,'Private integration '+provider))?.after as {enabled:boolean;externalId:string;secret:string}|undefined;
  if(!config?.enabled)throw new RequestError('Not configured.',404);
  const secret=decryptApiKey(config.secret,'webhook:'+productId+':'+provider);
  if(!validSignature(raw,secret,request.headers.get(provider==='github'?'x-hub-signature-256':'x-vercel-signature')??'',provider))throw new RequestError('Invalid signature.',401);
  const body=JSON.parse(raw),event=provider==='github'?request.headers.get('x-github-event')??'':String(body.type??''),deliveryId=z.string().min(1).max(200).parse(provider==='github'?request.headers.get('x-github-delivery'):body.id);
  const hash=createHash('sha256').update(raw).digest('hex');
  const [prior]=await tx.select().from(activity).where(and(eq(activity.productId,productId),eq(activity.action,'Private webhook '+provider),sql`${activity.after}->>'deliveryId' = ${deliveryId}`)).limit(1);
  if(prior){if((prior.after as {hash:string}).hash!==hash)throw new RequestError('Delivery ID reused with different content.',409);return {jobId:prior.id};}
  const info=deliveryFromWebhook(provider,event,body);if(!info)return {ignored:true};
  if(info.identity!==config.externalId)throw new RequestError('Integration identity mismatch.',403);
  const job:DeliveryJob={provider,deliveryId,hash,info,state:'pending',linked:0,attempts:0};
  const [saved]=await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId,actor:provider,action:'Private webhook '+provider,after:job}).returning({id:activity.id});
  return {jobId:saved.id};
 });
 if(!staged.jobId)return Response.json({ignored:true});
 return Response.json(await db.transaction(async tx=>{const [product]=await tx.select().from(products).where(eq(products.id,productId)).for('update');if(!product)throw new RequestError('Product not found.',404);return processIntegrationJob(tx,product,staged.jobId!);}));
}catch(error){return new Response(error instanceof RequestError?error.message:'Could not process webhook. Retry server failures.',{status:error instanceof RequestError?error.status:error instanceof z.ZodError||error instanceof SyntaxError?400:500});}}
