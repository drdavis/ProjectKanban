import {auth} from '../../../lib/auth';
import {and,asc,eq,or,sql,inArray} from 'drizzle-orm';
import {database} from '../../../lib/db';
import {cards,productMembers,products} from '../../../lib/schema';
import {qualityPolicyFields} from '../../../lib/quality-policy';
import {qualityIssues} from '../../../lib/card-quality';
export async function GET(){
 const {userId}=await auth();if(!userId)return Response.json({error:'Sign in to continue.'},{status:401});
 const db=database();const result=await db.select({productId:products.id,productName:products.name,cardId:cards.id,title:cards.title,status:cards.status,kind:cards.kind,severity:cards.severity,criteria:cards.criteria,execution:cards.execution,assignment:cards.roadmapAssignment,
 policy:sql`(select a.after from activity a where a.product_id=${products.id} and a.action='Changed quality policy' order by a.created_at desc,a.id desc limit 1)`,
 createdAt:sql<string|null>`(select min(a.created_at) from activity a where a.product_id=${products.id} and a.action='Created card' and a.after->>'id'=${cards.id}::text)`,
 intake:sql<{decision:string;deferUntil?:string}|null>`(select a.after from activity a where a.product_id=${products.id} and a.action='Triage decision' and a.after->>'cardId'=${cards.id}::text order by a.created_at desc,a.id desc limit 1)`
 }).from(products).innerJoin(cards,eq(cards.productId,products.id)).leftJoin(productMembers,and(eq(productMembers.productId,products.id),eq(productMembers.userId,userId)))
 .where(and(or(eq(products.owner,userId),eq(productMembers.userId,userId)),sql`coalesce((select a.after->>'archived' from activity a where a.product_id=${products.id} and a.action='Product archive' order by a.created_at desc,a.id desc limit 1),'false') <> 'true'`))
 .orderBy(asc(products.name),asc(cards.position),asc(cards.id)).limit(501);
 const visible=result.slice(0,500),blockerIds=[...new Set(visible.flatMap(c=>c.execution?.blockers??[]))];
 const dependencies=blockerIds.length?await db.select({id:cards.id,status:cards.status,productId:cards.productId}).from(cards).where(and(inArray(cards.id,blockerIds),inArray(cards.productId,[...new Set(visible.map(c=>c.productId))]))):[];
 return Response.json({items:visible.map(({execution,policy,assignment,criteria,...item})=>{
 const config=qualityPolicyFields.parse(policy??{}),blocked=execution?.blockers.some(id=>{const d=dependencies.find(d=>d.id===id&&d.productId===item.productId);return !d||!['Done','Closed'].includes(d.status);})??false;
 const complete=['Done','Closed'].includes(item.status),releaseRisk=!!assignment?.releaseId&&(blocked||(!complete&&['Critical','Major'].includes(item.severity))||(complete&&qualityIssues({...item,criteria,execution},item.status,config).length>0));
 return {...item,workType:config.workType,client:execution?.work?.client??'',agency:execution?.work?.agency??'',dueDate:execution?.work?.dueDate??null,cycle:execution?.work?.cycle??'',outcome:execution?.work?.outcome??'',impact:execution?.work?.impact??0,effort:execution?.work?.effort??0,source:execution?.work?.source??'',blocked,releaseRisk};
 }),truncated:result.length>500});
}
