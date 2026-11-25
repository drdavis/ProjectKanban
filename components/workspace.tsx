"use client";

import {TaskWorkspace} from "./task-workspace";
import {TaskBoardSettings} from "./task-board-settings";
import {defaultTaskBoard} from "../lib/task-board";
import {workFields} from "../lib/collaboration";
import {CardTemplate} from "./card-template";
import { ProductPlanning } from "./product-planning";
import { Integrations } from "./integrations";
import { MyWork } from "./my-work";
import { WorkDetails } from "./work-details";
import { TaskForm } from "./task-form";
import { CsvImport } from "./csv-import";
import { phaseTint } from "../lib/phase-colors";
import { defaultQualityPolicy, type QualityPolicy } from "../lib/quality-policy";
import { CardAttachments } from "./card-attachments";
import { CardBrief, structuredExecution } from "./card-brief";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bug, GitBranch, GripVertical, Layers3, ListFilter, Plus, RefreshCw, Sparkles } from "lucide-react";
import type { z } from "zod";
import type { activity, cards, products, proposals } from "../lib/schema";
import { type cardFields, type kind, type mutation, type planSchema, plannerContext, priority, severity, workflows } from "../lib/workflow";
import { sampleProducts } from "../lib/samples";
import { MemberPanel } from "./member-panel";
import { ReleaseForm, RoadmapComparison, RoadmapFields } from "./roadmap-fields";
import { Sheet } from "./ui/sheet";
import { McpAccess } from "./mcp-access";
import { PlanningWizard } from "./planning-wizard";
import { SavedViews } from "./saved-views";
import { Portfolio } from "./portfolio";
import { ReleaseReadiness } from "./release-readiness";
import { Button } from "./ui/button";
import { fetchPlannerConnection, ProviderSettings } from "./provider-settings";
import { providerLabels, type PublicProviderConnection } from "../lib/provider-config";

type Product = typeof products.$inferSelect & {archived?:boolean};
type Card = typeof cards.$inferSelect;
type Kind = z.infer<typeof kind>;
type Operation = z.infer<typeof planSchema>["operations"][number];
export type Snapshot = {
  product: Product;
  policy?: QualityPolicy;
  role?: "owner" | "editor" | "viewer";
  cards: Card[];
  proposals: Array<Omit<typeof proposals.$inferSelect, "operations"> & { operations: Operation[] }>;
  activity: Array<typeof activity.$inferSelect>;
  roadmapVersions: Array<typeof activity.$inferSelect>;
};

type Panel = "work" | "csv" | "product" | "settings" | "import" | "card" | "ai" | "history" | "portfolio" | "planning" | "provider" | "members" | "mcp";
const candidates = Object.keys(sampleProducts) as (keyof typeof sampleProducts)[];

async function request<T>(productId?: string, command?: z.input<typeof mutation>, providerSelection?: string): Promise<T> {
  const url = productId ? "/api/kanban?product=" + encodeURIComponent(productId) : "/api/kanban";
  const response = await fetch(url, command ? {
    method: "POST", headers: {"Content-Type": "application/json", ...(providerSelection ? {"X-ProjectKanban-AI-Connection": providerSelection} : {})}, body: JSON.stringify(command),
  } : {cache: "no-store"});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "The request failed.");
  return payload;
}

function IssueCard({card, open, disabled, taskMode}: {taskMode?: boolean; card: Card; open: () => void; disabled: boolean}) {
  const sortable = useSortable({id: card.id, data: {status: card.status}, disabled});
  return <article ref={sortable.setNodeRef} style={{transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, background: `linear-gradient(145deg, #ffffffee, ${phaseTint(card.roadmapAssignment?.phase)})`}}
    data-state={["Done", "Closed"].includes(card.status) ? "done" : ["Review", "Verify"].includes(card.status) ? "review" : ["In Progress", "Fixing"].includes(card.status) ? "active" : "queued"} className={"issue" + (sortable.isDragging ? " dragging" : "")}>
    <div className="issue-top">
      <span className="issue-id">{card.id.slice(0, 7).toUpperCase()}</span>
      <div className="issue-indicators">
        {!taskMode && card.execution?.planningRequired && <span className="issue-indicator" role="img" aria-label={card.execution.approved ? "Plan reviewed" : "Plan needs review"} title={card.execution.approved ? "Plan reviewed" : "Plan needs review"} data-tone={card.execution.approved ? "passed" : "plan"} tabIndex={0}>P</span>}
        {!taskMode && card.execution?.verificationRequired && <span className="issue-indicator" role="img" aria-label={"Verification: " + card.execution.result} title={"Verification: " + card.execution.result} data-tone={card.execution.result.toLowerCase()} tabIndex={0}>T</span>}

      </div>
      <button className="grip" {...sortable.attributes} {...sortable.listeners} aria-label={"Drag " + card.title}><GripVertical size={16}/></button>
    </div>
    <div className="card-phase">{taskMode ? card.responsible || "Unassigned" : card.roadmapAssignment?.phase || "No phase"}{!taskMode && card.roadmapAssignment?.milestone && <span> · {card.roadmapAssignment.milestone}</span>}</div>
    <button className="issue-title" onClick={open}>{card.title}</button>
    {(card.priority !== "Normal" || card.severity || card.tags.length > 0) && <div className="tags">
      {card.priority !== "Normal" && <span data-priority={card.priority}>{card.priority} priority</span>}
      {card.severity && <span>{card.severity} severity</span>}
      {card.tags.map((tag) => <span key={tag}>{tag}</span>)}
    </div>}
  </article>;
}

