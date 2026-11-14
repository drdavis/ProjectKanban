import { createMcpAuth } from "@neon/oauth/mcp";
import { honoMcp, type McpAuthVariables } from "@neon/oauth/mcp/hono";
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { database } from "../../../../lib/db";
import { products } from "../../../../lib/schema";
import { handleBoardMcp } from "../../../../lib/mcp-board";
import { mcpOAuthResource, mcpOAuthProduct } from "../../../../lib/mcp-oauth";
import { isMcpOriginAllowed } from "../../../../lib/mcp-token";

function handler(request: Request) {
  if (!isMcpOriginAllowed(request)) return new Response(null, {status: 403});
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl || !mcpOAuthResource || !mcpOAuthProduct) return new Response(null, {status: 503});
  const app = new Hono<McpAuthVariables>();
  const path = "/api/mcp/magic-diagram";
  app.use(honoMcp(createMcpAuth({baseUrl, resource: mcpOAuthResource}), {path}));
  app.post(path, async (context) => {
    const owner = context.get("auth").sub;
    if (!owner) return new Response(null, {status: 401});
    const [product] = await database().select({id: products.id}).from(products)
      .where(and(eq(products.owner, owner), eq(products.name, mcpOAuthProduct!))).limit(1);
    if (!product) return new Response(null, {status: 403});
    return handleBoardMcp(request, {productId: product.id, owner, canWrite: true}, async () => {});
  });
  app.get(path, () => new Response(null, {status: 405, headers:{Allow:"POST"}}));
  return app.fetch(request);
}

export {handler as GET, handler as POST};
