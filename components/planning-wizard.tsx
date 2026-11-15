"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { fetchPlannerConnection } from "./provider-settings";
import { providerLabels, type PublicProviderConnection } from "../lib/provider-config";
import { publishedPlan, type PublishedPlan, type PlannedCard } from "../lib/planning";
import { Button } from "./ui/button";

const stages = [
  ["Define the outcome", "Describe the users, problem, and result that would make the work worthwhile."],
  ["Set the scope", "Identify the milestones to deliver and decisions that still need an answer."],
  ["Draft cards", "Describe an observable outcome for each card and how someone can verify it."],
  ["Review and publish", "Confirm the roadmap update and the development cards it will add."],
] as const;

const draftSchema = z.object({
  pending: z.object({plan: publishedPlan, revision: z.number().int().nonnegative()}).optional(),
  baseRoadmap: z.string(),
  step: z.number().int().min(0).max(3),
  mode: z.enum(["product", "release"]),
  name: z.string(),
  audience: z.string(),
  problem: z.string(),
  success: z.string(),
  milestones: z.string(),
  phases:z.string().default("Planning\nBuild\nVerify\nRelease"),
  constraints: z.string(),
  cards: z.array(z.object({title: z.string(), description: z.string(), criteria: z.string(),testPlan:z.string().default(""),phase:z.string().optional(),milestone:z.string().optional()})).max(20),
});
type Draft = z.output<typeof draftSchema>;

const emptyCard: PlannedCard = {title: "", description: "", criteria: "",testPlan:""};

function newDraft(roadmap: string): Draft {
  return {baseRoadmap: roadmap, step: 0, mode: "release", name: "", audience: "",
    problem: "", success: "", milestones: "", phases:"Planning\nBuild\nVerify\nRelease", constraints: "", cards: []};
}

function roadmapText(draft: Draft) {
  const entry = [
    "## " + draft.name.trim(),
    "Audience: " + draft.audience.trim(),
    "Problem: " + draft.problem.trim(),
    "Success: " + draft.success.trim(),
    "### Milestones\n" + draft.milestones.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => "- " + line).join("\n"),
    draft.constraints.trim() && "### Constraints and open decisions\n" + draft.constraints.trim(),
  ].filter(Boolean).join("\n\n");
  return draft.mode === "release" && draft.baseRoadmap.trim() ? draft.baseRoadmap.trimEnd() + "\n\n" + entry : entry;
}

