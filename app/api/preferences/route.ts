import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {activity} from '../../../lib/schema';
import {and,desc,eq,sql} from 'drizzle-orm';
import {z} from 'zod';
import {productAccess} from '../../../lib/product-access';
import {isMcpOriginAllowed} from '../../../lib/mcp-token';
import {preferenceFields} from '../../../lib/collaboration';
const keySchema=z.enum(['views','planning']);
export async function GET(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});try{
 const url=new URL(request.url),productId=z.uuid().parse(url.searchParams.get('product')),key=keySchema.parse(url.searchParams.get('key'));
 return Response.json(await database().transaction(async tx=>{await productAccess(tx,productId,userId);
 const [row]=await tx.select().from(activity).where(and(eq(activity.productId,productId),eq(activity.actor,userId),eq(activity.action,'Private preference '+key))).orderBy(desc(activity.createdAt),desc(activity.id)).limit(1);
 return {version:row?.id??null,value:row?.after??null};}));
}catch{return Response.json({error:'Could not load saved preferences.'},{status:400});}}
export async function POST(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});if(!isMcpOriginAllowed(request))return Response.json({error:'Invalid origin.'},{status:403});try{
 const raw=await request.text();if(raw.length>150000)return Response.json({error:'Draft too large.'},{status:413});const input=preferenceFields.parse(JSON.parse(raw));
 return await database().transaction(async tx=>{const {role}=await productAccess(tx,input.productId,userId,true);if(input.key==='planning'&&role==='viewer')return Response.json({error:'Editor access required.'},{status:403});
 const scope=and(eq(activity.productId,input.productId),eq(activity.actor,userId),eq(activity.action,'Private preference '+input.key));
 const [previous]=await tx.select({id:activity.id}).from(activity).where(scope).orderBy(desc(activity.createdAt),desc(activity.id)).limit(1);
 if((previous?.id??null)!==input.version)return Response.json({error:'This draft or view changed on another device. Reload before saving.'},{status:409});
 const [saved]=await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:input.productId,actor:userId,action:'Private preference '+input.key,after:input.value}).returning({version:activity.id});return Response.json(saved);
 });
}catch{return Response.json({error:'Could not save preferences.'},{status:400});}}
