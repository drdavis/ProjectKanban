import { collaborate,latestEvent } from "./collaboration-store";
import { readQualityPolicy } from "./quality-policy-store";
import { createHash } from "node:crypto";
import { z } from "zod";
import { RequestError, saveCard } from "./card-write";
import { cardFields } from "./workflow";
import { mergeExecution, qualityIssues } from "./card-quality";
import { assignmentIsValid } from "./roadmap";
import { and, asc, eq, sql, or } from "drizzle-orm";
import { database } from "./db";
import { handleMcpRequest, type McpWriters } from "./mcp-protocol";
import { activity, cards, products, productMembers } from "./schema";
import { workflowVersion } from "./agent-workflow";

type Transaction = Parameters<Parameters<ReturnType<typeof database>["transaction"]>[0]>[0];

export async function handleBoardMcp(request: Request, access: {productId: string; owner: string; canWrite: boolean; canPlan?: boolean; tokenId?:string; label?:string},
  verifyWrite: (tx: Transaction, productId: string) => Promise<void>) {
  const db = database();
  const productScope = eq(cards.productId, access.productId);
  const owned = and(eq(products.id, access.productId), eq(products.owner, access.owner));
  const actor = "MCP · " + (access.label??"Agent") + " · " + (access.tokenId??access.owner);

  async function transact(expectedRevision: number | undefined, requestId: string | undefined, payload: unknown,
    run: (tx: Transaction, product: typeof products.$inferSelect) => Promise<unknown>) {
    try {
      return await db.transaction(async tx => {
        const [product] = await tx.select().from(products).where(owned).for("update");
        if (!product) throw new RequestError("Product not found.",404);
        await verifyWrite(tx,product.id);
        const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
        if (requestId) {
          const [existing] = await tx.select({after:activity.after}).from(activity).where(and(
            eq(activity.productId,product.id),or(eq(activity.actor,actor),eq(activity.actor,"MCP · "+access.owner)),eq(activity.action,"MCP request"),
            sql`${activity.after}->>'requestId' = ${requestId}`,
          )).limit(1);
          if (existing) {
            const record = existing.after as {hash:string;result:unknown};
            if (record.hash !== hash) throw new RequestError("This requestId was used with different content.",409);
            return {...(record.result && typeof record.result === "object" ? record.result : {result:record.result}),replayed:true,revision:product.revision};
          }
        }
        if (expectedRevision !== undefined && product.revision !== expectedRevision) throw new RequestError("The board changed. Call get_product and reread the card before retrying.",409);
        const result = await run(tx,product);
        await tx.update(products).set({revision:product.revision+1}).where(eq(products.id,product.id));
        if (requestId) await tx.insert(activity).values({productId:product.id,actor,action:"MCP request",after:{requestId,hash,result}});
        return {...(result && typeof result === "object" ? result : {result}),revision:product.revision+1};
      });
    } catch (error) {
      if (error instanceof RequestError) return {error:error.message,status:error.status};
      if (error instanceof z.ZodError) return {error:"Check the submitted card fields.",status:400};
      throw error;
    }
  }
  const summary = (card: typeof cards.$inferSelect) => ({id:card.id,title:card.title,status:card.status});
  const writers: McpWriters = {
    collaborate: input=>transact(input.revision,input.requestId,input,(tx,product)=>collaborate(tx,product,actor,"editor",input)),
    create: ({board,requestId,expectedRevision,acceptanceCriteria,...fields}) => transact(expectedRevision,requestId,{operation:"create",board,acceptanceCriteria,...fields},async(tx,product)=>
      summary(await saveCard(tx,product.id,actor,cardFields.parse({...fields,criteria:acceptanceCriteria,kind:board,status:board==="bug"?"Reported":"Backlog"})))),
    move: ({cardId,status,expectedRevision}) => transact(expectedRevision,undefined,{cardId,status},async(tx,product)=>{
      const [card] = await tx.select().from(cards).where(and(productScope,eq(cards.id,cardId)));
      if (!card) throw new RequestError("Card not found.",404);
      return summary(await saveCard(tx,product.id,actor,cardFields.parse({...card,execution:card.execution??undefined,status}),card.id));
    }),
    update: ({cardId,expectedRevision,fields}) => transact(expectedRevision,undefined,{cardId,fields},async(tx,product)=>{
      const [card] = await tx.select().from(cards).where(and(productScope,eq(cards.id,cardId)));
      if (!card) throw new RequestError("Card not found.",404);
      const {acceptanceCriteria,execution,...rest}=fields;
      return summary(await saveCard(tx,product.id,actor,cardFields.parse({...card,...rest,
        criteria:acceptanceCriteria??card.criteria,
        execution:execution ? mergeExecution(card.execution,execution) : card.execution??undefined,
      }),card.id));
    }),
    ...(access.canPlan ? {roadmap: (({expectedRevision,requestId,reviewed,roadmap,releases}) => transact(expectedRevision,requestId,{operation:"roadmap",reviewed,roadmap,releases},async(tx,product)=>{
      const next = releases??product.releases;
      if (new Set(next.map(r=>r.id)).size!==next.length || new Set(next.map(r=>r.name.toLowerCase())).size!==next.length) throw new RequestError("Release IDs and names must be unique.");
      const assigned = await tx.select({assignment:cards.roadmapAssignment}).from(cards).where(productScope);
      if (assigned.some(({assignment})=>assignment&&!assignmentIsValid(assignment,next))) throw new RequestError("Reassign cards before removing their release, phase or milestone.");
      await tx.update(products).set({roadmap,releases:next}).where(eq(products.id,product.id));
      await tx.insert(activity).values({productId:product.id,actor,action:"Saved roadmap version",before:{roadmap:product.roadmap,releases:product.releases},after:{roadmap,releases:next}});
      return {roadmap,releases:next};
    })) as NonNullable<McpWriters["roadmap"]>} : {}),
  };

  return handleMcpRequest(request, {
    async getProduct() {
      const [product]=await db.select().from(products).where(owned);
      if (!product) return {error:"Product not found."};
      const qualityPolicy = await db.transaction(tx=>readQualityPolicy(tx,access.productId));
      return {id:product.id,name:product.name,roadmap:product.roadmap,releases:product.releases,repository:product.repository,
        revision:product.revision,workflowVersion,permissions:{read:true,write:access.canWrite,roadmap:!!access.canPlan},
        qualityPolicy,
        connection:{identity:actor,tokenId:access.tokenId,label:access.label},
        members:[{userId:product.owner,role:"owner"},...await db.select({userId:productMembers.userId,role:productMembers.role}).from(productMembers).where(eq(productMembers.productId,product.id))],
        policy:qualityPolicy.workType === "tasks" ? "Human task cards use title, description (notes), responsible (assignee), status, and execution.attachmentSummary. Mark Done when the human reports completion; do not invent passing test results. Dependencies must still be complete. Bug cards retain software checks." : "Incomplete cards can remain at intake. Advancing requires acceptance criteria and a test plan; structured briefs/reports have additional requirements. Closing requires passing evidence. Prerequisites must be verified. No automatic overrides."};
    },
    async listCards({board,status,offset,limit}) {
      const items=await db.select({id:cards.id,title:cards.title,board:cards.kind,status:cards.status,priority:cards.priority,severity:cards.severity})
        .from(cards).where(and(productScope,board?eq(cards.kind,board):undefined,status?eq(cards.status,status):undefined))
        .orderBy(asc(cards.position),asc(cards.id)).offset(offset).limit(limit+1);
      return {cards:items.slice(0,limit),nextOffset:items.length>limit?offset+limit:null};
    },
    async getCard(cardId) {
      return db.transaction(async tx=>{
        const [product]=await tx.select({revision:products.revision,repository:products.repository}).from(products).where(owned).for("share");
        if (!product) return null;
        const [card]=await tx.select().from(cards).where(and(productScope,eq(cards.id,cardId))).limit(1);
        if (!card) return null;
        const policy=await readQualityPolicy(tx,access.productId);
        const handoff=(await latestEvent(tx,access.productId,"Agent handoff",cardId))?.after??null;
        const claim=(await latestEvent(tx,access.productId,"Agent claim",cardId))?.after??null;
        const attachments=await tx.select({id:activity.id,metadata:sql`${activity.after} - 'data'`}).from(activity).where(and(eq(activity.productId,access.productId),eq(activity.action,"Stored attachment"),sql`${activity.after}->>'cardId' = ${cardId}`));
        return {...card,attachments,handoff,claim,board:card.kind,acceptanceCriteria:card.criteria,repository:product.repository,revision:product.revision,
          readiness:{toStart:qualityIssues(card,card.kind==="bug"?"Ready to Fix":"Ready",policy),toComplete:qualityIssues(card,card.kind==="bug"?"Closed":"Done",policy)}};
      });
    },
  },access.canWrite?writers:undefined);
}
