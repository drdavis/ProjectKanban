"use client";
import type { QualityPolicy } from "../lib/quality-policy";
import type { Execution } from "../lib/card-quality";
import { qualityIssues } from "../lib/card-quality";

const development = [
  ["audience", "Who is this for?"], ["problem", "Problem to solve"], ["outcome", "Intended outcome"],
  ["scope", "In scope"], ["exclusions", "Out of scope"], ["decisions", "Open decisions and assumptions"],
] as const;
const bug = [
  ["reporter", "Reported by"], ["discoveredAt", "Discovered at (include timezone)"],
  ["affectedVersion", "Affected version / build"], ["environment", "Environment, browser, OS and device"],
  ["preconditions", "Preconditions and test data (no secrets)"], ["steps", "Numbered steps to reproduce"],
  ["expected", "Expected behavior"], ["actual", "Actual behavior"], ["frequency", "Frequency / intermittent pattern"],
  ["impact", "Who is affected and how?"], ["investigation", "Investigation evidence / missing information"],
  ["rootCause", "Root-cause findings (state if still unresolved)"], ["fixSummary", "Fix summary"],
  ["regressionTest", "Regression test and its result"], ["fixedIn", "Fixed-in version / release"],
] as const;

export function CardBrief({kind, execution, related, card, policy}: {
  policy?: QualityPolicy; kind: "development" | "bug"; execution?: Execution | null;
  related: {id: string; title: string}[];
  card?: {kind: string; status: string; criteria: string; severity: string; execution: Execution | null};
}) {
  const missing = card ? qualityIssues(card, kind === "bug" ? "Closed" : "Done", policy) : [];
  return <>
    <p className="muted">Save an incomplete idea in {kind === "bug" ? "Reported or Triage" : "Backlog"}. Complete the brief and test plan before starting work. Keep acceptance criteria separate from test evidence.</p>
    {missing.length > 0 && <details><summary>Still needed before completion · {missing.length}</summary>
      <p>Based on the saved card. Save edits to refresh this check.</p><ul>{missing.map(label => <li key={label}>{label}</li>)}</ul>
    </details>}
    <details open><summary>{kind === "bug" ? "Bug report" : "Development brief"}</summary>
      {kind === "development" ? development.map(([field, label]) => <label key={field}>{label}
        <textarea name={"brief." + field} rows={2} maxLength={10000} defaultValue={execution?.brief?.[field]}/>
      </label>) : bug.slice(0, 11).map(([field, label]) => <label key={field}>{label}
        <textarea name={"bug." + field} rows={field === "steps" ? 4 : 2} maxLength={field === "discoveredAt" ? 80 : 10000} defaultValue={execution?.bug?.[field]}/>
      </label>)}
      {kind === "bug" && <>
        <label>Reproduction assessment<select name="bug.reproduction" defaultValue={execution?.bug?.reproduction ?? "Untriaged"}>
          {["Untriaged", "Confirmed", "Intermittent", "Not reproduced"].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>Duplicate of<select name="bug.duplicateOf" defaultValue={execution?.bug?.duplicateOf ?? ""}>
          <option value="">Not a duplicate</option>{related.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label>
        <p className="muted">“Not reproduced” does not mean fixed. Record investigation findings and retest evidence. Use sanitized logs and links in the evidence field; attach screenshots or documents in the Attachments section.</p>
      </>}
      <label>Parent outcome / card<select name="parentId" defaultValue={execution?.parentId ?? ""}>
        <option value="">No parent</option>{related.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
    </details>
    {kind === "bug" && <details><summary>Resolution and regression testing</summary>
      {bug.slice(11).map(([field,label]) => <label key={field}>{label}
        <textarea name={"bug." + field} rows={2} maxLength={10000} defaultValue={execution?.bug?.[field]}/>
      </label>)}
    </details>}
  </>;
}

export function structuredExecution(values: FormData, previous?: Execution | null) {
  const object = (prefix: string) => Object.fromEntries([...values.entries()].filter(([key]) => key.startsWith(prefix + "."))
    .map(([key,value]) => [key.slice(prefix.length + 1), String(value)]));
  const kind = values.get("kind");
  const hasBrief = previous?.brief || Object.values(object("brief")).some(value=>value.trim());
  const hasBug = previous?.bug || Object.entries(object("bug")).some(([key,value])=>!["reproduction","duplicateOf"].includes(key) && value.trim());
  return {
    ...previous,
    ...(kind === "bug" && hasBug ? {bug: {...previous?.bug, ...object("bug"), duplicateOf: String(values.get("bug.duplicateOf") ?? "") || null}}
      : kind === "development" && hasBrief ? {brief: {...previous?.brief, ...object("brief")}} : {}),
    parentId: String(values.get("parentId") ?? "") || null,
  };
}
