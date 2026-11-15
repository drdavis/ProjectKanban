import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAttachment,maxAttachmentBytes} from '../lib/attachment-files.ts';
import {qualityPolicyFields,exceptionCanWaive} from '../lib/quality-policy.ts';
import {qualityIssues,executionFields} from '../lib/card-quality.ts';
import {publishedPlan} from '../lib/planning.ts';
import {assignmentIsValid} from '../lib/roadmap.ts';

test('attachments reject unsupported active content, fake images and oversized files',()=>{
  const text=new TextEncoder().encode('<script>alert(1)</script>');
  assert.throws(()=>validateAttachment('page.html',text));
  assert.throws(()=>validateAttachment('image.png',text));
  assert.throws(()=>validateAttachment('vector.svg',text));
  assert.throws(()=>validateAttachment('large.txt',new Uint8Array(maxAttachmentBytes+1)));
  assert.throws(()=>validateAttachment('empty.txt',new Uint8Array()));
  assert.throws(()=>validateAttachment('binary.txt',new Uint8Array([255,0])));
  assert.equal(validateAttachment('notes.md',text).type,'text/plain; charset=utf-8');
  assert.equal(validateAttachment('../notes.txt',text).name,'.._notes.txt');
  assert.equal(validateAttachment('shot.png',new Uint8Array([137,80,78,71,13,10,26,10,0])).type,'image/png');
});
test('quality policy relaxes readiness details but never passing completion evidence',()=>{
  const card={kind:'development',status:'Ready',criteria:'Observable outcome',execution:executionFields.parse({testPlan:'Exercise outcome',brief:{}})};
  assert.ok(qualityIssues(card).includes('Problem to solve'));
  const policy=qualityPolicyFields.parse({requireStructuredBrief:false});
  assert.deepEqual(qualityIssues(card,'Ready',policy),[]);
  assert.ok(qualityIssues(card,'Done',policy).includes('Passing test result'));
  assert.ok(qualityIssues(card,'Done',policy).includes('Verification evidence'));
});
test('owner exceptions require policy opt-in and rationale and cannot waive closure evidence',()=>{
  const reason='Accepted for a time-boxed spike; revisit before review.';
  assert.equal(exceptionCanWaive(['Scope'],qualityPolicyFields.parse({}),reason),false);
  const policy=qualityPolicyFields.parse({allowOwnerExceptions:true});
  assert.equal(exceptionCanWaive(['Scope'],policy,'short'),false);
  assert.equal(exceptionCanWaive(['Scope'],policy,reason),true);
  for(const issue of ['Passing test result','Verification evidence','Regression test evidence','Fix summary']) assert.equal(exceptionCanWaive([issue],policy,reason),false);
});
test('published plans retain release assignments and test plans with legacy draft compatibility',()=>{
  const id=crypto.randomUUID();
  const plan=publishedPlan.parse({requestId:id,roadmap:'A reviewed roadmap',release:{name:'First release',phases:['Build'],milestones:['Pilot']},cards:[{title:'Deliver slice',description:'Outcome',criteria:'Expected result',testPlan:'Run a scenario',phase:'Build',milestone:'Pilot'}]});
  assert.equal(plan.cards[0].testPlan,'Run a scenario');
  assert.equal(assignmentIsValid({releaseId:id,phase:plan.cards[0].phase,milestone:plan.cards[0].milestone},[{id,...plan.release}]),true);
  assert.equal(assignmentIsValid({releaseId:id,phase:'Not in release'},[{id,...plan.release}]),false);
  const legacy=publishedPlan.parse({requestId:id,roadmap:'Older draft',cards:[{title:'Old',description:'Old context',criteria:'Old criteria'}]});
  assert.equal(legacy.cards[0].testPlan,'');
});

import {plannerExecutionIsSafe} from '../lib/planner-safety.ts';
test('AI proposals cannot invent approvals, passing tests or bug resolution facts',()=>{
  const pending=executionFields.parse({approach:'Investigate'});
  assert.equal(plannerExecutionIsSafe(pending),true);
  assert.equal(plannerExecutionIsSafe({...pending,result:'Passed'}),false);
  assert.equal(plannerExecutionIsSafe({...pending,evidence:'Imaginary test output'}),false);
  assert.equal(plannerExecutionIsSafe({...pending,approved:true}),false);
  const verified=executionFields.parse({result:'Passed',evidence:'Recorded actual result',approved:true,approach:'Reviewed plan'});
  assert.equal(plannerExecutionIsSafe(verified,verified),true);
  assert.equal(plannerExecutionIsSafe({...verified,approach:'Different plan'},verified),false);
  assert.equal(plannerExecutionIsSafe(executionFields.parse({bug:{fixSummary:'Pretend fix'}})),false);
});
