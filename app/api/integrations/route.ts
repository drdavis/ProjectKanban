import {sql} from "drizzle-orm";
import {z} from 'zod';
import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {productAccess} from '../../../lib/product-access';
import {latestEvent} from '../../../lib/collaboration-store';
import {activity} from '../../../lib/schema';
import {encryptApiKey} from '../../../lib/provider-secrets';
import {isMcpOriginAllowed} from '../../../lib/mcp-token';
const fields=z.object({productId:z.uuid(),provider:z.enum(['github','vercel']),externalId:z.string().trim().min(1).max(200),secret:z.string().min(16).max(500),enabled:z.boolean()});
export async function GET(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});try{const productId=z.uuid().parse(new URL(request.url).searchParams.get('product'));return Response.json(await database().transaction(async tx=>{const {role}=await productAccess(tx,productId,userId);if(role!=='owner')throw new Error();const result=[];for(const provider of ['github','vercel']){const row=await latestEvent(tx,productId,'Private integration '+provider);const data=row?.after as {externalId:string;enabled:boolean}|undefined;result.push({provider,externalId:data?.externalId??'',enabled:data?.enabled??false,url:new URL('/api/hooks/'+provider+'?product='+productId,request.url).toString()});}return result;}));}catch{return Response.json({error:'Owner access required.'},{status:403});}}
export async function POST(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});if(!isMcpOriginAllowed(request))return Response.json({error:'Invalid origin.'},{status:403});try{const data=fields.parse(await request.json());return Response.json(await database().transaction(async tx=>{const {role}=await productAccess(tx,data.productId,userId,true);if(role!=='owner')throw new Error();await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:data.productId,actor:userId,action:'Private integration '+data.provider,after:{externalId:data.provider==='github'?data.externalId.toLowerCase():data.externalId,enabled:data.enabled,secret:encryptApiKey(data.secret,'webhook:'+data.productId+':'+data.provider)}});return {ok:true};}));}catch{return Response.json({error:'Could not save integration. Check owner access, fields, and server credential encryption.'},{status:400});}}
