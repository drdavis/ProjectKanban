import assert from "node:assert/strict";
import { test } from "node:test";
import { assignmentIsValid, compareRoadmaps, releaseFields } from "../lib/roadmap.ts";

const releases = [
  {id: "release-1", name: "One", phases: ["Build"], milestones: ["Search"]},
  {id: "release-2", name: "Two", phases: ["Verify"], milestones: ["Exports"]},
];

test("rejects a phase or milestone from a different release", () => {
  assert.equal(assignmentIsValid({releaseId: "release-1", phase: "Build", milestone: "Search"}, releases), true);
  assert.equal(assignmentIsValid({releaseId: "release-1", phase: "Verify"}, releases), false);
  assert.equal(assignmentIsValid({releaseId: "release-1", milestone: "Exports"}, releases), false);
  assert.equal(assignmentIsValid({releaseId: "other"}, releases), false);
});

test("compares structured milestones and accepts old snapshots with no releases", () => {
  const previous = {roadmap: "Original", releases};
  const current = {roadmap: "Edited", releases: [{...releases[0], name: "First", milestones: ["Folders"]}]};
  const {changes, roadmapChanged} = compareRoadmaps(previous, current);
  assert.equal(roadmapChanged, true);
  assert.deepEqual(changes, ["Renamed release One to First", "Added milestone First / Folders", "Removed milestone First / Search", "Removed release Two"]);
  assert.deepEqual(compareRoadmaps({roadmap: "Original"}, {roadmap: "Original"}), {changes: [], roadmapChanged: false});
});

test("rejects case-insensitive duplicate phase or milestone names", () => {
  assert.equal(releaseFields.safeParse({name: "Example", phases: ["Build", " build "], milestones: []}).success, false);
  assert.equal(releaseFields.safeParse({name: "Example", phases: [], milestones: ["Launch", "launch"]}).success, false);
});
