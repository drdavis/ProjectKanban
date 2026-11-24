import {test} from 'node:test';
import assert from 'node:assert/strict';
import {qualityPolicyFields} from '../lib/quality-policy.ts';
import {qualityIssues, executionFields, mergeExecution} from '../lib/card-quality.ts';
import {updateArgs} from '../lib/mcp-inputs.ts';
const tasks=qualityPolicyFields.parse({workType:'tasks'});
test('human completion does not manufacture software verification or require technical fields',()=>{
 const execution=executionFields.parse({verificationRequired:true});
 const card={kind:'development',status:'Done',criteria:'',execution};
 assert.deepEqual(qualityIssues(card,'Done',tasks),[]);
 assert.equal(execution.result,'Pending');
 assert.ok(qualityIssues(card,'Done').includes('Passing test result'));
 assert.ok(qualityIssues({...card,kind:'bug'},'Closed',tasks).includes('Passing test result'));
 assert.equal(qualityPolicyFields.parse({}).workType,'software');
});
test('MCP task summary updates preserve other card details and cannot change board mode',()=>{
 const patch=updateArgs.parse({cardId:crypto.randomUUID(),expectedRevision:1,fields:{execution:{attachmentSummary:'Client screenshot'}}});
 const result=mergeExecution(executionFields.parse({evidence:'Historical import',testPlan:'Existing plan'}),patch.fields.execution);
 assert.equal(result.attachmentSummary,'Client screenshot');
 assert.equal(result.evidence,'Historical import');
 assert.equal(result.testPlan,'Existing plan');
 assert.equal(updateArgs.safeParse({cardId:crypto.randomUUID(),expectedRevision:1,fields:{workType:'tasks'}}).success,false);
});
