import type {InvitationDelivery} from './invitation-delivery';
import {and,desc,eq,sql} from 'drizzle-orm';
import {createHash,randomBytes} from 'node:crypto';
import {activity,products,productMembers} from './schema';
import {database} from './db';
import type {Transaction} from './product-access';
export type Invitation={delivery?:InvitationDelivery;email:string;role:'editor'|'viewer';digest:string;expiresAt:string;state:'pending'|'accepted'|'revoked';name:string};
export const inviteDigest=(token:string)=>createHash('sha256').update(token).digest('hex');
export const inviteToken=()=>randomBytes(32).toString('base64url');
export function invitationMatches(invite:Invitation,email:string,now=Date.now()){return invite.state==='pending'&&Date.parse(invite.expiresAt)>now&&invite.email===email.trim().toLowerCase();}
export async function validInvitation(token:string,email:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return false;
 const [row]=await database().select({after:activity.after}).from(activity).where(and(eq(activity.action,'Private invitation'),sql`${activity.after}->>'digest' = ${inviteDigest(token)}`)).limit(1);
 return !!row&&invitationMatches(row.after as Invitation,email);
}
// A verified provider identity must match the invited email. Never grant by name.
export async function acceptInvitations(user:{id:string;email:string;emailVerified:boolean;name?:string}){
 if(!user.emailVerified)return;
 const db=database(),email=user.email.trim().toLowerCase();
 const invites=await db.select({id:activity.id,productId:activity.productId}).from(activity).where(and(eq(activity.action,'Private invitation'),sql`${activity.after}->>'email' = ${email}`,sql`${activity.after}->>'state' = 'pending'`)).limit(100);
 for(const item of invites)await db.transaction(async tx=>{
  const [product]=await tx.select().from(products).where(eq(products.id,item.productId)).for('update');if(!product)return;
  const [row]=await tx.select().from(activity).where(eq(activity.id,item.id));const invite=row?.after as Invitation|undefined;
  if(!invite||!invitationMatches(invite,email))return;
  if(product.owner!==user.id)await tx.insert(productMembers).values({productId:product.id,userId:user.id,role:invite.role}).onConflictDoNothing();
  await tx.update(activity).set({after:{...invite,state:'accepted',userId:user.id}}).where(eq(activity.id,item.id));
  await tx.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:product.id,actor:user.id,action:'Accepted product invitation',after:{userId:user.id,role:invite.role,name:user.name||invite.name||'Member'}});
 });
}