export function PlanningWizard({ownerId, productId, productName, roadmap, revision, publish}: {
  ownerId: string;
  productId: string;
  productName: string;
  roadmap: string;
  revision: number;
  publish: (plan: PublishedPlan, revision: number) => Promise<void>;
}) {
  const storageKey = "projectkanban:planning:" + ownerId + ":" + productId;
  const [draft, setDraft] = useState(() => newDraft(roadmap));
  const [loadedKey, setLoadedKey] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const publishing = useRef(false);
  const [discarding, setDiscarding] = useState(false);
  const [published, setPublished] = useState(false);
  const [connection,setConnection]=useState<PublicProviderConnection|null>(null);
  useEffect(()=>{void fetchPlannerConnection().then(setConnection).catch(()=>setConnection(null));},[]);
  async function assist(){
    if(!connection)return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/planning-draft",{method:"POST",headers:{"Content-Type":"application/json","X-ProjectKanban-AI-Connection":connection.selectionId},body:JSON.stringify({productId,brief:JSON.stringify({name:draft.name,audience:draft.audience,problem:draft.problem,success:draft.success,milestones:draft.milestones,phases:draft.phases,constraints:draft.constraints})})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      const parsed=draftSchema.parse({...draft,...data,step:0,pending:undefined});update(parsed);
    }catch(e){setError(e instanceof Error?e.message:"Draft generation failed.");}finally{setBusy(false);}
  }

  useEffect(() => {
    if (loadedKey === storageKey) return;
    let initial = newDraft(roadmap);
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = draftSchema.safeParse(raw ? JSON.parse(raw) : null);
      if (saved.success) initial = saved.data;
    } catch {
      setStorageWarning(true);
    }
    setDraft(initial);
    setLoadedKey(storageKey);
  }, [storageKey, loadedKey, roadmap]);

  function update(changes: Partial<Draft>) {
    const changed = {...draft, ...changes};
    setDraft(changed);
    setError("");
    try {
      localStorage.setItem(storageKey, JSON.stringify(changed));
    } catch {
      setStorageWarning(true);
    }
  }

  function discard() {
    try { localStorage.removeItem(storageKey); } catch { setStorageWarning(true); }
    setDraft(newDraft(roadmap));
    setError("");
    setDiscarding(false);
    setPublished(false);
  }

  function next() {
    if (draft.step === 0 && [draft.name, draft.audience, draft.problem, draft.success].some((value) => !value.trim())) {
      setError("Enter a plan name, audience, problem, and success measure.");
      return;
    }
    if (draft.step === 1 && !draft.milestones.trim()) {
      setError("Enter at least one milestone.");
      return;
    }
    if (draft.step === 2) {
      const result = publishedPlan.shape.cards.safeParse(draft.cards);
      if (!result.success) {
        setError("Add at least one card with a title, outcome, and acceptance criteria.");
        return;
      }
    }
    update({step: draft.step + 1});
  }

  async function submit() {
    if (publishing.current) return;
    let pending = draft.pending;
    if (!pending) {
      if (draft.baseRoadmap !== roadmap) {
        setError("The roadmap has changed. Review the latest roadmap before publishing.");
        return;
      }
      const result = publishedPlan.safeParse({requestId: crypto.randomUUID(), roadmap: roadmapText(draft), cards: draft.cards, ...(draft.mode === "release" ? {release:{name:draft.name,phases:draft.phases.split("\n").map(s=>s.trim()).filter(Boolean),milestones:draft.milestones.split("\n").map(s=>s.trim()).filter(Boolean)}} : {})});
      if (!result.success) {
        setError("Check that all cards are complete and the resulting roadmap fits within 12,000 characters.");
        return;
      }
      pending = {plan: result.data, revision};
      update({pending});
    }
    publishing.current = true;
    setBusy(true);
    try {
      await publish(pending.plan, pending.revision);
      setPublished(true);
      try { localStorage.removeItem(storageKey); } catch { setStorageWarning(true); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The plan could not be published.");
    } finally {
      publishing.current = false;
      setBusy(false);
    }
  }

  if (loadedKey !== storageKey) return <p>Loading draft…</p>;
  if (published) return <p role="status">Roadmap and development cards published for {productName}.</p>;

  const {step, mode, cards} = draft;
  return <section aria-label="Guided planning for this product">
    <p className="muted">Step {step + 1} of {stages.length} · {productName}</p>
    <h3>{stages[step][0]}</h3>
    <p>{stages[step][1]}</p>
    <p className="muted">{storageWarning ? "Browser storage unavailable. Keep this panel open to retain your draft." : "Drafts are saved in this browser until published or discarded."}</p>
    {connection && !draft.pending && <details><summary>AI draft assistance</summary><p>Destination: {providerLabels[connection.provider]} · {connection.model}. Sends the outcome, scope and milestones below. Replaces the editable draft; nothing is published until you review it.</p><Button disabled={busy || !draft.problem.trim()} onClick={()=>void assist()}>{busy?"Drafting…":"Send brief and suggest a plan"}</Button></details>}
    <form onSubmit={(event) => {event.preventDefault(); if (step < 3) next(); else void submit();}}>
      <fieldset disabled={busy} className="planning-inputs">
      {step === 0 && <>
        <label>Planning scope<select value={mode} onChange={(event) => update({mode: event.target.value === "product" ? "product" : "release"})}>
          <option value="release">Plan a release</option><option value="product">Plan the product</option>
        </select></label>
        <label>Plan name<input value={draft.name} maxLength={100} onChange={(event) => update({name: event.target.value})}/></label>
        <label>Who is this for?<textarea value={draft.audience} maxLength={1000} onChange={(event) => update({audience: event.target.value})}/></label>
        <label>What problem are we solving?<textarea value={draft.problem} maxLength={2000} onChange={(event) => update({problem: event.target.value})}/></label>
        <label>What will success look like?<textarea value={draft.success} maxLength={2000} onChange={(event) => update({success: event.target.value})}/></label>
      </>}
      {step === 1 && <>
        <label>Phases, one per line<textarea value={draft.phases} rows={4} maxLength={2000} onChange={event=>update({phases:event.target.value})}/></label>
        <label>Milestones, one per line<textarea value={draft.milestones} rows={5} maxLength={4000} onChange={(event) => update({milestones: event.target.value})}/></label>
        <label>Constraints and open decisions<textarea value={draft.constraints} rows={4} maxLength={2000} onChange={(event) => update({constraints: event.target.value})}/></label>
      </>}
      {step === 2 && <>
        {cards.map((card, index) => <fieldset key={index}>
          <legend>Card {index + 1}</legend>
          {(["title", "description", "criteria", "testPlan"] as const).map((field) => <label key={field}>
            {{title: "Title", description: "Outcome and scope", criteria: "Acceptance criteria",testPlan:"Test plan"}[field]}
            <textarea rows={field === "title" ? 1 : 3} maxLength={field === "title" ? 180 : 10000} value={card[field]} onChange={(event) => update({
              cards: cards.map((item, position) => position === index ? {...item, [field]: event.target.value} : item),
            })}/>
          </label>)}
          {mode === "release" && ([ ["phase",draft.phases], ["milestone",draft.milestones] ] as const).map(([field,lines])=><label key={field}>{field === "phase"?"Phase":"Milestone"}<select value={card[field]??""} onChange={event=>update({cards:cards.map((item,position)=>position===index?{...item,[field]:event.target.value||undefined}:item)})}><option value="">Unassigned</option>{lines.split("\n").map(s=>s.trim()).filter(Boolean).map(name=><option key={name}>{name}</option>)}</select></label>)}
          <Button variant="ghost" onClick={() => update({cards: cards.filter((_, position) => position !== index)})}>Remove card {index + 1}</Button>
        </fieldset>)}
        <Button disabled={cards.length >= 20} variant="outline" onClick={() => update({cards: [...cards, {...emptyCard}]})}>Add development card</Button>
      </>}
      {step === 3 && <>
        {!draft.pending && draft.baseRoadmap !== roadmap && <>
          <p role="status">The roadmap changed after this draft started.</p>
          <details><summary>Latest roadmap</summary><p style={{whiteSpace:"pre-wrap"}}>{roadmap || "Empty roadmap"}</p></details>
          <Button variant="outline" disabled={busy} onClick={() => update({baseRoadmap: roadmap})}>Use latest roadmap as the base</Button>
        </>}
        {draft.pending && <p role="status">This publish attempt is saved. Retry checks the same request so cards are added only once.</p>}
        <p>{mode === "release" ? "This adds the release to the current roadmap." : "This replaces the current roadmap text. Saved roadmap versions remain in history."} Publishing adds {cards.length} development {cards.length === 1 ? "card" : "cards"} to Backlog.</p>
        <details open><summary>Roadmap after publishing</summary><p style={{whiteSpace:"pre-wrap"}}>{roadmapText(draft)}</p></details>
        <ol>{cards.map((card, index) => <li key={index}>
          <strong>{card.title}</strong>
          <p style={{whiteSpace:"pre-wrap"}}>{card.description}</p>
          <p style={{whiteSpace:"pre-wrap"}}>{card.criteria}</p>
        </li>)}</ol>
      </>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        {step > 0 && <Button variant="outline" disabled={busy || Boolean(draft.pending)} onClick={() => update({step: step - 1})}>Back</Button>}
        <Button type="submit" disabled={busy || (step === 3 && !draft.pending && draft.baseRoadmap !== roadmap)}>
          {step < 3 ? "Continue" : busy ? "Publishing…" : draft.pending ? "Retry publish" : "Publish plan"}
        </Button>
        {discarding
          ? <><Button variant="outline" disabled={busy} onClick={discard}>Confirm discard</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setDiscarding(false)}>Keep draft</Button></>
          : <Button variant="ghost" disabled={busy} onClick={() => setDiscarding(true)}>Discard draft</Button>}
      </div>
      </fieldset>
    </form>
  </section>;
}
