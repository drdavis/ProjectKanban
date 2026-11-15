import assert from "node:assert/strict";
import { test } from "node:test";
import { executionFields, briefFields, bugFields, qualityIssues, mergeExecution } from "../lib/card-quality.ts";
import { updateArgs, createArgs, roadmapArgs } from "../lib/mcp-inputs.ts";
import { handleMcpRequest } from "../lib/mcp-protocol.ts";

const development = () => ({kind:"development",status:"Backlog",criteria:"A viewer can find their own document.",execution:executionFields.parse({
  brief:{problem:"Cannot find documents",outcome:"Find a document",scope:"Search current product"},
  testPlan:"Search for a known document; verify another product's document is absent.",
})});
const bug = () => ({kind:"bug",status:"Reported",criteria:"Saving preserves the entered title after reload.",severity:"Major",execution:executionFields.parse({
  bug:{affectedVersion:"1.0",environment:"Test browser",steps:"1. Edit title. 2. Save. 3. Reload.",expected:"Saved title",actual:"Old title",impact:"Edits lost",reproduction:"Confirmed"},
  testPlan:"Repeat reported steps with a unique title and reload.",
})});

test("intake accepts incomplete reports but starting requires actionable information",()=>{
  assert.deepEqual(qualityIssues({kind:"bug",status:"Reported",criteria:""}),[]);
  assert.ok(qualityIssues({kind:"bug",status:"Ready to Fix",criteria:"",execution:executionFields.parse({bug:{}})}).includes("Reproduction steps"));
  assert.deepEqual(qualityIssues(development(),"Ready"),[]);
  const missing=development(); missing.execution.brief.scope="";
  assert.ok(qualityIssues(missing,"Ready").includes("Scope"));
});

test("passing build status alone cannot close a development card",()=>{
  const card=development();card.execution.result="Passed";
  assert.ok(qualityIssues(card,"Done").includes("Verification evidence"));
  card.execution.evidence="Functional test: search returned own document and excluded other product; run 12.";
  assert.deepEqual(qualityIssues(card,"Done"),[]);
  card.execution.result="Failed";
  assert.ok(qualityIssues(card,"Done").includes("Passing test result"));
});

test("bug closure requires fix findings, regression evidence and a fixed-in release",()=>{
  const card=bug();assert.deepEqual(qualityIssues(card,"Ready to Fix"),[]);
  card.execution.result="Passed";card.execution.evidence="Reproduced and retested original steps.";
  assert.ok(qualityIssues(card,"Closed").includes("Regression test evidence"));
  Object.assign(card.execution.bug,{rootCause:"Stale update payload",fixSummary:"Persist current title",regressionTest:"Save/reload integration passed",fixedIn:"1.1"});
  assert.deepEqual(qualityIssues(card,"Closed"),[]);
  card.execution.bug.reproduction="Not reproduced";
  assert.ok(qualityIssues(card,"Closed").includes("Investigation evidence for unreproduced bug"));
});

test("plan approval and whitespace validation are enforced",()=>{
  const card=development();card.execution.planningRequired=true;
  card.execution.approved=true;card.execution.approach=" ";
  assert.ok(qualityIssues(card,"In Progress").includes("Reviewed implementation plan"));
  card.criteria="  ";assert.ok(qualityIssues(card,"Ready").includes("Acceptance criteria"));
});

test("nested partial edits preserve evidence and unrelated report fields",()=>{
  const before=bug().execution;before.evidence="Original log";
  const after=mergeExecution(before,{bug:{impact:"All editors affected"}});
  assert.equal(after.bug.steps,before.bug.steps);assert.equal(after.evidence,"Original log");
  assert.equal(after.bug.impact,"All editors affected");
  assert.throws(()=>mergeExecution(before,{unknown:"unsupported"}));
});

test("MCP schemas reject scope injection, incomplete updates and unreviewed roadmaps",()=>{
  const cardId=crypto.randomUUID();
  assert.equal(updateArgs.safeParse({cardId,expectedRevision:0,fields:{}}).success,false);
  assert.equal(updateArgs.safeParse({cardId,expectedRevision:0,fields:{owner:"other"}}).success,false);
  assert.equal(updateArgs.safeParse({cardId,fields:{description:"change"}}).success,false);
  assert.equal(createArgs.safeParse({board:"bug",title:"Issue",productId:crypto.randomUUID()}).success,false);
  assert.equal(roadmapArgs.safeParse({requestId:crypto.randomUUID(),expectedRevision:0,roadmap:"plan",reviewed:false}).success,false);
});

test("MCP roadmap tools are independently scoped and expose workflow guidance",async()=>{
  let updates=0;
  const readers={listCards:async()=>[],getCard:async()=>null,getProduct:async()=>({revision:3,name:"Fictional"})};
  const call=async(name,args,writers)=>{
    const response=await handleMcpRequest(new Request("https://example.test/api/mcp",{method:"POST",body:JSON.stringify({jsonrpc:"2.0",id:1,method:name==="tools/list"?name:"tools/call",params:{name,arguments:args}})}),readers,writers);
    return response.json();
  };
  const writer={create:async()=>({}),move:async()=>({}),update:async()=>{updates++;return {ok:true};}};
  assert.equal((await call("tools/list",{},writer)).result.tools.some(t=>t.name==="update_roadmap"),false);
  assert.equal((await call("update_roadmap",{},writer)).result.isError,true);
  assert.equal((await call("update_card",{cardId:crypto.randomUUID(),expectedRevision:3,fields:{description:"Changed"}})).result.isError,true);
  assert.equal(updates,0);
  await call("update_card",{cardId:crypto.randomUUID(),expectedRevision:3,fields:{description:"Changed"}},writer);
  assert.equal(updates,1);
  assert.match((await call("get_workflow",{})).result.content[0].text,/does not run in the background/);
  assert.equal((await call("get_product",{})).result.content[0].text.includes('"revision":3'),true);
});


test("parsed MCP patches preserve omitted plans, approvals, blockers and nested details",()=>{
  const before=bug().execution;
  before.planningRequired=true;before.approved=true;before.approach="Reviewed investigation";
  before.blockers=[crypto.randomUUID()];before.evidence="Existing evidence";
  const parsed=updateArgs.parse({cardId:crypto.randomUUID(),expectedRevision:13,fields:{execution:{evidence:"New observed evidence",bug:{impact:"Updated impact"}}}});
  assert.deepEqual(Object.keys(parsed.fields.execution).sort(),["bug","evidence"]);
  assert.deepEqual(parsed.fields.execution.bug,{impact:"Updated impact"});
  const after=mergeExecution(before,parsed.fields.execution);
  assert.equal(after.testPlan,before.testPlan);
  assert.equal(after.approved,true);assert.equal(after.approach,before.approach);
  assert.deepEqual(after.blockers,before.blockers);
  assert.equal(after.bug.steps,before.bug.steps);
  assert.equal(after.bug.reproduction,"Confirmed");
  assert.equal(after.evidence,"New observed evidence");
  const brief=updateArgs.parse({cardId:crypto.randomUUID(),expectedRevision:13,fields:{execution:{brief:{scope:"Changed scope"}}}});
  assert.deepEqual(brief.fields.execution,{brief:{scope:"Changed scope"}});
  assert.doesNotThrow(()=>JSON.stringify(createArgs));
});
