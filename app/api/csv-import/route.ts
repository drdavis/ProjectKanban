import {createHash} from 'node:crypto';
import {and,eq,sql} from 'drizzle-orm';
import {z} from 'zod';
import {auth} from '../../../lib/auth';
import {database} from '../../../lib/db';
import {activity,cards,products} from '../../../lib/schema';
import {csvLimit,previewCsv,rowIdentity} from '../../../lib/csv-import';
import {executionFields} from '../../../lib/card-quality';
const inputSchema=z.object({productId:z.uuid(),revision:z.number().int(),filename:z.string().min(1).max(255),csv:z.string().max(csvLimit),mapping:z.object({title:z.string(),notes:z.string(),assignee:z.string(),status:z.string(),attachments:z.string(),summary:z.string()}).strict(),doneOnly:z.boolean(),preserveDone:z.boolean(),confirmed:z.literal(true)}).strict();
export async function POST(request:Request){
  try{
    const {userId}=await auth();if(!userId)return Response.json({error:'Sign in to continue.'},{status:401});
    const origin=request.headers.get('origin');if(origin && new URL(origin).host!==new URL(request.url).host)return Response.json({error:'Invalid origin.'},{status:403});
    const body=await request.text();if(new TextEncoder().encode(body).length>3*csvLimit)return Response.json({error:'Import is too large.'},{status:413});
    const input=inputSchema.parse(JSON.parse(body));
    let preview;
    try{preview=previewCsv(input.csv,input.mapping,input.doneOnly,input.preserveDone);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid CSV.'},{status:400});}
    if(!preview.rows.length)return Response.json({error:'No named rows match this selection.'},{status:400});
    const result=await database().transaction(async tx=>{
      const [product]=await tx.select().from(products).where(and(eq(products.id,input.productId),eq(products.owner,userId))).for('update');
      if(!product)return {error:'Only the product owner can import CSV files.',status:403};
      if(product.revision!==input.revision)return {error:'The board changed. Refresh and review the import again.',status:409};
      const imports=await tx.select({after:activity.after}).from(activity).where(and(eq(activity.productId,product.id),eq(activity.action,'Imported CSV')));
      const known=new Set(imports.flatMap(r=>(r.after as {fingerprints?:string[]})?.fingerprints??[]));
      const [max]=await tx.select({position:sql<number>`coalesce(max(${cards.position}),0)`}).from(cards).where(eq(cards.productId,product.id));
      let position=Number(max.position),duplicates=0;const values=[];const fingerprints:string[]=[];
      for(const row of preview.rows){
        const fingerprint=createHash('sha256').update(rowIdentity(row.source)).digest('hex');
        if(known.has(fingerprint)){duplicates++;continue;}known.add(fingerprint);fingerprints.push(fingerprint);position+=1024;
        const provenance=`Imported from ${input.filename}, row ${row.row}. Original status: ${row.originalStatus||'(blank)'}. ${row.status==='Done'?'Historical completion reported by the source; not independently verified in ProjectKanban.':'Imported to Backlog for review.'}`;
        values.push({productId:product.id,kind:'development',status:row.status,title:row.title,description:row.description,responsible:row.responsible,position,tags:['csv-import',...(row.status==='Done'?['historical-done']:[])],execution:executionFields.parse({verificationRequired:true,result:'Pending',evidence:provenance})});
      }
      if(values.length){
        // Owner-confirmed migration only. Never mark imported history as a passed test.
        // Normal card creation, editing, reopening and closure still use saveCard's quality gates.
        await tx.insert(cards).values(values);
        await tx.insert(activity).values({productId:product.id,actor:userId,action:'Imported CSV',after:{filename:input.filename,count:values.length,fingerprints,preserveDone:input.preserveDone,duplicates,skipped:preview.skipped}});
        await tx.update(products).set({revision:product.revision+1}).where(eq(products.id,product.id));
      }
      return {imported:values.length,duplicates,skipped:preview.skipped};
    });
    if('error' in result)return Response.json({error:result.error},{status:result.status});
    return Response.json(result);
  }catch(e){return Response.json({error:e instanceof z.ZodError?'Check the CSV import settings.':'Could not import CSV. No rows were saved.'},{status:400});}
}
