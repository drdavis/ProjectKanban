import { mcpOAuthResource } from "../../../../../../lib/mcp-oauth";

export function GET() {
  const authority = process.env.NEON_AUTH_BASE_URL;
  if (!authority || !mcpOAuthResource) return new Response(null, {status: 503});
  return Response.json({resource: mcpOAuthResource, authorization_servers: [authority], bearer_methods_supported: ["header"]});
}
