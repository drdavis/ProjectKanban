import { validInvitation } from "../../../../lib/invitations";
import type { NextRequest } from "next/server";

import { neonAuth } from "../../../../lib/auth";
import { blockedAuthPath } from "../../../../lib/access-policy";

type Context = {params: Promise<{path: string[]}>};
export function GET(request: NextRequest, context: Context) {
  return neonAuth()?.handler().GET(request, context) ?? new Response("Neon Auth is not configured.", {status: 503});
}
export async function POST(request: NextRequest, context: Context) {
  const path=(await context.params).path;
  if (blockedAuthPath(path)) {
    const raw=await request.clone().text();
    if(raw.length>16000)return new Response("Request too large.",{status:413});
    let body;try{body=JSON.parse(raw);}catch{return new Response("Invalid request.",{status:400});}
    const allowed=path.join("/") === "sign-up/email" && typeof body?.email === "string" && await validInvitation(request.headers.get("X-Invitation-Token")??"",body.email);
    if(!allowed)return Response.json({code:"INVITATION_INVALID",message:"This invitation is invalid, expired, revoked, or belongs to another email address."},{status:403});
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response("Invalid origin.", {status: 403});
  return neonAuth()?.handler().POST(request, context) ?? new Response("Neon Auth is not configured.", {status: 503});
}
