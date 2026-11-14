import { auth } from "../../../lib/auth";
import { generateText, Output } from "ai";
import { z } from "zod";
import { providerCommand } from "../../../lib/provider-config";
import {
  describePlannerProvider, ProviderConfigurationError, removePlannerProvider,
  resolvePlannerProvider, savePlannerProvider,
} from "../../../lib/planner-provider";
import { personalConnectionsAvailable } from "../../../lib/provider-secrets";

function json(data: unknown, status = 200) {
  return Response.json(data, {status, headers: {"Cache-Control": "private, no-store"}});
}

async function status(userId: string) {
  return {
    connection: await describePlannerProvider(userId),
    personalConnectionsAvailable: personalConnectionsAvailable(),
  };
}

function failure(error: unknown) {
  return error instanceof ProviderConfigurationError
    ? json({error: error.message}, 409)
    : json({error: "AI settings are unavailable. Check the server configuration and migrations."}, 503);
}

export async function GET() {
  try {
    const {userId} = await auth();
    if (!userId) return json({error: "Sign in to continue."}, 401);
    return json(await status(userId));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const {userId} = await auth();
    if (!userId) return json({error: "Sign in to continue."}, 401);
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host")) return json({error: "Invalid origin."}, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({error: "Expected JSON."}, 415);
    const input = providerCommand.safeParse(await request.json().catch(() => null));
    if (!input.success) return json({error: "Check the provider, model identifier and API key."}, 400);
    if (input.data.action === "save") await savePlannerProvider(userId, input.data);
    if (input.data.action === "remove") await removePlannerProvider(userId);
    if (input.data.action === "test") {
      const provider = await resolvePlannerProvider(userId);
      if (!provider) return json({error: "Configure an AI provider first."}, 409);
      try {
        await generateText({
          model: provider.model,
          providerOptions: provider.providerOptions,
          prompt: "Return status: OK.",
          output: Output.object({schema: z.object({status: z.literal("OK")})}),
          maxOutputTokens: 128,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(15_000),
        });
      } catch {
        return json({error: "Connection test failed. Check the key, model access, and provider availability. OpenRouter requires zero-data-retention routing."}, 502);
      }
      return json({ok: true});
    }
    return json(await status(userId));
  } catch (error) { return failure(error); }
}
