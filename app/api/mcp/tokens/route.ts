import { auth } from "../../../../lib/auth";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { database } from "../../../../lib/db";
import { createMcpToken, isMcpOriginAllowed } from "../../../../lib/mcp-token";
import { products, mcpTokens } from "../../../../lib/schema";

export const runtime = "nodejs";
const productId = z.uuid();
const operations = z.discriminatedUnion("action", [
  z.object({action: z.literal("issue"), productId, label: z.string().trim().min(1).max(80), canWrite: z.boolean().default(false), canPlan: z.boolean().default(false)}),
  z.object({action: z.literal("revoke"), productId, tokenId: z.uuid()}),
]);
const metadata = {
  id: mcpTokens.id, canWrite: mcpTokens.canWrite, canPlan: mcpTokens.canPlan, label: mcpTokens.label, createdAt: mcpTokens.createdAt, expiresAt: mcpTokens.expiresAt,
};

function json(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  try {
    const {userId} = await auth();
    if (!userId) return json({error: "Sign in to continue."}, 401);
    const input = productId.safeParse(new URL(request.url).searchParams.get("product"));
    if (!input.success) return json({error: "Choose a product."}, 400);
    const db = database();
    const [product] = await db.select({id: products.id}).from(products)
      .where(and(eq(products.id, input.data), eq(products.owner, userId))).limit(1);
    if (!product) return json({error: "Product not found."}, 404);
    return json(await db.select(metadata).from(mcpTokens)
      .where(and(eq(mcpTokens.productId, product.id), eq(mcpTokens.createdBy, userId)))
      .orderBy(desc(mcpTokens.createdAt)).limit(100));
  } catch {
    return json({error: "Could not list product tokens."}, 500);
  }
}

export async function POST(request: Request) {
  try {
    const {userId} = await auth();
    if (!userId) return json({error: "Sign in to continue."}, 401);
    if (!isMcpOriginAllowed(request)) return json({error: "Origin not allowed."}, 403);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return json({error: "Expected application/json."}, 415);
    }
    const parsed = operations.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({error: "Invalid token request."}, 400);

    const input = parsed.data;
    return await database().transaction(async (tx) => {
      const [product] = await tx.select({id: products.id}).from(products)
        .where(and(eq(products.id, input.productId), eq(products.owner, userId))).for("update");
      if (!product) return json({error: "Product not found."}, 404);
      const scope = and(eq(mcpTokens.productId, product.id), eq(mcpTokens.createdBy, userId));
      if (input.action === "revoke") {
        const [revoked] = await tx.delete(mcpTokens).where(and(scope, eq(mcpTokens.id, input.tokenId))).returning({id: mcpTokens.id});
        return revoked ? json({ok: true}) : json({error: "Token not found."}, 404);
      }
      const existing = await tx.select({id: mcpTokens.id}).from(mcpTokens).where(scope).limit(100);
      if (existing.length >= 100) return json({error: "Revoke an old token before creating another."}, 409);
      const {token, digest} = createMcpToken();
      const [issued] = await tx.insert(mcpTokens).values({
        productId: product.id, createdBy: userId, label: input.label, canWrite: input.canWrite, canPlan: input.canWrite && input.canPlan, digest,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).returning(metadata);
      return json({...issued, token}, 201);
    });
  } catch {
    return json({error: "Could not manage product tokens."}, 500);
  }
}
