import { RequestError } from "../../../lib/card-write";
import { and, eq, gt } from "drizzle-orm";
import { database } from "../../../lib/db";
import { handleBoardMcp } from "../../../lib/mcp-board";
import { digestToken, isMcpOriginAllowed, requestMcpToken } from "../../../lib/mcp-token";
import { products, mcpTokens } from "../../../lib/schema";

export const runtime = "nodejs";
const headers = {"Cache-Control": "no-store"};

export async function POST(request: Request) {
  if (!isMcpOriginAllowed(request)) return Response.json({error: "Origin not allowed."}, {status: 403, headers});
  const token = requestMcpToken(request);
  const unauthorized = () => Response.json({error: "A valid product token is required."}, {
    status: 401, headers: {...headers, "WWW-Authenticate": "Bearer"},
  });
  if (!token) return unauthorized();
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return Response.json({error: "Expected application/json."}, {status: 415, headers});
  }

  try {
    const db = database();
    const digest = digestToken(token);
    const [access] = await db.select({productId: mcpTokens.productId, canWrite: mcpTokens.canWrite, owner: products.owner}).from(mcpTokens)
      .innerJoin(products, and(eq(products.id, mcpTokens.productId), eq(products.owner, mcpTokens.createdBy)))
      .where(and(eq(mcpTokens.digest, digest), gt(mcpTokens.expiresAt, new Date()))).limit(1);
    if (!access) return unauthorized();

    return await handleBoardMcp(request, access, async (tx, productId) => {
          const [authorized] = await tx.select({id: mcpTokens.id}).from(mcpTokens)
            .where(and(eq(mcpTokens.productId, productId), eq(mcpTokens.createdBy, access.owner),
              eq(mcpTokens.digest, digest), eq(mcpTokens.canWrite, true), gt(mcpTokens.expiresAt, new Date())));
          if (!authorized) throw new RequestError("A valid write token is required.");
    });
  } catch {
    return Response.json({error: "MCP request failed."}, {status: 500, headers});
  }
}

export function GET() {
  return new Response(null, {status: 405, headers: {...headers, Allow: "POST"}});
}
