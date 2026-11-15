"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { agentWorkflow, workflowVersion } from "../lib/agent-workflow";

type TokenMetadata = { id: string; label: string; canWrite: boolean; canPlan?: boolean; expiresAt: string };
type IssuedToken = TokenMetadata & { token: string };

async function tokenRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {cache: "no-store", ...init});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not manage product tokens.");
  return result;
}

export function McpAccess({productId, productName}: {productId: string; productName: string}) {
  const [tokens, setTokens] = useState<TokenMetadata[]>();
  const [issued, setIssued] = useState<IssuedToken>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(true);
  const [serverUrl, setServerUrl] = useState("");
  const [copied, setCopied] = useState("");
  const endpoint = "/api/mcp/tokens?product=" + encodeURIComponent(productId);

  useEffect(() => { setServerUrl(window.location.origin + "/api/mcp"); }, []);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label + " copied.");
    } catch { setCopied("Clipboard unavailable. Select the field and copy it manually."); }
  }

  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    tokenRequest<TokenMetadata[]>(endpoint, {signal: controller.signal}).then(setTokens).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [endpoint, opened]);

  async function submit(action: {action: "issue"; label: string; canWrite: boolean; canPlan: boolean} | {action: "revoke"; tokenId: string}) {
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
    if (await submit({action: "issue", label: String(new FormData(form).get("label")), canWrite: new FormData(form).has("canWrite"), canPlan: new FormData(form).has("canPlan")})) form.reset();
  }

  return <details open onToggle={(event) => setOpened(event.currentTarget.open)}>
    <summary>Connect a coding tool to {productName}</summary>
    {opened && <div className="history">
      <p>Use a product token with the setup below. No terminal commands or OAuth login are needed for this method.</p>
      <h3>1. Copy the server URL</h3>
      <p>Open this panel on your permanent production domain, not a temporary deployment or local preview.</p>
      <label>Server URL<input readOnly value={serverUrl} onFocus={(event) => event.currentTarget.select()}/></label>
      <Button variant="outline" disabled={!serverUrl} onClick={() => void copy(serverUrl, "Server URL")}>Copy server URL</Button>
      <p><strong>The URL must end with /api/mcp.</strong> Do not append a product name or use /api/mcp/magic-diagram with a product token. The token selects {productName}.</p>
      <h3>2. Create a token for this product</h3>
      <p>Tokens expire after 30 days. Select write access if your coding tool should add and move cards. Leave it unchecked for read-only access.</p>
      <form onSubmit={issue}>
        <label>Token label<input name="label" required maxLength={80} placeholder="e.g. Codex on my laptop"/></label>
        <label className="checkbox"><input type="checkbox" name="canWrite"/> Allow this token to create, edit and move cards</label>
        <label className="checkbox"><input type="checkbox" name="canPlan"/> Also allow reviewed roadmap and release updates (requires card write access)</label>
        <Button type="submit" disabled={busy || !tokens}>Create token</Button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {issued && <div className="proposal">
        <label>Copy this token now. It is shown once.
          <input readOnly value={issued.token} onFocus={(event) => event.currentTarget.select()}/>
        </label>
        <Button variant="outline" onClick={() => void copy(issued.token, "Token")}>Copy token only</Button>
        <label>Authorization header value<input readOnly value={"Bearer " + issued.token} onFocus={(event) => event.currentTarget.select()}/></label>
        <Button variant="outline" onClick={() => void copy("Bearer " + issued.token, "Authorization header value")}>Copy header value</Button>
        <p>Save this in your coding tool before hiding it. Do not paste it into chat or commit it to GitHub.</p>
        <Button variant="ghost" onClick={() => setIssued(undefined)}>Hide token</Button>
      </div>}
      <h3>3. Add or edit the connection in your coding tool</h3>
      <p>In Codex, open Settings → MCP servers and add or edit an HTTP server. Use a distinct name for each product.</p>
      <ul>
        <li><strong>Name:</strong> a recognizable name for {productName}.</li>
        <li><strong>Transport:</strong> HTTP / Streamable HTTP.</li>
        <li><strong>URL:</strong> paste the server URL from step 1 with no spaces or tabs.</li>
        <li><strong>Header name:</strong> <code>Authorization</code>.</li>
        <li><strong>Header value:</strong> <code>Bearer YOUR_TOKEN</code> — use Copy header value above.</li>
      </ul>
      <p>If your client has a dedicated bearer-token field instead of custom headers, paste the token only. Use one method, not both. A field named “Bearer token environment variable” expects a variable name, not the token; use the custom Authorization header for this desktop setup.</p>
      <h3>4. Verify in a new session</h3>
      <p>Save, reconnect the server, and start a new coding session. Ask: “Use the {productName} MCP connection to list development cards, then read one card’s details. Do not change any cards.”</p>
      <p>Success means actual card results from <code>list_cards</code> and <code>get_card</code>. Write tokens also expose <code>create_card</code>, <code>update_card</code> and <code>move_card</code>. Roadmap permission adds <code>update_roadmap</code>. Opening the server URL in a browser is not a connection test.</p>
      <details><summary>5. Add agent workflow guidance · v{workflowVersion}</summary>
        <p>Optional: make your agent use this board for planning, execution, bug triage and verification. Connecting MCP alone does not install guidance or start background work.</p>
        <ol><li>Copy the workflow below.</li><li>Merge it into your project's AGENTS.md (Codex), CLAUDE.md (Claude Code), or the project-instructions field in your coding tool. Preserve existing instructions.</li><li>In a new session, ask the agent to call get_product and get_workflow, confirm {productName}, and explain its next action before editing.</li></ol>
        <p>For GSD or another planning framework, keep its planning process and use ProjectKanban for the shared work records. Ask the agent to update the matching card at each stage and report failed synchronization.</p>
        <Button variant="outline" onClick={() => void copy(agentWorkflow, "Agent workflow")}>Copy workflow instructions</Button>
        <p className="muted">No credentials are included. Copying does not install the instructions. The connected agent can read the current version through get_workflow.</p>
        <details><summary>Read the workflow</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{agentWorkflow}</pre></details>
      </details>
      <details><summary>Connection troubleshooting</summary><ul>
        <li><strong>Tools not available:</strong> check the server is enabled, inspect its connection error, and start a new session after saving. This message alone does not mean the server is down.</li>
        <li><strong>401:</strong> check the URL ends with /api/mcp, the header is Authorization, and Bearer appears exactly once. Check token expiry and revocation here.</li>
        <li><strong>Wrong product:</strong> create a token from that product’s MCP access panel; changing the connection name does not change its scope.</li>
        <li><strong>No write tools:</strong> create a token with write access and replace the saved credential.</li>
        <li><strong>Move rejected:</strong> read the card’s planning, dependency, and testing requirements. Do not bypass them.</li>
        <li><strong>503 or Vercel login page:</strong> ask the deployment administrator to check configuration or deployment protection. Do not repeatedly generate tokens.</li>
      </ul></details>
      <p role="status">{copied}</p>
      <h3>Manage existing tokens</h3>
      {tokens && tokens.length > 0 && <ul>{tokens.map((token) => <li className="proposal" key={token.id}>
        <strong>{token.label} · {token.canWrite ? "Card read and write" : "Read only"}{token.canPlan ? " + roadmap" : ""}</strong>
        <p>{new Date(token.expiresAt).getTime() <= Date.now() ? "Expired" : "Expires " + new Date(token.expiresAt).toLocaleDateString()}</p>
        <Button variant="outline" disabled={busy} onClick={() => void submit({action: "revoke", tokenId: token.id})}>Revoke token</Button>
      </li>)}</ul>}
    </div>}
  </details>;
}
