import { auth } from "../../../lib/auth";
import { and, asc, eq, or } from "drizzle-orm";
import { database } from "../../../lib/db";
import { cards, productMembers, products } from "../../../lib/schema";

export async function GET() {
  const {userId} = await auth();
  if (!userId) return Response.json({error: "Sign in to continue."}, {status: 401});
  const result = await database().select({
    productId: products.id, productName: products.name, cardId: cards.id,
    title: cards.title, status: cards.status, execution: cards.execution,
  }).from(products).innerJoin(cards, eq(cards.productId, products.id))
    .leftJoin(productMembers, and(eq(productMembers.productId, products.id), eq(productMembers.userId, userId)))
    .where(or(eq(products.owner, userId), eq(productMembers.userId, userId)))
    .orderBy(asc(products.name), asc(cards.position), asc(cards.id)).limit(501);
  const visible = result.slice(0, 500);
  const closed = new Set(visible.filter(({status}) => ["Done", "Closed"].includes(status)).map(({cardId}) => cardId));
  const visibleIds = new Set(visible.map(({cardId}) => cardId));
  return Response.json({items: visible.map(({execution, ...item}) => ({
    ...item,dueDate:execution?.work?.dueDate??null,cycle:execution?.work?.cycle??"",outcome:execution?.work?.outcome??"",impact:execution?.work?.impact??0,effort:execution?.work?.effort??0,source:execution?.work?.source??"", blocked: execution?.blockers.some((id) => visibleIds.has(id) && !closed.has(id)) ?? false,
  })), truncated: result.length > 500});
}
