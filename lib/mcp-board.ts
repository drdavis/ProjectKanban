import { RequestError, saveCard } from "./card-write";
import type { z } from "zod";
import type { cardFields } from "./workflow";
import { and, asc, eq } from "drizzle-orm";
import { database } from "./db";
import { handleMcpRequest } from "./mcp-protocol";
import { cards, products } from "./schema";

type Transaction = Parameters<Parameters<ReturnType<typeof database>["transaction"]>[0]>[0];

export async function handleBoardMcp(request: Request, access: {productId: string; owner: string; canWrite: boolean},
  verifyWrite: (tx: Transaction, productId: string) => Promise<void>) {
  const db = database();
    const productScope = eq(cards.productId, access.productId);
    async function write(input: z.input<typeof cardFields> | {cardId: string; status: string}) {
      try {
        return await db.transaction(async (tx) => {
          const [product] = await tx.select({id: products.id, revision: products.revision}).from(products)
            .where(and(eq(products.id, access.productId), eq(products.owner, access.owner))).for("update");
          if (!product) throw new RequestError("Product not found.");
          await verifyWrite(tx, product.id);
          let saved;
          if ("cardId" in input) {
            const [card] = await tx.select().from(cards).where(and(productScope, eq(cards.id, input.cardId)));
            if (!card) throw new RequestError("Card not found.");
            if (card.status === input.status) return {id: card.id, title: card.title, status: card.status};
            saved = await saveCard(tx, product.id, "MCP · " + access.owner,
              {...card, execution: card.execution ?? undefined, status: input.status} as z.input<typeof cardFields>, card.id);
          } else {
            saved = await saveCard(tx, product.id, "MCP · " + access.owner, input);
          }
          await tx.update(products).set({revision: product.revision + 1}).where(eq(products.id, product.id));
          return {id: saved.id, title: saved.title, status: saved.status};
        });
      } catch (error) {
        if (error instanceof RequestError) return {error: error.message};
        throw error;
      }
    }

    return await handleMcpRequest(request, {
      async listCards({board, status, offset, limit}) {
        const items = await db.select({
          id: cards.id, title: cards.title, board: cards.kind, status: cards.status, priority: cards.priority, severity: cards.severity,
        }).from(cards).where(and(productScope, board ? eq(cards.kind, board) : undefined, status ? eq(cards.status, status) : undefined))
          .orderBy(asc(cards.position), asc(cards.id)).offset(offset).limit(limit + 1);
        return {cards: items.slice(0, limit), nextOffset: items.length > limit ? offset + limit : null};
      },
      async getCard(cardId) {
        const [card] = await db.select({
          id: cards.id, title: cards.title, board: cards.kind, status: cards.status, priority: cards.priority,
          severity: cards.severity, description: cards.description, acceptanceCriteria: cards.criteria,
          execution: cards.execution, link: cards.link, repository: products.repository,
        }).from(cards).innerJoin(products, eq(products.id, cards.productId)).where(and(productScope, eq(cards.id, cardId))).limit(1);
        return card;
      },
    }, access.canWrite ? {
      create: ({board, title, description, acceptanceCriteria}) =>
        write({kind: board, status: board === "bug" ? "Reported" : "Backlog", title, description, criteria: acceptanceCriteria}),
      move: write,
    } : undefined);
}
