import type { NextRequest } from "next/server";

import { neonAuth } from "../../../../lib/auth";
import { blockedAuthPath } from "../../../../lib/access-policy";

type Context = {params: Promise<{path: string[]}>};
export function GET(request: NextRequest, context: Context) {
  return neonAuth()?.handler().GET(request, context) ?? new Response("Neon Auth is not configured.", {status: 503});
}
export async function POST(request: NextRequest, context: Context) {
  if (blockedAuthPath((await context.params).path)) return new Response("Access is by invitation only.", {status: 403});
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response("Invalid origin.", {status: 403});
  return neonAuth()?.handler().POST(request, context) ?? new Response("Neon Auth is not configured.", {status: 503});
}