function Column({status, cards, open, add, disabled, taskMode}: {taskMode?: boolean; status: string; cards: Card[]; open: (card: Card) => void; add: () => void; disabled: boolean}) {
  const drop = useDroppable({id: status, data: {status}, disabled});
  return <section className={"column" + (drop.isOver ? " over" : "")} ref={drop.setNodeRef}>
    <header><span className="status-dot" data-status={status}/><h2>{status}</h2><span className="count">{cards.length}</span><button aria-label={"Add card to " + status} disabled={disabled} onClick={add}><Plus size={16}/></button></header>
    <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
      {cards.map((card) => <IssueCard taskMode={taskMode} key={card.id} card={card} open={() => open(card)} disabled={disabled}/>)}
    </SortableContext>
    {cards.length === 0 && <button className="empty-column" disabled={disabled} onClick={add}>Add a card</button>}
  </section>;
}

export default function Workspace({account, preview, userId}: {account: ReactNode; preview?: Snapshot; userId?: string}) {
  const [catalog, setCatalog] = useState<Product[]>(preview ? [preview.product] : []);
  const [selected, setSelected] = useState(preview?.product.id ?? "");
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(preview);
  const [board, setBoard] = useState<Kind>("development");
  const [panel, setPanel] = useState<Panel>();
  const [card, setCard] = useState<Card>();
  const [kind, setKind] = useState<Kind>("development");
  const [initialStatus, setInitialStatus] = useState("");
  const [phase, setPhase] = useState("");
  const [tag, setTag] = useState("");
  const [responsible, setResponsible] = useState("");
  const [filter, setFilter] = useState("");
  const [filterScope,setFilterScope]=useState('');
  useEffect(()=>{if(!selected||preview)return;try{const v=JSON.parse(localStorage.getItem('projectkanban:filters:'+userId+':'+selected)??'{}');setBoard(v.board==='bug'?'bug':'development');setFilter(typeof v.filter==='string'?v.filter:'');setPhase(typeof v.phase==='string'?v.phase:'');setTag(typeof v.tag==='string'?v.tag:'');setResponsible(typeof v.responsible==='string'?v.responsible:'');}catch{}setFilterScope(selected);},[selected,userId,preview]);
  useEffect(()=>{if(!selected||preview||filterScope!==selected)return;try{localStorage.setItem('projectkanban:filters:'+userId+':'+selected,JSON.stringify({board,filter,phase,tag,responsible}));}catch{}},[selected,userId,preview,filterScope,board,filter,phase,tag,responsible]);
  const [showArchived,setShowArchived]=useState(false);
  const [listMode,setListMode]=useState(false);
  const [bulkIds,setBulkIds]=useState<string[]>([]);
  const [bulkStatus,setBulkStatus]=useState("Backlog");
  const [quickTitle,setQuickTitle]=useState("");
  useEffect(()=>{setBulkIds([]);setBulkStatus(workflows[board][0]);},[selected,board,filter,phase,tag,responsible]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [plannerConnection, setPlannerConnection] = useState<PublicProviderConnection | null>();
  const [includeRoadmap, setIncludeRoadmap] = useState(false);
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const locked = useRef(false);
  const product = snapshot?.product.id === selected ? snapshot.product : undefined;
  const taskConfig=snapshot?.policy?.taskBoard??defaultTaskBoard;
  const taskMode = snapshot?.policy?.workType === "tasks";
  useEffect(() => { if (taskMode) { setBoard("development"); setPhase(""); } }, [taskMode]);
  const isOwner = snapshot?.role === "owner";
  const canEdit = isOwner || snapshot?.role === "editor";
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));

  useEffect(()=>{if(selected&&!preview)try{localStorage.setItem("projectkanban:selected:"+userId,selected);}catch{}},[selected,userId,preview]);
  const loadCatalog = useCallback(async () => {
    const items = await request<Product[]>();
    setCatalog(items);
    setSelected((current) => {let saved="";try{saved=localStorage.getItem("projectkanban:selected:"+userId)??"";}catch{}return items.some(i=>i.id===current)?current:items.some(i=>i.id===saved)?saved:items[0]?.id??"";});
  }, []);

  useEffect(() => {
    if (preview) return;
    loadCatalog().catch((error: Error) => setError(error.message)).finally(() => setLoading(false));
  }, [loadCatalog, preview]);
  useEffect(() => {
    if (!selected || preview) return;
    let active = true;
    request<Snapshot>(selected).then((data) => { if (active) setSnapshot(data); })
      .catch((error: Error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [selected, preview]);

  async function run(work: () => Promise<void>) {
    if (preview || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try { await work(); }
    catch (error) { setError(error instanceof Error ? error.message : "The request failed."); }
    finally { locked.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (panel !== "ai" || preview) return;
    const controller = new AbortController();
    void fetchPlannerConnection(controller.signal).then(setPlannerConnection).catch(() => {
      if (!controller.signal.aborted) setPlannerConnection(null);
    });
    return () => controller.abort();
  }, [panel, preview]);

  function save(input: z.input<typeof mutation>, close = true) {
    void run(async () => {
      const result = await request<Product | Product[]>(undefined, input, input.action === "plan" ? plannerConnection?.selectionId : undefined);
      if (input.action === "product.create" || input.action === "product.import" || input.action === "product.update") {
        await loadCatalog();
      }
      if (input.action === "product.create" && !Array.isArray(result)) setSelected(result.id);
      else if (selected) setSnapshot(await request<Snapshot>(selected));
      if (close) setPanel(undefined);
    });
  }

  function openCard(status: string, existing?: Card) {
    setCard(existing);
    setKind(existing?.kind === "bug" ? "bug" : existing ? "development" : board);
    setInitialStatus(status);
    setPanel("card");
  }

  function drag({active, over}: DragEndEvent) {
    if (!product || !over || active.id === over.id) return;
    const status = over.data.current?.status;
    if (typeof status !== "string") return;
    const destination = snapshot?.cards.find((item) => item.id === over.id);
    const moving = snapshot?.cards.find((item) => item.id === active.id);
    let beforeId = destination?.id ?? null;
    if (moving && destination && moving.status === status && moving.position < destination.position) {
      beforeId = snapshot?.cards.find((item) => item.kind === moving.kind && item.status === status && item.position > destination.position)?.id ?? null;
    }
    save({action: "card.move", productId: product.id, revision: product.revision, cardId: String(active.id), status, beforeId}, false);
  }

  function form(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return new FormData(event.currentTarget);
  }

  const issues = product ? snapshot!.cards.filter((item) => item.kind === board && (!phase || item.roadmapAssignment?.phase === phase) && (!tag || item.tags.includes(tag)) && (!responsible || item.responsible === responsible) && item.title.toLowerCase().includes(filter.toLowerCase())) : [];
  const selectedProposals = product ? snapshot!.proposals : [];
  return <div className="workspace">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><strong className="brand-wordmark"><span className="wordmark-project">Project</span><span className="wordmark-kanban">Kanban</span></strong></div>
      <div className="catalog-label">Boards <button disabled={busy || !!preview} aria-label="Add product" onClick={() => setPanel("product")}><Plus size={17}/></button></div>
      <input className="search" aria-label="Find a board" placeholder="Find a board…" value={search} onChange={(event) => setSearch(event.target.value)}/>
      <label className="checkbox"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Show archived</label>
      <nav aria-label="Products">{catalog.filter(item=>showArchived||!item.archived).filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) =>
        <button key={item.id} disabled={busy} aria-current={item.id === selected ? "page" : undefined} onClick={() => {
          setSelected(item.id); setFilter(""); setPhase(""); setTag(""); setResponsible(""); setError("");
        }}><span className="product-icon">{item.name.slice(0, 2).toUpperCase()}</span>{item.name}</button>)}</nav>
      <div className="sidebar-bottom">{!preview && <p className="muted">Signed in · Private workspace</p>}<Button variant="ghost" disabled={busy || !!preview} onClick={() => setPanel("import")}><GitBranch size={16}/> Add sample products</Button>{!preview && <Button variant="ghost" onClick={() => setPanel("provider")}>AI Provider</Button>}{account}</div>
    </aside>
    <main className="main">
      {preview && <div className="preview-note">Read-only preview · Fictional product <a href="/">Back to sign-in</a></div>}
      {error && !panel && <p className="error" role="alert">{error}</p>}
      {product ? <>
        <header className="workspace-header">
          <div><div className="breadcrumb">{taskMode?"Client tasks":"Products"}</div><h1>{product.name}</h1></div>
          <Button disabled={!canEdit} onClick={() => openCard(workflows[board][0])}><Plus size={17}/> {taskMode?"New task":"New card"}</Button>
        </header>
        <div className="workspace-commands" aria-label="Product actions">
            <Button variant="ghost" disabled={busy || !!preview} aria-label="Refresh board" onClick={() => void run(async () => setSnapshot(await request<Snapshot>(selected)))}><RefreshCw size={16}/></Button>
            <Button variant="outline" onClick={() => setPanel("settings")}>Configure</Button>
            {!preview && <Button variant="outline" onClick={()=>setPanel("work")}>My Work</Button>}
            {!preview && <Button variant="outline" onClick={() => setPanel("portfolio")}>Portfolio</Button>}
            <Button variant="outline" onClick={() => setPanel("history")}>Activity</Button>
            {canEdit && !taskMode && <Button variant="outline" onClick={() => setPanel("planning")}>Plan product</Button>}
            {isOwner && <Button variant="outline" onClick={() => setPanel("mcp")}>MCP access</Button>}
            {isOwner && <Button variant="outline" onClick={() => setPanel("members")}>Access</Button>}
            {isOwner && <Button variant="outline" onClick={() => {setPrompt(""); setIncludeRoadmap(false); setCardIds([]); setPlannerConnection(undefined); setPanel("ai");}}><Sparkles size={16}/> AI planner{selectedProposals.length > 0 && " · " + selectedProposals.length}</Button>}
        </div>
        {taskMode?<TaskWorkspace key={product.id} cards={snapshot!.cards.filter(c=>c.kind==='development')} config={taskConfig} productId={product.id} userId={userId??product.owner} preview={!!preview} canEdit={canEdit} busy={busy} open={(c,status)=>openCard(c?.status??status??'Backlog',c)}
          move={async(c,status)=>{await request(undefined,{action:'card.move',productId:product.id,revision:product.revision,cardId:c.id,status,beforeId:null});setSnapshot(await request<Snapshot>(product.id));}}
          assign={async(c,assigneeId)=>{const r=await fetch('/api/collaboration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'work',productId:product.id,revision:product.revision,requestId:crypto.randomUUID(),cardId:c.id,fields:{...workFields.parse(c.execution?.work??{}),assigneeId:assigneeId||null}})});const d=await r.json();if(!r.ok)throw new Error(d.error);setSnapshot(await request<Snapshot>(product.id));}}
          quickAdd={async(title,client,agency)=>{await request(undefined,{action:'card.save',productId:product.id,revision:product.revision,fields:{kind:'development',status:'Backlog',title,execution:{work:{client,agency}}}});setSnapshot(await request<Snapshot>(product.id));}}
          classify={async(ids,client,agency)=>{const r=await fetch('/api/collaboration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'classify',productId:product.id,revision:product.revision,requestId:crypto.randomUUID(),cardIds:ids,client,agency})});const d=await r.json();if(!r.ok)throw new Error(d.error);setSnapshot(await request<Snapshot>(product.id));}}
          bulk={async(ids,status)=>{const r=await fetch('/api/collaboration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'bulk',productId:product.id,revision:product.revision,requestId:crypto.randomUUID(),cardIds:ids,status})});const d=await r.json();if(!r.ok)throw new Error(d.error);setSnapshot(await request<Snapshot>(product.id));}}/>:<>
        {canEdit&&<form className="actions" onSubmit={e=>{e.preventDefault();if(quickTitle.trim()){void run(async()=>{await request(undefined,{action:"card.save",productId:product.id,revision:product.revision,fields:{kind:board,status:workflows[board][0],title:quickTitle}});setSnapshot(await request<Snapshot>(product.id));setQuickTitle("");});}}}><input aria-label="Quick task title" placeholder="Add a task…" value={quickTitle} onChange={e=>setQuickTitle(e.target.value)} maxLength={180}/><Button type="submit" disabled={busy||!quickTitle.trim()}>Quick add</Button></form>}
        <div className="toolbar workspace-board-bar">
          <nav aria-label="Boards">
            <button aria-pressed={board === "development"} onClick={() => setBoard("development")}><Layers3 size={16}/> {taskMode ? "Tasks" : "Development"}</button>
            {!taskMode && <button aria-pressed={board === "bug"} onClick={() => setBoard("bug")}><Bug size={16}/> Bug Fixes</button>}
          </nav>
          <label><ListFilter size={16}/><input placeholder="Filter cards…" value={filter} onChange={(event) => setFilter(event.target.value)}/></label>
        </div>
        {product && <div className="toolbar" aria-label="Board filters">
          {([
            ["Phase", phase, setPhase, [...new Set(product.releases.flatMap((release) => release.phases))]],
            ["Owner", responsible, setResponsible, [...new Set(snapshot!.cards.map((item) => item.responsible).filter(Boolean))]],
            ["Topic", tag, setTag, [...new Set(snapshot!.cards.flatMap((item) => item.tags))]],
          ] as const).map(([label, value, onChange, options]) => options.length > 0 && <label key={label}>{label}
            <select value={value} onChange={(event) => onChange(event.target.value)}>
              <option value="">All</option>{options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>)}
        </div>}
        {!taskMode && <div className="phase-legend" aria-label="Card background colors by phase"><strong>Phase colors</strong>
          {[...new Set(product.releases.flatMap(release => release.phases).concat(snapshot!.cards.map(item => item.roadmapAssignment?.phase || "").filter(Boolean)))].map(name => <span key={name}><i aria-hidden="true" style={{background: phaseTint(name)}}/>{name}</span>)}
          <span><i aria-hidden="true" style={{background: phaseTint()}}/>No phase</span>
        </div>}
        <div className="workspace-board-options">
        {!taskMode && <details className="board-legend"><summary>Board legend</summary><div>
          <p><strong>Card background</strong> · Project phase (see Phase colors). Columns show workflow status; milestone names appear below the card ID.</p>
          <p><strong>P</strong> Planning · Blue: needs review · Green: reviewed</p>
          <p><strong>T</strong> Testing · Amber: pending · Green: passed · Red: failed</p>
        </div></details>}
        {!preview && <SavedViews key={product.id} storageKey={"projectkanban-views:" + userId + ":" + product.id}
          board={board} filter={filter} phase={phase} tag={tag} responsible={responsible} apply={(view) => {setBoard(taskMode ? "development" : view.board); setFilter(view.filter); setPhase(taskMode ? "" : view.phase); setTag(view.tag); setResponsible(view.responsible);}}/>}
        {!taskMode && <ReleaseReadiness policy={snapshot?.policy} key={product.id} cards={snapshot!.cards} releases={product.releases} open={(issue) => openCard(issue.status, issue)}/>}
        </div>
        <Button variant="outline" onClick={()=>setListMode(!listMode)}>{listMode?"Board view":"List view"}</Button>
        {listMode&&canEdit&&<div className="actions"><label>Move selected to<select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}>{workflows[board].map(status=><option key={status}>{status}</option>)}</select></label><Button disabled={busy||!bulkIds.length} onClick={()=>void run(async()=>{const response=await fetch("/api/collaboration",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"bulk",cardIds:bulkIds,status:bulkStatus,productId:product.id,revision:product.revision,requestId:crypto.randomUUID()})});const data=await response.json();if(!response.ok)throw new Error(data.error);setSnapshot(await request<Snapshot>(product.id));setBulkIds([]);})}>Move {bulkIds.length} selected</Button></div>}
        {listMode ? <div className="history">{issues.map(item=><article key={item.id}>{canEdit&&<input type="checkbox" aria-label={"Select "+item.title} checked={bulkIds.includes(item.id)} onChange={e=>setBulkIds(ids=>e.target.checked?[...ids,item.id]:ids.filter(id=>id!==item.id))}/>}<Button variant="ghost" onClick={()=>openCard(item.status,item)}>{item.title}</Button><input key={item.id+item.responsible} aria-label={"Assignee label for "+item.title} defaultValue={item.responsible} placeholder="Unassigned" disabled={busy||!canEdit} maxLength={120} onBlur={e=>{if(e.target.value!==item.responsible)void save({action:"card.save",productId:product.id,revision:product.revision,cardId:item.id,fields:{...item,kind:item.kind as Kind,priority:item.priority as "Normal",severity:item.severity as "",execution:item.execution??undefined,responsible:e.target.value}},false);}}/><select aria-label={"Status for "+item.title} value={item.status} disabled={busy||!canEdit} onChange={e=>void save({action:"card.move",productId:product.id,revision:product.revision,cardId:item.id,status:e.target.value,beforeId:null},false)}>{workflows[item.kind as Kind].map(status=><option key={status}>{status}</option>)}</select></article>)}</div> : <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={drag}>
          <div className="board">{workflows[board].map((status) => <Column taskMode={taskMode} key={status} status={status}
            cards={issues.filter((item) => item.status === status)} disabled={busy || !canEdit || Boolean(filter || phase || tag || responsible)}
            open={(item) => openCard(status, item)} add={() => { if (canEdit) openCard(status); }}/>)}</div>
        </DndContext>}</>}
      </> : <div className="empty-state"><Layers3 size={34}/><h1>{loading || selected ? "Loading workspace…" : "Add your first product"}</h1>
        {!loading && !selected && <><p>Choose client task management or software development when creating a board.</p><div className="actions">
          <Button onClick={() => setPanel("product")}><Plus size={16}/> New product</Button>
          <Button variant="outline" onClick={() => setPanel("import")}>Add sample products</Button>
        </div></>}</div>}
    </main>
    {panel && <Sheet key={panel} title={{work:"My Work",csv: "Import CSV", product: "New product", settings: taskMode?"Configure task board":"Configure product", import: "Add sample products", card: taskMode?(card?"Edit task":"New task"):(card ? "Edit card" : "New card"), ai: "AI planner", history: "Activity", portfolio: "Portfolio", planning: "Plan product", provider: "AI Provider", members: "Board access", mcp: "MCP access"}[panel]} close={() => {if (!busy) {setPanel(undefined); setError("");}}}>
      {error && <p className="error" role="alert">{error}</p>}
      {(panel === "product" || (panel === "settings" && isOwner)) && <form onSubmit={(event) => {
        const values = form(event);
        const fields = {aiEnabled: values.has("aiEnabled"), name: String(values.get("name")), roadmap: String(values.get("roadmap")??product?.roadmap??""), repository: String(values.get("repository")??product?.repository??"")};
        save(panel === "settings" && product ? {action: "product.update", productId: product.id, revision: product.revision, fields} : {action: "product.create", workType:values.get("workType")==="tasks"?"tasks":"software", fields});
      }}>
        {panel==="product"&&<label>Work type<select name="workType"><option value="tasks">Client and agency tasks</option><option value="software">Software development</option></select></label>}
        <label>Board name<input name="name" required maxLength={100} defaultValue={panel === "settings" ? product?.name : ""}/></label>
        {!taskMode&&<><label>Roadmap<textarea name="roadmap" rows={9} maxLength={12000} defaultValue={panel === "settings" ? product?.roadmap : ""}/></label>
        <label>Primary repository URL<input name="repository" type="url" defaultValue={panel === "settings" ? product?.repository : ""}/></label></>}
        <label className="checkbox"><input name="aiEnabled" type="checkbox" defaultChecked={panel === "settings" && product?.aiEnabled}/> Allow the in-app planner to send selected context to an AI provider</label>
        <p className="muted">Nothing is sent when you save this setting. AI proposals require a configured provider and an explicit request. Codex and Claude MCP access is configured separately.</p>
        <Button type="submit" disabled={busy || !!preview}>Save product</Button>
      </form>}
      {panel === "work" && <MyWork open={(productId,cardId)=>{void run(async()=>{const next=await request<Snapshot>(productId);setSelected(productId);setSnapshot(next);const found=next.cards.find(c=>c.id===cardId);if(found){setCard(found);setKind(found.kind as Kind);setInitialStatus(found.status);setPanel("card");}});}}/>}
      {panel === "csv" && product && isOwner && !preview && <CsvImport productId={product.id} revision={product.revision} onImported={async()=>setSnapshot(await request<Snapshot>(product.id))}/>}
      {panel === "settings" && product && <section className="history">
        {isOwner&&!preview&&<Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{const archived=!!catalog.find(p=>p.id===product.id)?.archived;const response=await fetch("/api/collaboration",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"archive",productId:product.id,revision:product.revision,requestId:crypto.randomUUID(),archived:!archived})});const result=await response.json();if(!response.ok)throw new Error(result.error);await loadCatalog();setSnapshot(await request<Snapshot>(product.id));})}>{catalog.find(p=>p.id===product.id)?.archived?"Restore product":"Archive product"}</Button>}

        {isOwner && !preview && !taskMode && <ProductPlanning productId={product.id} cards={snapshot!.cards} releases={product.releases} refresh={async()=>setSnapshot(await request<Snapshot>(product.id))}/>}
        {isOwner && !preview && !taskMode && <Integrations productId={product.id}/>}
        {isOwner && !preview && <div><h3>Import and export tasks</h3><a href={"/api/export?product="+product.id}>Download CSV</a><p>Bring tasks from an Airtable CSV export, including historical completed work.</p><Button variant="outline" onClick={() => setPanel("csv")}>Import CSV</Button></div>}
        {!preview && (!taskMode || isOwner) && <div><h3>AI provider</h3><p>Choose OpenRouter, OpenAI, Anthropic, or Vercel AI Gateway and save your own API key. Your provider connection applies to your account; external AI planning is enabled separately for each product.</p><Button variant="outline" onClick={() => setPanel("provider")}>Configure AI provider</Button></div>}
        {!isOwner && !taskMode && <><h3>Current roadmap</h3><p style={{whiteSpace: "pre-wrap"}}>{product.roadmap || "No roadmap yet."}</p></>}
        {!taskMode && <><h3>Releases</h3>
        {product.releases.map((release) => <article key={release.id}><strong>{release.name}</strong>
          <p>Phases · {release.phases.join(", ") || "None"}</p>
          <p>Milestones · {release.milestones.join(", ") || "None"}</p>
          {canEdit && <details><summary>Edit release</summary>
            <ReleaseForm release={release} busy={busy} commit={(fields) => save({
              action: "roadmap.release.save", productId: product.id, revision: product.revision, releaseId: release.id, fields,
            }, false)}/>
          </details>}
        </article>)}
        {canEdit && <ReleaseForm busy={busy} commit={(fields) => save({
          action: "roadmap.release.save", productId: product.id, revision: product.revision, fields,
        }, false)}/>}
        </>}
        {isOwner&&taskMode&&!preview&&<TaskBoardSettings config={taskConfig} busy={busy} save={taskBoard=>save({action:"quality.policy",productId:product.id,revision:product.revision,fields:{...defaultQualityPolicy,...snapshot?.policy,taskBoard}},false)}/>}
        {isOwner && !preview && <details><summary>Work type and software policy</summary><form onSubmit={event=>{const values=form(event);save({action:"quality.policy",productId:product.id,revision:product.revision,fields:{...snapshot?.policy,workType:values.get("workType") === "tasks" ? "tasks" : "software",requireStructuredBrief:values.has("requireStructuredBrief"),requireBugDetails:values.has("requireBugDetails"),allowOwnerExceptions:values.has("allowOwnerExceptions")}},false);}}>
          <h3>Card style and quality policy</h3><label>Work type<select name="workType" defaultValue={snapshot?.policy?.workType ?? "software"}><option value="software">SaaS / software development</option><option value="tasks">Human tasks — simple cards</option></select></label><p>Human tasks use name, notes, assignee, status, attachments, and attachment summary. Marking Done records completion without software testing requirements. Software cards retain their planning and verification checks. Changes are recorded in history.</p>
          {([ ["requireStructuredBrief","Require structured development details before starting"], ["requireBugDetails","Require detailed reproduction information before fixing"], ["allowOwnerExceptions","Allow the owner to waive readiness fields with a written reason"] ] as const).map(([name,label])=><label className="checkbox" key={name}><input type="checkbox" name={name} defaultChecked={(snapshot?.policy??defaultQualityPolicy)[name]}/>{label}</label>)}
          <Button type="submit" disabled={busy}>Save quality policy</Button>
        </form></details>}
        {!taskMode && <><h3>Roadmap history</h3>
        <RoadmapComparison versions={snapshot!.roadmapVersions}/>
        {snapshot!.roadmapVersions.length === 0 && <p>No saved roadmap versions yet.</p>}
        {snapshot!.roadmapVersions.map((version, index) => <details key={version.id}>
          <summary>Version {snapshot!.roadmapVersions.length - index} · {new Date(version.createdAt).toLocaleString()}</summary>
          <p style={{whiteSpace: "pre-wrap"}}>{(version.after as {roadmap: string}).roadmap || "Empty roadmap"}</p>
        </details>)}</>}
        {taskMode && <p>Task cards use Name, Notes, Assignee, Status, Attachments, and Attachment Summary. Software planning fields are hidden.</p>}
      </section>}
      {panel === "import" && <form onSubmit={(event) => {
        const values = form(event).getAll("names");
        const names = candidates.filter((name) => values.includes(name));
        if (names.length) save({action: "product.import", names});
        else setError("Select at least one product.");
      }}><p>Select fictional products to try the boards.</p>
        {candidates.map((name) => <label className="checkbox" key={name}><input name="names" type="checkbox" value={name} disabled={catalog.some((item) => item.name === name)}/>{name}</label>)}
        <Button type="submit" disabled={busy}>Add selected products</Button>
      </form>}
      {panel === "card" && product && taskMode && kind === "development" && <TaskForm config={taskConfig} clients={[...new Set(snapshot!.cards.map(c=>c.execution?.work?.client??""))].filter(Boolean)} agencies={[...new Set(snapshot!.cards.map(c=>c.execution?.work?.agency??""))].filter(Boolean)} card={card} status={initialStatus} productId={product.id} canEdit={canEdit} busy={busy} preview={!!preview} save={fields => save({action:"card.save", productId:product.id, revision:product.revision, cardId:card?.id, fields})}/>}
      {panel === "card" && product && (!taskMode || kind === "bug") && <form onSubmit={(event) => {
        const values = form(event);
        const fields = {
          ...Object.fromEntries(values),
          tags: String(values.get("topics")).split(",").map((item) => item.trim()).filter(Boolean),
          roadmapAssignment: values.get("releaseId") ? {
            releaseId: String(values.get("releaseId")),
            phase: String(values.get("phase") ?? "") || undefined,
            milestone: String(values.get("milestone") ?? "") || undefined,
          } : null,
          execution: {
            ...structuredExecution(values, card?.execution),
            planningRequired: values.has("planningRequired"), approach: String(values.get("approach")),
            approved: values.has("approved"), blockers: values.getAll("blockers").map(String),
            verificationRequired: values.has("verificationRequired"), testPlan: String(values.get("testPlan")),
            result: values.get("result"), evidence: String(values.get("evidence")),
          },
        } as unknown as z.input<typeof cardFields>;
        save({action: "card.save", productId: product.id, revision: product.revision, cardId: card?.id, fields});
      }}>
        {!card && <CardTemplate/>}
        <RoadmapFields releases={product.releases} assignment={card?.roadmapAssignment}/>
        <label>Responsible person<input name="responsible" maxLength={100} defaultValue={card?.responsible}/></label>
        <label>Topic tags, separated by commas<input name="topics" defaultValue={card?.tags.join(", ")}/></label>
        <label>Title<input name="title" required maxLength={180} defaultValue={card?.title}/></label>
        <div className="fields">
          <label>Board<select name="kind" value={kind} onChange={(event) => setKind(event.target.value as Kind)}><option value="development">Development</option><option value="bug">Bug Fixes</option></select></label>
          <label>Status<select name="status" key={kind} defaultValue={workflows[kind].includes(initialStatus) ? initialStatus : workflows[kind][0]}>{workflows[kind].map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>
        <div className="fields">
          <label>Priority<select name="priority" defaultValue={card?.priority ?? "Normal"}>{priority.options.map((item) => <option key={item}>{item}</option>)}</select></label>
          {kind === "bug" && <label>Severity<select name="severity" defaultValue={card?.severity ?? ""}>{severity.options.map((item) => <option key={item} value={item}>{item || "Unset"}</option>)}</select></label>}
        </div>
        <CardBrief policy={snapshot?.policy} key={kind} kind={kind} execution={card?.execution} card={card} related={(snapshot?.cards ?? []).filter(item => item.id !== card?.id)}/>
        <label>Additional context / legacy description<textarea name="description" rows={4} maxLength={10000} defaultValue={card?.description}/></label>
        <label>Acceptance criteria — observable outcomes<textarea name="criteria" rows={4} maxLength={10000} defaultValue={card?.criteria}/></label>
        <details open={Boolean(card?.execution?.planningRequired || card?.execution?.verificationRequired)}>
          <summary>Planning and verification</summary>
          <label className="checkbox"><input name="planningRequired" type="checkbox" defaultChecked={card?.execution?.planningRequired}/> Require plan review</label>
          <label>Implementation plan<textarea name="approach" defaultValue={card?.execution?.approach}/></label>
          <label className="checkbox"><input name="approved" type="checkbox" defaultChecked={card?.execution?.approved}/> Plan reviewed</label>
          <label>Blocked by<select name="blockers" multiple defaultValue={card?.execution?.blockers ?? []}>
            {snapshot?.cards.filter((item) => item.id !== card?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select></label>
          <label className="checkbox"><input name="verificationRequired" type="checkbox" defaultChecked={card?.execution?.verificationRequired ?? true}/> Show testing indicator (passing evidence is always required to close)</label>
          <label>Test plan<textarea name="testPlan" defaultValue={card?.execution?.testPlan}/></label>
          <label>Test result<select name="result" defaultValue={card?.execution?.result ?? "Pending"}><option>Pending</option><option>Passed</option><option>Failed</option></select></label>
          <label>Evidence<textarea name="evidence" defaultValue={card?.execution?.evidence}/></label>
        </details>
        <label>GitHub issue or pull request URL<input name="link" type="url" defaultValue={card?.link}/></label>
        {card?.link && <a href={card.link} target="_blank" rel="noreferrer">Open linked work</a>}
        {!preview && <CardAttachments key={card?.id ?? "new"} productId={product.id} cardId={card?.id} canEdit={canEdit}/>}
        <Button type="submit" disabled={busy || !canEdit}>Save card</Button>
      </form>}
      {panel === "card" && card && product && !preview && <WorkDetails taskMode={taskMode} key={card.id} productId={product.id} card={snapshot!.cards.find(item=>item.id===card.id)??card} refresh={async()=>{const next=await request<Snapshot>(product.id);setSnapshot(next);setCard(next.cards.find(item=>item.id===card.id));}}/>}
      {panel === "card" && card && product && isOwner && snapshot?.policy?.allowOwnerExceptions && !preview && <details><summary>Owner readiness exception</summary><form onSubmit={event=>{const values=form(event);save({action:"card.exception",productId:product.id,revision:product.revision,cardId:card.id,status:String(values.get("destination")),reason:String(values.get("reason"))});}}>
        <p>This applies only to this transition. Dependency checks and passing completion evidence cannot be waived. Save your card edits first.</p>
        <label>Destination<select name="destination">{workflows[kind].map(status=><option key={status}>{status}</option>)}</select></label>
        <label>Reason and risk accepted<textarea name="reason" required minLength={20} maxLength={2000}/></label>
        <Button type="submit" disabled={busy}>Record exception and move</Button>
      </form></details>}
      {panel === "provider" && !preview && <ProviderSettings/>}
      {panel === "ai" && product && <>
        {product.aiEnabled ? <form onSubmit={(event) => {
          event.preventDefault();
          save({action: "plan", productId: product.id, revision: product.revision, prompt, includeRoadmap, cardIds}, false);
        }}>
          <p><strong>Target board: {product.name}</strong> · Review proposed changes before applying.</p>
          <p className="muted">{plannerConnection
            ? "Destination: " + providerLabels[plannerConnection.provider] + " · " + plannerConnection.model + " · " + (plannerConnection.source === "personal" ? "Personal key" : "Server key")
            : plannerConnection === undefined ? "Checking the planner connection…" : "No AI connection is available. Open AI Provider settings to configure one."}</p>
          <Button variant="outline" onClick={() => setPanel("provider")}>Configure AI provider</Button>
          <label>What should change?<textarea rows={5} required maxLength={5000} value={prompt} onChange={(event) => setPrompt(event.target.value)}/></label>
          <label className="checkbox"><input type="checkbox" checked={includeRoadmap} onChange={(event) => setIncludeRoadmap(event.target.checked)}/> Include current roadmap</label>
          <details><summary>Select cards ({cardIds.length})</summary>
            {snapshot!.cards.map((item) => <label className="checkbox" key={item.id}>
              <input type="checkbox" checked={cardIds.includes(item.id)} disabled={cardIds.length >= 100 && !cardIds.includes(item.id)}
                onChange={(event) => setCardIds(event.target.checked ? [...cardIds, item.id] : cardIds.filter((id) => id !== item.id))}/>
              {item.title} · {item.status}
            </label>)}
          </details>
          <details><summary>Preview content sent to the selected provider</summary>
            <pre style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{JSON.stringify(plannerContext(prompt, product, includeRoadmap, snapshot!.cards.filter((item) => cardIds.includes(item.id))), null, 2)}</pre>
          </details>
          <Button type="submit" disabled={busy || !prompt.trim() || !plannerConnection}><Sparkles size={16}/>{busy ? "Working…" : "Send and generate proposal"}</Button>
        </form> : <p>AI planning is off. Enable it in the product’s Configure settings.</p>}
        {selectedProposals.map((proposal) => <section className="proposal" key={proposal.id}>
          <h3>{proposal.prompt}</h3>
          {proposal.revision !== product.revision && <p className="muted">The board changed. Generate a fresh proposal to apply changes.</p>}
          {proposal.operations.map((operation, index) => {
            const previous = snapshot?.cards.find((item) => item.id === operation.cardId);
            const destination = snapshot?.cards.find((item) => item.id === operation.beforeId);
            return <div className="operation" key={index}>
              <strong>{operation.type === "move" ? previous?.title : operation.title}</strong>
              <p>{operation.type} · {previous ? previous.kind + " / " + previous.status + " → " : ""}{operation.kind} / {operation.status}{destination && " · before " + destination.title}</p>
              {operation.type !== "move" && <dl>{([
                ["Title", previous?.title, operation.title],
                ["Description", previous?.description, operation.description],
                ["Criteria", previous?.criteria, operation.criteria],
                ["Priority", previous?.priority, operation.priority],
                ["Severity", previous?.severity, operation.severity],
              ] as const).filter(([, before, after]) => before !== after && (before || after)).map(([label, before, after]) =>
                <div key={label}><dt>{label}</dt><dd>{before && <del>{before}</del>}<span>{after || "Cleared"}</span></dd></div>)}</dl>}
              {operation.execution && <details><summary>Planning and testing changes</summary><p>Current</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(previous?.execution??{},null,2)}</pre><p>Proposed</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(operation.execution,null,2)}</pre></details>}
              <p>{operation.reason}</p>
            </div>;
          })}
          <div className="actions">
            <Button disabled={busy || proposal.revision !== product.revision} onClick={() => save({action: "proposal.apply", productId: product.id, proposalId: proposal.id}, false)}>Apply changes</Button>
            <Button variant="outline" disabled={busy} onClick={() => save({action: "proposal.dismiss", productId: product.id, proposalId: proposal.id}, false)}>Dismiss</Button>
          </div>
        </section>)}
      </>}
      {panel === "mcp" && product && isOwner && <McpAccess key={product.id} productId={product.id} productName={product.name} products={catalog.filter(p=>p.owner===product.owner)}/>}
      {panel === "members" && product && isOwner && <MemberPanel key={product.id} productId={product.id}/>}
      {panel === "planning" && product && <PlanningWizard key={product.id} ownerId={userId ?? product.owner}
        productId={product.id} productName={product.name} roadmap={product.roadmap} revision={product.revision} publish={async (plan, revision) => {
          await request(undefined, {action: "plan.publish", productId: product.id, revision, plan});
          const latest = await request<Snapshot>(product.id);
          setSnapshot(latest);
        }}/>}
      {panel === "portfolio" && <Portfolio open={(productId) => {
        setSelected(productId); setFilter(""); setPhase(""); setTag(""); setResponsible(""); setPanel(undefined);
      }}/>}
      {panel === "history" && product && <div className="history">
        {snapshot!.activity.length === 0 && <p>No activity yet.</p>}
        {snapshot!.activity.map((item) => {
          const before = item.before as Partial<Card> | null;
          const after = item.after as Partial<Card> | null;
          return <article key={item.id}><strong>{item.action}{after?.title && " · " + after.title}</strong>
            {item.action === "Granted quality exception" && <><p>{(item.after as {reason:string}).reason}</p><p>Waived for this transition: {(item.after as {waived:string[]}).waived.join(", ")}</p></>}
            {item.action === "Changed quality policy" && <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(item.after,null,2)}</pre>}
            {before?.status && after?.status && before.status !== after.status && <p>{before.status} → {after.status}</p>}
            <p>{item.actor.startsWith("AI · ") ? "AI proposal" : "Manual"} · {new Date(item.createdAt).toLocaleString()}</p></article>;
        })}
      </div>}
    </Sheet>}
  </div>;
}
