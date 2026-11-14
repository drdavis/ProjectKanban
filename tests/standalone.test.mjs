import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script, createContext } from "node:vm";

const html = readFileSync(new URL("../ProjectKanban-Preview.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "Standalone preview has an executable script");
new Script(script);

function fixture(values = new Map()) {
  const browser = createContext({
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    crypto,
  });
  const initialization = script.slice(0, script.indexOf("const editor ="));
  new Script(initialization).runInContext(browser);
  return (expression) => new Script(expression).runInContext(browser);
}

test("places the development cards in the next release while keeping their stage", () => {
  const run = fixture();
  assert.ok(run('cards.every((card) => card[5] === "Next Development")'));
  assert.equal(run('cards.find((card) => card[0] === "PK-02")[2]'), "Review");
  assert.equal(run('cards.find((card) => card[0] === "PK-01")[6]'), "Verify");
});

test("requires a reviewed implementation plan and acceptance criteria before progressing", () => {
  const run = fixture();
  assert.match(run('planningError("Ready", {required:true, approved:false}, "PK-02")'), /Review the implementation plan/);
  assert.equal(run('planningError("Ready", {required:true, approved:true, approach:"Steps", acceptance:"Expected outcome"}, "PK-02")'), "");
});

test("requires a passing test and evidence to close or unblock dependent work", () => {
  const run = fixture();
  assert.equal(run('canClose("Done", {required:true, result:"Passed", plan:"Steps", evidence:""})'), false);
  run('cards.find((card) => card[0] === "PK-01")[2] = "Done"');
  assert.match(run('planningError("In Progress", {blockers:["PK-01"]}, "PK-02")'), /Waiting for PK-01/);
  run('Object.assign(cards.find((card) => card[0] === "PK-01")[8], {result:"Passed", evidence:"Fixture passed"})');
  assert.equal(run('planningError("In Progress", {blockers:["PK-01"]}, "PK-02")'), "");
});

test("rejects transitive circular dependencies", () => {
  const run = fixture();
  run('cards.find((card) => card[0] === "PK-01")[9].blockers = ["PK-02"]');
  run('cards.find((card) => card[0] === "PK-02")[9].blockers = ["PK-03"]');
  assert.equal(run('hasDependencyCycle("PK-03", ["PK-01"])'), true);
  assert.equal(run('hasDependencyCycle("PK-04", ["PK-01"])'), false);
});


test("team status updates preserve locally moved cards and user descriptions", () => {
  const values = new Map();
  const first = fixture(values);
  values.delete("projectkanban-team-progress-v1");
  first(`cards.find((card) => card[0] === "PK-02")[2] = "Ready";
    const tagged = cards.find((card) => card[0] === "PK-03");
    tagged[2] = "In Progress";
    tagged[4] = "User-authored notes";
    localStorage.setItem(storageKey, JSON.stringify(cards));`);
  const reload = fixture(values);
  assert.equal(reload('cards.find((card) => card[0] === "PK-02")[2]'), "Ready");
  assert.equal(reload('cards.find((card) => card[0] === "PK-03")[2]'), "Review");
  assert.equal(reload('cards.find((card) => card[0] === "PK-03")[4]'), "User-authored notes");
});
