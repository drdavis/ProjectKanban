import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {canClaim,claimIsActive,nextDueDate,workFields,dateOnly} from '../lib/collaboration.ts';
import {validSignature,deliveryFromWebhook} from '../lib/delivery.ts';
test('claims distinguish active owners, expired and released work',()=>{
 const now=Date.parse('2026-11-24T12:00:00Z'),claim={actor:'codex-A',expiresAt:'2026-11-24T12:30:00Z'};
 assert.equal(canClaim(claim,'claude-B',now),false);assert.equal(canClaim(claim,'codex-A',now),true);
 assert.equal(canClaim(claim,'claude-B',now+1800001),true);assert.equal(claimIsActive({...claim,released:true},now),false);
});
test('calendar recurrence advances dates without DST or month-end drift',()=>{
 assert.equal(nextDueDate('2026-12-31',1),'2027-01-01');assert.equal(nextDueDate('2028-02-28',1),'2028-02-29');
 assert.equal(nextDueDate('2026-03-07',1),'2026-03-08');assert.equal(dateOnly.safeParse('2026-02-30').success,false);
 assert.equal(workFields.safeParse({recurrenceDays:0}).success,false);
});
test('webhook signatures reject altered payloads and mismatched signatures',()=>{
 const raw='{"test":true}',secret='local-test-only-not-a-real-secret';
 for(const provider of ['github','vercel']){
  const sig=(provider==='github'?'sha256=':'')+createHmac(provider==='github'?'sha256':'sha1',secret).update(raw).digest('hex');
  assert.equal(validSignature(raw,secret,sig,provider),true);assert.equal(validSignature(raw+' ',secret,sig,provider),false);assert.equal(validSignature(raw,secret,'x',provider),false);
 }
});
test('delivery mapping retains commit identity and does not call a merge a test',()=>{
 const id=crypto.randomUUID(),sha='a'.repeat(40),merge='b'.repeat(40);
 const data=deliveryFromWebhook('github','pull_request',{repository:{full_name:'Example/App'},action:'closed',number:1,pull_request:{head:{sha},merge_commit_sha:merge,body:'Implements PK:'+id,html_url:'https://github.com/example/app/pull/1',merged:true}});
 assert.equal(data.state,'merged');assert.equal(data.commit,sha);assert.equal(data.mergeCommit,merge);assert.deepEqual(data.cardIds,[id]);
 const deployment=deliveryFromWebhook('vercel','deployment.succeeded',{payload:{project:{id:'prj_example'},target:'production',deployment:{url:'example.vercel.app',meta:{githubCommitSha:merge}}}});
 assert.equal(deployment.kind,'production');assert.equal(deployment.state,'deployed');assert.equal(deployment.commit,merge);
});
