import { z } from "zod";

const label = z.string().trim().min(1).max(100);
const items = z.array(label).max(40).refine((entries) =>
  new Set(entries.map((entry) => entry.toLowerCase())).size === entries.length, "Names must be unique.");

export const releaseFields = z.object({name: label, phases: items, milestones: items});
export type RoadmapRelease = z.infer<typeof releaseFields> & {id: string};

export const roadmapAssignmentFields = z.object({
  releaseId: z.uuid(),
  phase: label.optional(),
  milestone: label.optional(),
});
export type RoadmapAssignment = z.infer<typeof roadmapAssignmentFields>;
export type RoadmapVersion = {roadmap: string; releases?: RoadmapRelease[]};

export function assignmentIsValid(assignment: RoadmapAssignment, releases: RoadmapRelease[]) {
  const release = releases.find(({id}) => id === assignment.releaseId);
  return Boolean(release &&
    (!assignment.phase || release.phases.includes(assignment.phase)) &&
    (!assignment.milestone || release.milestones.includes(assignment.milestone)));
}

export function compareRoadmaps(previous: RoadmapVersion, current: RoadmapVersion) {
  const changes: string[] = [];
  const before = new Map((previous.releases ?? []).map((release) => [release.id, release]));
  for (const release of current.releases ?? []) {
    const old = before.get(release.id);
    if (!old) {
      changes.push("Added release " + release.name);
      for (const name of release.milestones) changes.push("Added milestone " + release.name + " / " + name);
      continue;
    }
    before.delete(release.id);
    if (old.name !== release.name) changes.push("Renamed release " + old.name + " to " + release.name);
    for (const [label, key] of [["phase", "phases"], ["milestone", "milestones"]] as const) {
      for (const name of release[key]) if (!old[key].includes(name)) changes.push("Added " + label + " " + release.name + " / " + name);
      for (const name of old[key]) if (!release[key].includes(name)) changes.push("Removed " + label + " " + release.name + " / " + name);
    }
  }
  for (const release of before.values()) changes.push("Removed release " + release.name);
  return {changes, roadmapChanged: previous.roadmap !== current.roadmap};
}
