import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../../../lib/auth";
import { database } from "../../../lib/db";
import { activity, cards, products, productMembers } from "../../../lib/schema";
import { RequestError } from "../../../lib/card-write";
import { maxAttachmentBytes, maxProductAttachmentBytes, validateAttachment } from "../../../lib/attachment-files";

export const runtime="nodejs";
const action="Stored attachment";
const privateHeaders={"Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff"};
async function handle(request:Request) {
  try {
    const {userId}=await auth();
    if(!userId) throw new RequestError("Sign in to continue.",401);
    const url=new URL(request.url);
    const productId=z.uuid().parse(url.searchParams.get("product"));
    const cardId=z.uuid().parse(url.searchParams.get("card"));
    const attachmentId=url.searchParams.get("attachment");
    if(attachmentId) z.uuid().parse(attachmentId);
    const write=request.method!=="GET";
    if(write && request.headers.get("origin") && new URL(request.headers.get("origin")!).host!==request.headers.get("host")) throw new RequestError("Invalid origin.",403);
    if(request.method==="POST" && Number(request.headers.get("content-length")||0)>maxAttachmentBytes+65536) throw new RequestError("Choose a file up to 2 MB.",413);
    return await database().transaction(async tx=>{
      const [product]=await tx.select().from(products).where(eq(products.id,productId)).for(write?"update":"share");
      if(!product) throw new RequestError("Product not found.",404);
      const [member]=product.owner===userId?[]:await tx.select().from(productMembers).where(and(eq(productMembers.productId,productId),eq(productMembers.userId,userId)));
      const role=product.owner===userId?"owner":member?.role;
      if(!role) throw new RequestError("Product not found.",404);
      if(write && role==="viewer") throw new RequestError("Editing access is required.",403);
      const [card]=await tx.select({id:cards.id}).from(cards).where(and(eq(cards.productId,productId),eq(cards.id,cardId)));
      if(!card) throw new RequestError("Card not found.",404);
      const scope=and(eq(activity.productId,productId),eq(activity.action,action),sql`${activity.after}->>'cardId' = ${cardId}`);
      if(request.method==="GET" && !attachmentId) {
        const files=await tx.select({id:activity.id,createdAt:activity.createdAt,metadata:sql`${activity.after} - 'data'`}).from(activity).where(scope);
        return Response.json({files},{headers:privateHeaders});
      }
      if(request.method==="POST") {
        const form=await request.formData(); const file=form.get("file");
        if(!(file instanceof File) || file.size>maxAttachmentBytes) throw new RequestError("Choose a file up to 2 MB.",413);
        const bytes=new Uint8Array(await file.arrayBuffer());
        let metadata;
        try { metadata=validateAttachment(file.name,bytes); } catch(e) { throw new RequestError((e as Error).message); }
        const [usage]=await tx.select({size:sql<number>`coalesce(sum((${activity.after}->>'size')::integer),0)`}).from(activity).where(and(eq(activity.productId,productId),eq(activity.action,action)));
        if(Number(usage.size)+bytes.length>maxProductAttachmentBytes) throw new RequestError("This product has reached its 50 MB attachment limit. Remove unused files first.",413);
        const [saved]=await tx.insert(activity).values({productId,actor:userId,action,after:{cardId,...metadata,size:bytes.length,data:Buffer.from(bytes).toString("base64")}}).returning({id:activity.id});
        await tx.insert(activity).values({productId,actor:userId,action:"Attached file",after:{cardId,attachmentId:saved.id,...metadata,size:bytes.length}});
        return Response.json(saved,{status:201,headers:privateHeaders});
      }
      if(!attachmentId) throw new RequestError("Select an attachment.");
      const [stored]=await tx.select().from(activity).where(and(scope,eq(activity.id,attachmentId)));
      if(!stored) throw new RequestError("Attachment not found.",404);
      const value=stored.after as {name:string;type:string;data:string;size:number};
      if(request.method==="DELETE") {
        await tx.delete(activity).where(eq(activity.id,stored.id));
        await tx.insert(activity).values({productId,actor:userId,action:"Removed attachment",after:{cardId,attachmentId,name:value.name}});
        return Response.json({ok:true},{headers:privateHeaders});
      }
      const inline=url.searchParams.get("preview")==="1" && value.type.startsWith("image/");
      return new Response(Buffer.from(value.data,"base64"),{headers:{...privateHeaders,"Content-Type":value.type,"Content-Disposition":`${inline?"inline":"attachment"}; filename*=UTF-8''${encodeURIComponent(value.name)}`,"Content-Security-Policy":"sandbox; default-src 'none'"}});
    });
  } catch(e) {
    return Response.json({error:e instanceof RequestError?e.message:e instanceof z.ZodError?"Invalid attachment request.":"Attachment request failed."},{status:e instanceof RequestError?e.status:e instanceof z.ZodError?400:500,headers:privateHeaders});
  }
}
export const GET=handle; export const POST=handle; export const DELETE=handle;
