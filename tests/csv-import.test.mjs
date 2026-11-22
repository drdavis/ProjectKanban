import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,defaultMapping,previewCsv,rowIdentity,csvLimit} from '../lib/csv-import.ts';
test('Airtable quoting, BOM, multiline and escaped quotes survive parsing',()=>{
 const csv='\uFEFFName,Notes,Assignee,Status\r\n"Email, draft","Line one\nSay ""hello""",Kris,Done\r\n';
 const result=previewCsv(csv,defaultMapping(parseCsv(csv)[0]),true,true);
 assert.equal(result.rows.length,1);assert.equal(result.rows[0].description,'Line one\nSay "hello"');assert.equal(result.rows[0].status,'Done');
});
test('filters unnamed and incomplete rows; unfinished imports default to Backlog',()=>{
 const csv='Name,Status\na,Done\n,Done\nb,In Progress\nc,\n';const mapping=defaultMapping(parseCsv(csv)[0]);
 assert.equal(previewCsv(csv,mapping,true,true).skipped,3);
 assert.deepEqual(previewCsv(csv,mapping,false,false).rows.map(r=>r.status),['Backlog','Backlog','Backlog']);
});
test('malformed CSV and oversized inputs fail rather than silently shifting fields',()=>{
 for(const csv of ['Name,Name\na,b','Name,\na,b','Name,Notes\na,b,c','Name\n"oops','Name\n"ok"bad'])assert.throws(()=>parseCsv(csv));
 assert.throws(()=>parseCsv('Name\n'+ 'x'.repeat(csvLimit)));
 assert.throws(()=>parseCsv('Name\n'+ 'a\n'.repeat(501)));
});
test('long titles, attachment references and unknown columns are preserved',()=>{
 const title='x'.repeat(250),csv=`Name,Notes,Attachments,Other\n${title},note,https://example.com/file,extra`;
 const row=previewCsv(csv,defaultMapping(parseCsv(csv)[0]),false,false).rows[0];
 assert.equal(row.title.length,180);assert.ok(row.description.includes(title));assert.ok(row.description.includes('https://example.com/file'));assert.ok(row.description.includes('Other: extra'));
});
test('duplicate identity survives column reordering; changed source values are distinct',()=>{
 assert.equal(rowIdentity({Name:'a',Notes:'b'}),rowIdentity({Notes:'b',Name:'a'}));
 assert.notEqual(rowIdentity({Name:'a'}),rowIdentity({Name:'b'}));
});
test('invalid mappings and completed-only without status are rejected',()=>{
 const csv='Name\na';assert.throws(()=>previewCsv(csv,{...defaultMapping(['Name']),notes:'missing'},false,false));
 assert.throws(()=>previewCsv(csv,defaultMapping(['Name']),true,true));
});
