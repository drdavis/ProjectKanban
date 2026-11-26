import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const temp=await mkdtemp(join(process.cwd(),'.test-task-ui-'));
const output=join(temp,'ui.mjs');
await build({entryPoints:['components/task-workspace.tsx'],outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent'});
const {TaskWorkspace}=await import(pathToFileURL(output));
const {defaultTaskBoard}=await import('../lib/task-board.ts');
after(()=>rm(temp,{recursive:true,force:true}));
test('human view renders client context and excludes software board names',()=>{
 const markup=renderToStaticMarkup(React.createElement(TaskWorkspace,{cards:[{id:'task',title:'Send client report',kind:'development',status:'Backlog',responsible:'Kris',execution:{work:{client:'Acme',agency:'D3'}}}],config:defaultTaskBoard,productId:'board',userId:'member',canEdit:true,busy:false,preview:true,open:()=>{},move:async()=>{},assign:async()=>{},quickAdd:async()=>{},bulk:async()=>{},classify:async()=>{}}));
 assert.match(markup, /<button[^>]*type="submit"[^>]*>Quick add<\/button>/);
 assert.ok(markup.includes('Acme'));assert.ok(markup.includes('D3'));assert.ok(markup.includes('Send client report'));assert.ok(markup.includes('Awaiting approval'));
 assert.equal(markup.includes('Bug Fixes'),false);assert.equal(markup.includes('Development'),false);assert.equal(markup.includes('Verification evidence'),false);
});

test('invitation action renders a submit button rather than an inert shared button',async()=>{
 const file=join(temp,'invitations.mjs');
 await build({entryPoints:['components/invitations.tsx'],outfile:file,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent'});
 const {Invitations}=await import(pathToFileURL(file));
 const markup=renderToStaticMarkup(React.createElement(Invitations,{productId:'board'}));
 const form=markup.match(/<form[\s\S]*?<\/form>/)?.[0];assert.ok(form);
 assert.match(form,/<button[^>]*type="submit"[^>]*>Create link only<\/button>/);
});

// Human collaborators keep task coordination without software delivery controls.
test('human card details keep discussion and hide software-only controls',async()=>{
 const file=join(temp,'details.mjs');
 await build({entryPoints:['components/work-details.tsx'],outfile:file,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent'});
 const {WorkDetails}=await import(pathToFileURL(file));
 const props={productId:'board',card:{id:'task',execution:{}},refresh:async()=>{}};
 const human=renderToStaticMarkup(React.createElement(WorkDetails,{...props,taskMode:true}));
 const software=renderToStaticMarkup(React.createElement(WorkDetails,{...props,taskMode:false}));
 for(const label of ['Discussion','Due date','Checklist'])assert.ok(human.includes(label),label);
 for(const label of ['Agent delegation and handoff','Delivery evidence','Intake decision']){assert.ok(!human.includes(label),label);assert.ok(software.includes(label),label);}
});
