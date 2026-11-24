"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import type { MemberRole } from "../lib/member-fields";

type Member = {userId: string; role: MemberRole};

export function MemberPanel({productId}: {productId: string}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const endpoint = "/api/members?product=" + encodeURIComponent(productId);
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, {cache: "no-store", signal: controller.signal}).then(async (response) => {
      if (!response.ok) throw new Error("Could not load product access.");
      const data = await response.json();
      setMembers(data.members);
      setReady(true);
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => controller.abort();
  }, [endpoint]);

  async function update(userId: string, role: MemberRole | "remove") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({productId, userId, role}),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not update product access.");
      }
      setMembers((current) => {
        const other = current.filter((member) => member.userId !== userId);
        return role === "remove" ? other : [...other, {userId, role}].sort((a, b) => a.userId.localeCompare(b.userId));
      });
      setNotice(role === "remove" ? "Access removed." : "Access saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update product access.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="history">
    <h3>Product access</h3>
    <p>Access applies only to this product. Members do not gain access to your other boards. Use a separate account for each person; the owner account can see all boards it owns.</p>
    <p>Grant access to an existing account by Neon Auth user ID. A viewer can read this product. An editor can also edit cards and plan releases.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {busy && !ready && <p>Loading members…</p>}
    {ready && <form onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const role = data.get("role") === "editor" ? "editor" : "viewer";
      void update(String(data.get("userId")).trim(), role);
    }}>
      <label>Neon Auth user ID<input name="userId" maxLength={100} required/></label>
      <label>Role<select name="role"><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label>
      <Button type="submit" disabled={busy}>Save access</Button>
    </form>}
    {members.map((member) => <article key={member.userId}>
      <strong>{member.userId}</strong>
      <p>{member.role}</p>
      <Button variant="outline" disabled={busy} onClick={() => void update(member.userId, "remove")}>Remove access</Button>
    </article>)}
  </section>;
}
