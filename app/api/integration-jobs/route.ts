import {z} from 'zod';
import {and,eq,desc,sql} from 'drizzle-orm';
import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {activity} from '../../../lib/schema';
import {productAccess} from '../../../lib/product-access';
import {isMcpOriginAllowed} from '../../../lib/mcp-token';
import {processIntegrationJob,type DeliveryJob} from '../../../lib/integration-jobs';
import {RequestError} from '../../../lib/card-write';
export async function GET(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});try{const productId=z.uuid().parse(new URL(request.url).searchParams.get('product'));return Response.json(await database().transaction(async tx=>{const {role}=await productAccess(tx,productId,userId);if(role!=='owner')throw new RequestError('Owner access required.',403);const rows=await tx.select().from(activity).where(and(eq(activity.productId,productId),sql`${activity.action} in ('Private webhook github','Private webhook vercel')`)).orderBy(desc(activity.createdAt)).limit(100);return rows.map(r=>{const j=r.after as DeliveryJob;return {id:r.id,provider:j.provider??r.actor,state:j.state??'legacy',attempts:j.attempts??0,linked:j.linked,summary:j.info?.summary??j.deliveryId};});}));}catch(e){return Response.json({error:'Could not load integration events.'},{status:e instanceof RequestError?e.status:400});}}
export async function POST(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});if(!isMcpOriginAllowed(request))return Response.json({error:'Invalid origin.'},{status:403});try{const input=z.object({productId:z.uuid(),jobId:z.uuid()}).parse(await request.json());return Response.json(await database().transaction(async tx=>{const {product,role}=await productAccess(tx,input.productId,userId,true);if(role!=='owner')throw new RequestError('Owner access required.',403);return processIntegrationJob(tx,product,input.jobId);}));}catch(e){return Response.json({error:e instanceof RequestError?e.message:'Could not retry the event.'},{status:e instanceof RequestError?e.status:400});}}
