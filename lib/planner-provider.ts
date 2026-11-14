import { createGateway } from "ai";
import { randomUUID } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { database } from "./db";
import { aiProvider, defaultModels, type AiProvider, type PublicProviderConnection, type providerCommand } from "./provider-config";
import { aiConnections } from "./provider-schema";
import { decryptApiKey, encryptApiKey, personalConnectionsAvailable } from "./provider-secrets";

export class ProviderConfigurationError extends Error {}

const environmentVariables: Record<AiProvider, { key: string; model: string }> = {
  vercel: {key: "AI_GATEWAY_API_KEY", model: "AI_GATEWAY_MODEL"},
  openrouter: {key: "OPENROUTER_API_KEY", model: "OPENROUTER_MODEL"},
  openai: {key: "OPENAI_API_KEY", model: "OPENAI_MODEL"},
  anthropic: {key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL"},
};

function environmentConnection() {
  const provider = aiProvider.safeParse(process.env.PLANNER_AI_PROVIDER || (process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY ? "vercel" : "openrouter"));
  if (!provider.success) throw new ProviderConfigurationError("Set PLANNER_AI_PROVIDER to vercel, openrouter, openai, or anthropic.");
  const variables = environmentVariables[provider.data];
  const apiKey = process.env[variables.key];
  if (!apiKey && !(provider.data === "vercel" && process.env.VERCEL_OIDC_TOKEN)) return null;
  const model = process.env[variables.model] || defaultModels[provider.data];
  return { provider: provider.data, model, source: "environment", selectionId: "env:" + provider.data + ":" + model, apiKey } as const;
}

async function storedConnection(userId: string) {
  const [connection] = await database().select().from(aiConnections).where(eq(aiConnections.userId, userId));
  return connection;
}

function connectionPurpose(userId: string, provider: AiProvider) {
  return JSON.stringify(["projectkanban-ai-credential", userId, provider]);
}

export async function describePlannerProvider(userId: string): Promise<PublicProviderConnection | null> {
  const connection = await storedConnection(userId);
  if (connection) return {
    provider: connection.provider, model: connection.model, source: "personal", selectionId: connection.revision,
  };
  const fallback = environmentConnection();
  if (!fallback) return null;
  const {provider, model, source, selectionId} = fallback;
  return {provider, model, source, selectionId};
}

export async function savePlannerProvider(userId: string, input: Extract<z.infer<typeof providerCommand>, {action: "save"}>) {
  if (!personalConnectionsAvailable()) {
    throw new ProviderConfigurationError("Enable personal connections by configuring AI_CREDENTIAL_ENCRYPTION_KEY on the server.");
  }
  const existing = await storedConnection(userId);
  const encryptedKey = input.apiKey
    ? encryptApiKey(input.apiKey, connectionPurpose(userId, input.provider))
    : existing?.provider === input.provider ? existing.encryptedKey : undefined;
  if (!encryptedKey) throw new ProviderConfigurationError("Enter an API key for the selected provider.");
  const update = {provider: input.provider, model: input.model, encryptedKey, revision: randomUUID(), updatedAt: new Date()};
  if (!input.apiKey) {
    const [saved] = await database().update(aiConnections).set(update)
      .where(and(eq(aiConnections.userId, userId), eq(aiConnections.revision, existing!.revision))).returning({userId: aiConnections.userId});
    if (!saved) throw new ProviderConfigurationError("The connection changed. Reload settings and try again.");
    return;
  }
  await database().insert(aiConnections).values({userId, ...update})
    .onConflictDoUpdate({target: aiConnections.userId, set: update});
}

export async function removePlannerProvider(userId: string) {
  await database().delete(aiConnections).where(eq(aiConnections.userId, userId));
}

export async function resolvePlannerProvider(userId: string, expectedSelection?: string) {
  const connection = await storedConnection(userId);
  const fallback = connection ? null : environmentConnection();
  const selectionId = connection?.revision ?? fallback?.selectionId;
  if (!selectionId) return null;
  if (expectedSelection !== undefined && expectedSelection !== selectionId) {
    throw new ProviderConfigurationError("The AI connection changed. Reload the planner and review the destination before generating.");
  }
  const provider = connection?.provider ?? fallback!.provider;
  const modelId = connection?.model ?? fallback!.model;
  const apiKey = connection
    ? decryptApiKey(connection.encryptedKey, connectionPurpose(userId, provider))
    : fallback!.apiKey;
  switch (provider) {
    case "vercel":
      return {provider, model: createGateway(apiKey ? {apiKey} : {})(modelId), providerOptions: undefined};
    case "openai":
      return {provider, model: createOpenAI({apiKey}).responses(modelId), providerOptions: {openai: {store: false}}};
    case "anthropic":
      return {provider, model: createAnthropic({apiKey})(modelId), providerOptions: undefined};
    case "openrouter":
      return {provider, model: createOpenRouter({apiKey})(modelId, {provider: {zdr: true, data_collection: "deny", require_parameters: true}}), providerOptions: undefined};
  }
}
