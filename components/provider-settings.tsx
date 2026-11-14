"use client";

import { useEffect, useState, type FormEvent } from "react";
import { aiProvider, defaultModels, providerLabels, type AiProvider, type PublicProviderConnection } from "../lib/provider-config";
import { Button } from "./ui/button";

type ProviderStatus = {connection: PublicProviderConnection | null; personalConnectionsAvailable: boolean};

export async function fetchPlannerConnection(signal?: AbortSignal): Promise<PublicProviderConnection | null> {
  return (await providerRequest<ProviderStatus>(undefined, signal)).connection;
}

async function providerRequest<T>(command?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/ai-provider", command ? {
    method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(command),
  } : {cache: "no-store", signal});
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "AI settings are unavailable.");
  return data;
}

export function ProviderSettings() {
  const [available, setAvailable] = useState<ProviderStatus | null>(null);
  const [provider, setProvider] = useState<AiProvider>("openrouter");
  const [model, setModel] = useState(defaultModels.openrouter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function showStatus(status: ProviderStatus) {
    setAvailable(status);
    const current = status.connection?.provider ?? "openrouter";
    setProvider(current);
    setModel(status.connection?.model ?? defaultModels[current]);
  }
  useEffect(() => {
    const abort = new AbortController();
    void providerRequest<ProviderStatus>(undefined, abort.signal)
      .then(showStatus).catch(() => {if (!abort.signal.aborted) setError("AI settings are unavailable.");});
    return () => abort.abort();
  }, []);

  async function apply(command: Record<string, string>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      if (command.action === "test") {
        await providerRequest<{ok: boolean}>(command);
        setNote("Connection test passed.");
      } else {
        showStatus(await providerRequest<ProviderStatus>(command));
        setNote(command.action === "save" ? "Connection saved." : "Personal connection removed.");
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "AI settings are unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const key = String(new FormData(form).get("apiKey") ?? "").trim();
    const field = form.elements.namedItem("apiKey") as HTMLInputElement;
    field.value = "";
    void apply({action: "save", provider, model, ...(key ? {apiKey: key} : {})});
  }

  const connection = available?.connection;
  return <div className="history">
    <p>{connection
      ? `${providerLabels[connection.provider]} · ${connection.model} · ${connection.source === "personal" ? "Personal key" : "Server key"}`
      : available ? "No provider is configured." : error ? "" : "Loading provider settings…"}</p>
    {connection && <div className="actions">
      <Button disabled={busy} onClick={() => void apply({action: "test"})}>Test connection</Button>
      {connection.source === "personal" && <Button variant="outline" disabled={busy} onClick={() => void apply({action: "remove"})}>Remove personal key</Button>}
    </div>}
    {available?.personalConnectionsAvailable && <form onSubmit={submit}>
      <label>Provider<select disabled={busy} value={provider} onChange={(event) => {
        const choice = aiProvider.parse(event.currentTarget.value);
        setProvider(choice);
        setModel(defaultModels[choice]);
      }}>{aiProvider.options.map((choice) => <option key={choice} value={choice}>{providerLabels[choice]}</option>)}</select></label>
      <label>Model identifier<input disabled={busy} value={model} maxLength={160} onChange={(event) => setModel(event.currentTarget.value)} required/></label>
      <label>API key<input type="password" name="apiKey" autoComplete="off" minLength={12} maxLength={512} disabled={busy}
        required={connection?.source !== "personal" || connection.provider !== provider}/></label>
      {connection?.source === "personal" && connection.provider === provider && <p className="muted">Leave the key blank to keep the saved key.</p>}
      <Button type="submit" disabled={busy}>Save connection</Button>
    </form>}
    {available && !available.personalConnectionsAvailable && <p className="muted">Configure server-side credential encryption to save a personal API key.</p>}
    <p className="muted">A connection test sends a short test prompt. Planning sends the context you select to the active provider. Usage is billed to the key’s account.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {note && <p role="status">{note}</p>}
  </div>;
}
