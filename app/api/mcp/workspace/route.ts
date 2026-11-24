import {and,eq,gt,inArray,sql} from 'drizzle-orm';
import {z} from 'zod';
import {database} from '../../../../lib/db';
import {activity,products,mcpTokens} from '../../../../lib/schema';
import {digestToken,isMcpOriginAllowed,requestMcpToken} from '../../../../lib/mcp-token';
import {handleBoardMcp} from '../../../../lib/mcp-board';
import {RequestError} from '../../../../lib/card-write';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!isMcpOriginAllowed(request))return json({error:'Invalid origin.'},403);
 const token=requestMcpToken(request);if(!token)return json({error:'Valid connection token required.'},401);
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'Expected application/json.'},415);
 try{
 const db=database(),digest=digestToken(token);
 const [root]=await db.select().from(mcpTokens).where(and(eq(mcpTokens.digest,digest),gt(mcpTokens.expiresAt,new Date()))).limit(1);
 if(!root)return json({error:'Token expired or revoked.'},401);
 const [anchor]=await db.select().from(products).where(and(eq(products.id,root.productId),eq(products.owner,root.createdBy)));if(!anchor)return json({error:'Connection no longer authorized.'},401);
 const [grant]=await db.select().from(activity).where(and(eq(activity.productId,root.productId),eq(activity.action,'Private MCP scope'),sql`${activity.after}->>'tokenId' = ${root.id}`)).limit(1);
 const ids=z.array(z.uuid()).parse((grant?.after as {productIds?:string[]}|null)?.productIds??[root.productId]);
 const allowed=await db.select({id:products.id,name:products.name}).from(products).where(and(inArray(products.id,ids),eq(products.owner,root.createdBy)));
 const raw=await request.text();if(raw.length>200000)return json({error:'Request too large.'},413);
 const body=JSON.parse(raw),name=body.params?.name,args=body.params?.arguments??{};
 const isCall=body.method==='tools/call';
 // Always validate the MCP envelope and version through the ordinary handler first for discovery.
 const probe=new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify({...body,...(isCall&&name==='list_products'?{method:'ping',params:{}}:{})})});
 if(isCall&&name==='list_products'){
  const checked=await handleBoardMcp(probe,{productId:root.productId,owner:root.createdBy,canWrite:false},async()=>{});const result=await checked.json();if(result.error||!Object.hasOwn(result,'result'))return json(result,checked.status);
  if(Object.keys(args).length)return json({jsonrpc:'2.0',id:body.id,error:{code:-32602,message:'Expected empty arguments.'}});
  return json({jsonrpc:'2.0',id:body.id,result:{content:[{type:'text',text:JSON.stringify({products:allowed,permissions:{write:root.canWrite,roadmap:root.canPlan}})}]}});
 }
 let selected=root.productId;
 if(isCall&&name!=='get_workflow'){
  if(!z.uuid().safeParse(args.productId).success||!allowed.some(p=>p.id===args.productId))return json({jsonrpc:'2.0',id:body.id,result:{isError:true,content:[{type:'text',text:'Supply an explicit productId from list_products.'}]}});
  selected=args.productId;
 }
 const {productId,...rest}=args;
 const forwarded={...body,...(isCall?{params:{...body.params,arguments:name==='collaborate'?{...rest,productId:selected}:rest}}:{})};
 const response=await handleBoardMcp(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(forwarded)}),{productId:selected,owner:root.createdBy,canWrite:root.canWrite,canPlan:root.canPlan,tokenId:root.id,label:root.label},async tx=>{
  const [valid]=await tx.select({id:mcpTokens.id}).from(mcpTokens).where(and(eq(mcpTokens.id,root.id),eq(mcpTokens.digest,digest),eq(mcpTokens.canWrite,true),gt(mcpTokens.expiresAt,new Date())));
  if(!valid||!allowed.some(p=>p.id===selected))throw new RequestError('Connection revoked or product not authorized.',403);
 });
 await db.insert(activity).values({createdAt:sql`clock_timestamp()`,productId:root.productId,actor:root.createdBy,action:"Private MCP connection",after:{tokenId:root.id,productId:selected,status:response.status}});
 if(response.status===202)return response;
 const result=await response.json();
 if(body.method==='tools/list'&&result.result?.tools){
  for(const tool of result.result.tools){if(tool.name==='get_workflow')continue;tool.inputSchema={...tool.inputSchema,properties:{...tool.inputSchema.properties,productId:{type:'string',format:'uuid',description:'Explicit ID from list_products.'}},required:[...new Set([...(tool.inputSchema.required??[]),'productId'])]};}
  result.result.tools.unshift({name:'list_products',description:'List only products explicitly authorized for this connection. Select an explicit productId for all product reads and writes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}});
 }
 if(body.method==='initialize'&&result.result)result.result.instructions+=' Call list_products and select the intended product explicitly. Never assume a default product for a write.';
 return json(result,response.status);
 }catch{return json({error:'Could not process workspace MCP request.'},400);}
}
export function GET(){return new Response(null,{status:405,headers:{Allow:'POST'}});}
