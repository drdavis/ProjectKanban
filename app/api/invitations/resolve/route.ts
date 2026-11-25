import {and,eq,sql} from 'drizzle-orm';
import {database} from '../../../../lib/db';
import {activity,products} from '../../../../lib/schema';
import {inviteDigest,invitationMatches,type Invitation} from '../../../../lib/invitations';
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 try{
  const {token}=await request.json();
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return Response.json({error:'Open the complete invitation link from your email.'},{status:400});
  const [row]=await database().select({invite:activity.after,board:products.name}).from(activity).innerJoin(products,eq(products.id,activity.productId)).where(and(eq(activity.action,'Private invitation'),sql`${activity.after}->>'digest' = ${inviteDigest(token)}`)).limit(1);
  const invite=row?.invite as Invitation|undefined;
  if(!invite)return Response.json({error:'This invitation was not found. Ask the board owner for a new invitation.'},{status:404});
  if(invite.state==='accepted')return Response.json({accepted:true,board:row.board},{headers:{'Cache-Control':'no-store'}});
  if(!invitationMatches(invite,invite.email))return Response.json({error:'This invitation has expired or was revoked. Ask the board owner for a new invitation.'},{status:410});
  return Response.json({email:invite.email,name:invite.name,board:row.board},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'We could not check this invitation. Please try again.'},{status:503});}
}
