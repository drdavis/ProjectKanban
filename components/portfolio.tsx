"use client";

import { useEffect, useState } from "react";

type Entry = {productId:string; productName:string; cardId:string; title:string; status:string; blocked:boolean;releaseRisk:boolean;createdAt:string|null;intake:{decision:string;deferUntil?:string}|null;client:string;agency:string;dueDate?:string|null;cycle?:string;outcome?:string;impact:number;effort:number;source?:string};

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
  const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
  const entries = data?.items.filter((item) => view === "Aging" ? !!item.createdAt&&Date.parse(item.createdAt)<Date.now()-14*86400000&&!["Done","Closed"].includes(item.status) : view === "Release risk" ? item.releaseRisk : view === "Needs decision" ? ["Backlog","Reported","Triage"].includes(item.status)&&(!item.intake||item.intake.decision==="request-details"||(item.intake.decision==="defer"&&!!item.intake.deferUntil&&item.intake.deferUntil<=today)) : view === "Blocked" ? item.blocked : view === "Overdue" ? item.dueDate&&item.dueDate<today&&!["Done","Closed"].includes(item.status) : view === "Suggested next" ? !item.blocked&&["Backlog","Ready","Ready to Fix"].includes(item.status) : statuses.includes(item.status)).sort((a,b)=>view === "Suggested next" ? (b.impact/Math.max(1,b.effort))-(a.impact/Math.max(1,a.effort)):0);
  return <section className="history">
    <label>View<select value={view} onChange={(event) => setView(event.target.value)}><option>Ready</option><option>Active</option><option>Review</option><option>Blocked</option><option>Overdue</option><option>Suggested next</option><option>Aging</option><option>Release risk</option><option>Needs decision</option></select></label>
    {view === "Suggested next" && <p>Unblocked work ordered by recorded impact ÷ effort. Zero means unestimated; these are editable planning estimates, not measured value.</p>}
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading portfolio…</p> : <>
      {data.truncated && <p>Showing the first 500 matching cards.</p>}
      {!entries?.length && <p>No cards in this view.</p>}
      {view==="Release risk"&&<p>Release-linked work with unresolved dependencies, serious open bugs, or missing completion evidence.</p>}
      {entries?.map((item) => <article key={item.cardId}><strong>{item.title}</strong><p>{item.client}{item.agency&&" · "+item.agency}</p><p>{item.status}{item.dueDate&&" · Due "+item.dueDate}{item.cycle&&" · "+item.cycle}</p>{item.outcome&&<p>Outcome: {item.outcome}</p>}{view === "Suggested next"&&<p>Impact {item.impact} · Effort {item.effort}{item.source&&<> · <a href={item.source} target="_blank" rel="noreferrer">Source</a></>}</p>}
        <button onClick={() => open(item.productId)}>{item.productName} →</button></article>)}
    </>}
  </section>;
}
