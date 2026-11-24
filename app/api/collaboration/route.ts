import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {activity,cards} from '../../../lib/schema';
import {and,desc,eq,sql,or} from 'drizzle-orm';
import {z} from 'zod';
import {productAccess,memberIds} from '../../../lib/product-access';
import {collaborate} from '../../../lib/collaboration-store';
import {RequestError} from '../../../lib/card-write';
import {isMcpOriginAllowed} from '../../../lib/mcp-token';
const failure=(e:unknown)=>Response.json({error:e instanceof RequestError?e.message:e instanceof z.ZodError?'Check the fields.':'Could not load or save collaboration.'},{status:e instanceof RequestError?e.status:e instanceof z.ZodError?400:500});
export async function GET(request:Request){try{
 const {userId}=await auth();if(!userId)return Response.json({error:'Sign in to continue.'},{status:401});
 const url=new URL(request.url),productId=z.uuid().parse(url.searchParams.get('product'));
 return Response.json(await database().transaction(async tx=>{
  const {product,role}=await productAccess(tx,productId,userId);
  const events=await tx.select().from(activity).where(and(eq(activity.productId,productId),or(sql`${activity.action} in ('Comment','Agent claim','Agent handoff','Delivery evidence','Triage decision','Product archive','Release review') or ${activity.action} like 'Outcome %' or ${activity.action} like 'Cycle %'`,and(sql`${activity.action} in ('Private notification','Private notification read')`,sql`${activity.after}->>'recipient' = ${userId}`)))).orderBy(desc(activity.createdAt),desc(activity.id)).limit(500);
  const names=await tx.select({after:activity.after}).from(activity).where(and(eq(activity.productId,productId),eq(activity.action,'Accepted product invitation'))).orderBy(desc(activity.createdAt));
  const people:Record<string,string>={[product.owner]:'Board owner',[userId]:'Me'};for(const row of names){const data=row.after as {userId:string;name?:string};if(data.userId!==userId&&!people[data.userId])people[data.userId]=data.name||'Member';}
  return {revision:product.revision,role,userId,people,members:[...await memberIds(tx,productId,product.owner)],events};
 }));
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const {userId}=await auth();if(!userId)return Response.json({error:'Sign in to continue.'},{status:401});
 if(!isMcpOriginAllowed(request))return Response.json({error:'Invalid origin.'},{status:403});
 const raw=await request.text();if(raw.length>100000)return Response.json({error:'Request too large.'},{status:413});
 const input=JSON.parse(raw),productId=z.uuid().parse(input.productId);
 return Response.json(await database().transaction(async tx=>{const {product,role}=await productAccess(tx,productId,userId,true);return collaborate(tx,product,userId,role,input);}));
}catch(e){return failure(e);}}
