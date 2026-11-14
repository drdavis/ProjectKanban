import { createHash, randomBytes } from "node:crypto";

export function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createMcpToken() {
  const token = "pk_mcp_" + randomBytes(32).toString("base64url");
  return {token, digest: digestToken(token)};
}

export function requestMcpToken(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer (pk_mcp_[A-Za-z0-9_-]{43})$/i)?.[1];
}

export function isMcpOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
