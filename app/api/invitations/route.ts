import {sendInvitationEmail} from '../../../lib/invitation-delivery';
import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {activity} from '../../../lib/schema';
import {and,desc,eq,sql} from 'drizzle-orm';
import {z} from 'zod';
import {productAccess} from '../../../lib/product-access';
import {inviteToken,inviteDigest,type Invitation} from '../../../lib/invitations';
import {RequestError} from '../../../lib/card-write';
import {isMcpOriginAllowed} from '../../../lib/mcp-token';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('invite'),productId:z.uuid(),email:z.email().max(254),name:z.string().trim().max(100),role:z.enum(['editor','viewer']),sendEmail:z.boolean().default(false)}),
 z.object({action:z.literal('revoke'),productId:z.uuid(),invitationId:z.uuid()}),
]);
export async function GET(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});try{
 const id=z.uuid().parse(new URL(request.url).searchParams.get('product'));
 const rows=await database().transaction(async tx=>{const {role}=await productAccess(tx,id,userId);if(role!=='owner')throw new RequestError('Owner access required.',403);
 const rows=await tx.select().from(activity).where(and(eq(activity.productId,id),eq(activity.action,'Private invitation'))).orderBy(desc(activity.createdAt)).limit(100);
 return rows.map(row=>{const {digest,...invite}=row.after as Invitation;return {id:row.id,...invite};});});return Response.json(rows,{headers:{'X-Email-Available':String(!!(process.env.RESEND_API_KEY&&process.env.INVITATION_FROM_EMAIL))}});
}catch(e){return Response.json({error:'Could not list invitations.'},{status:e instanceof RequestError?e.status:400});}}
export async function POST(request:Request){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});if(!isMcpOriginAllowed(request))return Response.json({error:'Invalid origin.'},{status:403});try{
 const command=input.parse(await request.json());
 if(command.action==='invite'&&command.sendEmail&&!(process.env.RESEND_API_KEY&&process.env.INVITATION_FROM_EMAIL))return Response.json({error:'Email delivery is not configured. Create a link to share instead.'},{status:409});
 const result=await database().transaction(async tx=>{
  const {product,role}=await productAccess(tx,command.productId,userId,true);if(role!=='owner')throw new RequestError('Owner access required.',403);
  if(command.action==='revoke'){
   const [row]=await tx.select().from(activity).where(and(eq(activity.id,command.invitationId),eq(activity.productId,product.id),eq(activity.action,'Private invitation')));
   if(!row)throw new RequestError('Invitation not found.',404);
   await tx.update(activity).set({after:{...row.after as object,state:'revoked'}}).where(eq(activity.id,row.id));return {ok:true};
  }
  const token=inviteToken();const fields:Invitation={email:command.email.trim().toLowerCase(),name:command.name,role:command.role,digest:inviteDigest(token),expiresAt:new Date(Date.now()+7*86400000).toISOString(),state:'pending',delivery:{status:command.sendEmail?'sending':'not-requested',at:new Date().toISOString()}};
  const [invitation]=await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:product.id,actor:userId,action:'Private invitation',after:fields}).returning({id:activity.id});
  return {invitationId:invitation.id,email:fields.email,delivery:fields.delivery,url:new URL('/invite#'+token,new URL(request.url).origin).toString(),expiresAt:fields.expiresAt,productName:product.name};
 });
 if(command.action==='invite'&&command.sendEmail&&result.url&&result.email&&result.productName&&result.invitationId){
  const delivery=await sendInvitationEmail({email:result.email,productName:result.productName,url:result.url,invitationId:result.invitationId});
  try{
   // Merge only delivery metadata: acceptance or revocation may have changed meanwhile.
   await database().update(activity).set({after:sql`jsonb_set(${activity.after}, '{delivery}', ${JSON.stringify(delivery)}::jsonb)`}).where(and(eq(activity.id,result.invitationId),eq(activity.productId,command.productId),eq(activity.action,'Private invitation')));
   return Response.json({...result,delivery,emailSent:delivery.status==='sent'});
  }catch{return Response.json({...result,delivery,emailSent:delivery.status==='sent',warning:'The current email result could not be saved to invitation history. Keep this confirmation and check Resend logs before sending again.'});}
 }
 return Response.json(result);
}catch(e){return Response.json({error:e instanceof RequestError?e.message:'Check the invitation details.'},{status:e instanceof RequestError?e.status:400});}}
