import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const temp=await mkdtemp(join(process.cwd(),'.test-recovery-'));
after(()=>rm(temp,{recursive:true,force:true}));
const output=join(temp,'page.mjs');
await build({entryPoints:['app/page.tsx'],outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'page-boundaries',setup(b){
 b.onResolve({filter:/lib\/auth$|components\/(neon-sign-in|auth-shell|verify-email|workspace)$|^next\/server$/},a=>({path:a.path,namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path.endsWith('lib/auth')?'export const neonAuth=()=>({});export const auth=()=>{throw new Error("Recovery must precede session access")};':a.path==='next/server'?'export const connection=async()=>{};':a.path.endsWith('auth-shell')?'export const AuthShell=({children})=>children;':'export const NeonSignIn=()=>"PASSWORD_FORM";export const NeonSignOut=()=>null;export const VerifyEmail=()=>null;export default ()=>"WORKSPACE";'}));
}}]});
const {default:Page}=await import(pathToFileURL(output));
test('reset token opens password form before existing-session workspace routing',async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({token:'test-reset-token'})}));
 assert.match(html,/Set your password/);assert.match(html,/PASSWORD_FORM/);assert.doesNotMatch(html,/WORKSPACE/);
});
test('invalid recovery callback offers a new setup link before session routing',async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({error:'INVALID_TOKEN'})}));
 assert.match(html,/invalid or expired/);assert.match(html,/PASSWORD_FORM/);
});
