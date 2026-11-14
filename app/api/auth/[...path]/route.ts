import type { NextRequest } from "next/server";

import { neonAuth } from "../../../../lib/auth";

type Context = {params: Promise<{path: string[]}>};
export function GET(request: NextRequest, context: Context) {
  return neonAuth()?.handler().GET(request, context) ?? new Response("Neon Auth is not configured.", {status: 503});
}
export function POST(request: NextRequest, context: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response("Invalid origin.", {status: 403});
  return neonAuth()?.handler().POST(request, context) ?? new Response("Neon Auth is not configured.", {status: 503});
}
