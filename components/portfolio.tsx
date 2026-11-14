"use client";

import { useEffect, useState } from "react";

type Entry = {productId:string; productName:string; cardId:string; title:string; status:string; blocked:boolean};

export function Portfolio({open}: {open: (productId: string) => void}) {
  const [data, setData] = useState<{items: Entry[]; truncated: boolean}>();
  const [error, setError] = useState("");
  const [view, setView] = useState("Ready");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portfolio", {signal: controller.signal, cache: "no-store"})
      .then((response) => {if (!response.ok) throw new Error(); return response.json();})
      .then(setData, () => {if (!controller.signal.aborted) setError("Could not load the portfolio.");});
    return () => controller.abort();
  }, []);
  const statuses = view === "Ready" ? ["Ready", "Ready to Fix"] : view === "Active" ? ["In Progress", "Fixing"] : ["Review", "Verify"];
  const entries = data?.items.filter((item) => view === "Blocked" ? item.blocked : statuses.includes(item.status));
  return <section className="history">
    <label>View<select value={view} onChange={(event) => setView(event.target.value)}><option>Ready</option><option>Active</option><option>Review</option><option>Blocked</option></select></label>
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading portfolio…</p> : <>
      {data.truncated && <p>Showing the first 500 matching cards.</p>}
      {!entries?.length && <p>No cards in this view.</p>}
      {entries?.map((item) => <article key={item.cardId}><strong>{item.title}</strong><p>{item.status}</p>
        <button onClick={() => open(item.productId)}>{item.productName} →</button></article>)}
    </>}
  </section>;
}
