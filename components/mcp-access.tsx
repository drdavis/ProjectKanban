"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "./ui/button";

type TokenMetadata = { id: string; label: string; canWrite: boolean; expiresAt: string };
type IssuedToken = TokenMetadata & { token: string };

async function tokenRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {cache: "no-store", ...init});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not manage product tokens.");
  return result;
}

export function McpAccess({productId}: {productId: string}) {
  const [tokens, setTokens] = useState<TokenMetadata[]>();
  const [issued, setIssued] = useState<IssuedToken>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(true);
  const endpoint = "/api/mcp/tokens?product=" + encodeURIComponent(productId);

  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    tokenRequest<TokenMetadata[]>(endpoint, {signal: controller.signal}).then(setTokens).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [endpoint, opened]);

  async function submit(action: {action: "issue"; label: string; canWrite: boolean} | {action: "revoke"; tokenId: string}) {
    setBusy(true);
    setError("");
    try {
      const result = await tokenRequest<IssuedToken | {ok: true}>(endpoint, {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({...action, productId}),
      });
      if ("token" in result) {
        setIssued(result);
        setTokens((current) => [result, ...(current ?? [])]);
      } else if (action.action === "revoke") {
        setTokens((current) => current?.filter(({id}) => id !== action.tokenId));
        setIssued((current) => current?.id === action.tokenId ? undefined : current);
      }
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not manage product tokens.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await submit({action: "issue", label: String(new FormData(form).get("label")), canWrite: new FormData(form).has("canWrite")})) form.reset();
  }

  return <details open onToggle={(event) => setOpened(event.currentTarget.open)}>
    <summary>Coding tool access</summary>
    {opened && <div className="history">
      <p>Give a coding tool access to this product’s cards for 30 days. Revoking the token ends access.</p>
      <p>MCP URL <code>{window.location.origin + "/api/mcp"}</code></p>
      <form onSubmit={issue}>
        <label>Token label<input name="label" required maxLength={80} placeholder="Coding tool name"/></label>
        <label className="checkbox"><input type="checkbox" name="canWrite"/> Allow this token to create and move cards</label>
        <Button type="submit" disabled={busy || !tokens}>Create token</Button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {issued && <div className="proposal">
        <label>Copy this token now. It is shown once.
          <input readOnly value={issued.token} onFocus={(event) => event.currentTarget.select()}/>
        </label>
        <p>Set the client’s Authorization header to Bearer followed by the token.</p>
        <Button variant="ghost" onClick={() => setIssued(undefined)}>Hide token</Button>
      </div>}
      {tokens && tokens.length > 0 && <ul>{tokens.map((token) => <li className="proposal" key={token.id}>
        <strong>{token.label} · {token.canWrite ? "Read and write" : "Read only"}</strong>
        <p>{new Date(token.expiresAt).getTime() <= Date.now() ? "Expired" : "Expires " + new Date(token.expiresAt).toLocaleDateString()}</p>
        <Button variant="outline" disabled={busy} onClick={() => void submit({action: "revoke", tokenId: token.id})}>Revoke token</Button>
      </li>)}</ul>}
    </div>}
  </details>;
}
