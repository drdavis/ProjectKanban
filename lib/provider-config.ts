import { z } from "zod";

export const aiProvider = z.enum(["openrouter", "openai", "anthropic", "vercel"]);
export type AiProvider = z.infer<typeof aiProvider>;
export const providerLabels: Record<AiProvider, string> = {
  vercel: "Vercel AI Gateway", openrouter: "OpenRouter", openai: "OpenAI", anthropic: "Anthropic (Claude)",
};
export const defaultModels: Record<AiProvider, string> = {
  vercel: "openai/gpt-4.1-mini", openrouter: "openai/gpt-4.1-mini", openai: "gpt-4.1-mini", anthropic: "claude-sonnet-4-5",
};

export const providerCommand = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"), provider: aiProvider,
    model: z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/),
    apiKey: z.string().trim().min(12).max(512).regex(/^[!-~]+$/).optional(),
  }),
  z.object({action: z.literal("test")}),
  z.object({action: z.literal("remove")}),
]);

export type PublicProviderConnection = {
  provider: AiProvider;
  model: string;
  source: "personal" | "environment";
  selectionId: string;
};
