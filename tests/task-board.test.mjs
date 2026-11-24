import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultTaskBoard,taskBoardFields,taskStatusLabel,taskGroups} from '../lib/task-board.ts';
import {defaultMapping,previewCsv} from '../lib/csv-import.ts';
test('task labels customize display without changing canonical workflow states',()=>{
 assert.equal(taskStatusLabel('Backlog'),'To do');
 const config=taskBoardFields.parse({...defaultTaskBoard,statusLabels:{...defaultTaskBoard.statusLabels,Review:'Client review'}});
 assert.equal(taskStatusLabel('Review',config),'Client review');
 assert.equal(taskBoardFields.safeParse({...config,statusLabels:{...config.statusLabels,Done:'Client review'}}).success,false);
});
test('client groups keep identical names in separate agencies and retain unclassified work',()=>{
 const items=[{id:1,execution:{work:{client:'Acme',agency:'North'}}},{id:2,execution:{work:{client:'Acme',agency:'South'}}},{id:3,execution:null}];
 const groups=taskGroups(items,'clients');assert.equal(groups.length,3);assert.deepEqual(groups.flatMap(g=>g.items.map(c=>c.id)).sort(),[1,2,3]);
 assert.equal(taskGroups(items,'list').length,1);
});
test('CSV recognizes client and agency columns and preserves completed historical records',()=>{
 const csv='Name,Client,Agency,Status\nSend report,Acme,North,Done';const mapping=defaultMapping(['Name','Client','Agency','Status']);
 const result=previewCsv(csv,mapping,false,true);assert.equal(result.rows[0].client,'Acme');assert.equal(result.rows[0].agency,'North');assert.equal(result.rows[0].status,'Done');
});
