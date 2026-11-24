import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {activity,cards,products,productMembers} from '../../../lib/schema';
import {and,asc,desc,eq,inArray,or,sql} from 'drizzle-orm';
export async function GET(){const {userId}=await auth();if(!userId)return Response.json({error:'Sign in.'},{status:401});
 const db=database();const scope=db.select({id:products.id}).from(products).where(or(eq(products.owner,userId),inArray(products.id,db.select({id:productMembers.productId}).from(productMembers).where(eq(productMembers.userId,userId)))));
 const items=await db.select({productId:products.id,productName:products.name,id:cards.id,title:cards.title,status:cards.status,kind:cards.kind,intake:sql`(select a.after from activity a where a.product_id = ${cards.productId} and a.action = 'Triage decision' and a.after->>'cardId' = ${cards.id}::text order by a.created_at desc,a.id desc limit 1)`,createdAt:sql`(select min(a.created_at) from activity a where a.product_id = ${cards.productId} and a.action = 'Created card' and a.after->>'id' = ${cards.id}::text)`,work:sql`${cards.execution}->'work'`,responsible:cards.responsible,execution:cards.execution}).from(cards).innerJoin(products,eq(cards.productId,products.id)).where(inArray(products.id,scope)).orderBy(asc(products.name),asc(cards.position)).limit(1001);
 const notifications=await db.select().from(activity).where(and(inArray(activity.productId,scope),eq(activity.action,'Private notification'),sql`${activity.after}->>'recipient' = ${userId}`,sql`not exists(select 1 from activity n where n.product_id = ${activity.productId} and n.action = 'Private notification read' and n.after->>'notificationId' = ${activity.id}::text and n.actor = ${userId})`)).orderBy(desc(activity.createdAt)).limit(100);
 return Response.json({userId,items:items.slice(0,1000),truncated:items.length>1000,notifications});
}
