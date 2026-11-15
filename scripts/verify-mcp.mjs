// Run against an explicitly chosen test product. Never prints credentials.
import assert from 'node:assert/strict';
const url=process.env.PROJECTKANBAN_MCP_URL;
const token=process.env.PROJECTKANBAN_MCP_TOKEN;
const productId=process.env.PROJECTKANBAN_TEST_PRODUCT_ID;
if(!url||!token||!productId)throw new Error('Set PROJECTKANBAN_MCP_URL, PROJECTKANBAN_MCP_TOKEN and PROJECTKANBAN_TEST_PRODUCT_ID for a dedicated test product.');
let sequence=0;
async function call(name,args={}){
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({jsonrpc:'2.0',id:++sequence,method:'tools/call',params:{name,arguments:args}})});
 if(!response.ok)throw new Error(`MCP HTTP ${response.status}`);
 const payload=await response.json();
 if(payload.error)throw new Error(payload.error.message);
 const message=payload.result.content[0].text;
 return payload.result.isError?{error:message}:JSON.parse(message);
}
const product=await call('get_product');
assert.equal(product.id,productId,'Token must select the explicitly chosen test product');
assert.equal(product.permissions.write,true);
await call('get_workflow');
const requestId=crypto.randomUUID();
const fields={board:'development',title:`MCP acceptance check ${new Date().toISOString()}`,requestId,expectedRevision:product.revision,acceptanceCriteria:'Round-trip, retry, conflict and completion gates behave as expected.'};
const created=await call('create_card',fields);assert.ok(created.id,created.error);
const replay=await call('create_card',fields);assert.equal(replay.id,created.id);assert.equal(replay.replayed,true);
assert.ok((await call('create_card',{...fields,title:'Changed retry'})).error);
assert.ok((await call('update_card',{cardId:created.id,expectedRevision:product.revision,fields:{description:'Stale write'}})).error);
let current=await call('get_product');
assert.ok((await call('move_card',{cardId:created.id,status:'Done',expectedRevision:current.revision})).error);
let updated=await call('update_card',{cardId:created.id,expectedRevision:current.revision,fields:{execution:{brief:{problem:'Verify this MCP connection',outcome:'The lifecycle behaves correctly',scope:'This test card only'},testPlan:'Read/write round-trip; identical retry; changed retry rejection; stale update rejection; completion gate rejection.',result:'Pending'}}});
assert.ok(!updated.error,updated.error);
let card=await call('get_card',{cardId:created.id});assert.match(card.execution.brief.problem,/MCP/);
updated=await call('update_card',{cardId:created.id,expectedRevision:card.revision,fields:{execution:{result:'Passed',evidence:`verify-mcp.mjs passed round-trip, identical retry, changed retry rejection, stale revision rejection and premature completion rejection at ${new Date().toISOString()}.`}}});assert.ok(!updated.error,updated.error);
const closed=await call('move_card',{cardId:created.id,status:'Done',expectedRevision:updated.revision});assert.ok(!closed.error,closed.error);
card=await call('get_card',{cardId:created.id});assert.equal(card.status,'Done');
console.log(`MCP lifecycle checks passed. Test card retained for audit: ${created.id}`);
