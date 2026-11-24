import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {productAccess} from '../../../lib/product-access';
import {cards} from '../../../lib/schema';
import {eq,asc} from 'drizzle-orm';
import {z} from 'zod';
const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
export async function GET(request:Request){const {userId}=await auth();if(!userId)return new Response('Sign in.',{status:401});try{
 const id=z.uuid().parse(new URL(request.url).searchParams.get('product'));
 return await database().transaction(async tx=>{await productAccess(tx,id,userId);const rows=await tx.select().from(cards).where(eq(cards.productId,id)).orderBy(asc(cards.position));
 const csv=[['Name','Notes','Assignee','Status','Attachment Summary','Due date','Card ID'],...rows.map(c=>[c.title,c.description,c.responsible,c.status,c.execution?.attachmentSummary,c.execution?.work?.dueDate,c.id])].map(row=>row.map(cell).join(',')).join('\r\n');
 return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="tasks.csv"','Cache-Control':'no-store'}});});
}catch{return new Response('Product not available.',{status:404});}}
