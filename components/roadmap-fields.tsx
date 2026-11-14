"use client";

import { useState } from "react";
import { compareRoadmaps, type RoadmapAssignment, type RoadmapRelease, type RoadmapVersion } from "../lib/roadmap";

export function RoadmapFields({releases, assignment}: {releases: RoadmapRelease[]; assignment?: RoadmapAssignment | null}) {
  const [releaseId, selectRelease] = useState(assignment?.releaseId ?? "");
  const release = releases.find(({id}) => id === releaseId);
  return <fieldset>
    <legend>Roadmap assignment</legend>
    <label>Release<select name="releaseId" value={releaseId} onChange={(event) => selectRelease(event.target.value)}>
      <option value="">Unassigned</option>
      {releases.map(({id, name}) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    {release && <div className="fields" key={releaseId}>
      {(["phase", "milestone"] as const).map((field) => <label key={field}>{field === "phase" ? "Phase" : "Milestone"}
        <select name={field} defaultValue={releaseId === assignment?.releaseId ? assignment[field] : ""}>
          <option value="">Unassigned</option>
          {(field === "phase" ? release.phases : release.milestones).map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>)}
    </div>}
  </fieldset>;
}

export function RoadmapComparison({versions}: {versions: {id: string; after: unknown}[]}) {
  const [older, setOlder] = useState("");
  const [newer, setNewer] = useState("");
  if (versions.length < 2) return null;
  const left = versions.find(({id}) => id === older) ?? versions[1];
  const right = versions.find(({id}) => id === newer) ?? versions[0];
  const previous = left.after as RoadmapVersion;
  const current = right.after as RoadmapVersion;
  const {changes, roadmapChanged} = compareRoadmaps(previous, current);
  return <section className="history">
    <h3>Compare versions</h3>
    <div className="fields">
      {([["From", left.id, setOlder], ["To", right.id, setNewer]] as const).map(([label, value, set]) =>
        <label key={label}>{label}<select value={value} onChange={(event) => set(event.target.value)}>
          {versions.map(({id}, index) => <option key={id} value={id}>Version {versions.length - index}</option>)}
        </select></label>)}
    </div>
    {changes.length > 0 && <ul>{changes.map((change) => <li key={change}>{change}</li>)}</ul>}
    {roadmapChanged && <div className="fields">
      <div><strong>From</strong><p style={{whiteSpace: "pre-wrap"}}>{previous.roadmap || "Empty"}</p></div>
      <div><strong>To</strong><p style={{whiteSpace: "pre-wrap"}}>{current.roadmap || "Empty"}</p></div>
    </div>}
    {!changes.length && !roadmapChanged && <p>No changes between these versions.</p>}
  </section>;
}

export function ReleaseForm({release, busy, commit}: {
  release?: RoadmapRelease;
  busy: boolean;
  commit: (fields: Omit<RoadmapRelease, "id">) => void;
}) {
  return <form onSubmit={(event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const lines = (field: string) => String(values.get(field)).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    commit({name: String(values.get("name")), phases: lines("phases"), milestones: lines("milestones")});
  }}>
    <label>Release name<input name="name" required maxLength={100} defaultValue={release?.name}/></label>
    <label>Phases, one per line<textarea name="phases" defaultValue={release?.phases.join("\n")}/></label>
    <label>Milestones, one per line<textarea name="milestones" defaultValue={release?.milestones.join("\n")}/></label>
    <button className="primary" type="submit" disabled={busy}>{release ? "Save release" : "Add release"}</button>
  </form>;
}
