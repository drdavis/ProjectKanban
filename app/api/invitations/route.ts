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
  const token=inviteToken();const fields:Invitation={email:command.email.trim().toLowerCase(),name:command.name,role:command.role,digest:inviteDigest(token),expiresAt:new Date(Date.now()+7*86400000).toISOString(),state:'pending'};
  await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:product.id,actor:userId,action:'Private invitation',after:fields});
  return {url:new URL('/invite#'+token,new URL(request.url).origin).toString(),expiresAt:fields.expiresAt,productName:product.name};
 });
 if(command.action==='invite'&&command.sendEmail&&'url' in result){
  try{const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.INVITATION_FROM_EMAIL,to:[command.email],subject:'Invitation to '+result.productName,text:'You have been invited to '+result.productName+' in ProjectKanban. Use your invited email address to join: '+result.url+'\nThis link expires in seven days.'}),signal:AbortSignal.timeout(10000)});return Response.json({...result,emailSent:sent.ok,...(!sent.ok?{warning:'The invitation was created, but email delivery failed. Copy and share the link.'}:{})});}catch{return Response.json({...result,emailSent:false,warning:'The invitation was created, but email delivery failed. Copy and share the link.'});}
 }
 return Response.json(result);
}catch(e){return Response.json({error:e instanceof RequestError?e.message:'Check the invitation details.'},{status:e instanceof RequestError?e.status:400});}}
