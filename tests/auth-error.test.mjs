import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAuthClient} from '@neondatabase/auth/next';
import {authErrorMessage} from '../lib/auth-error.ts';

test('real Neon client credential exceptions produce actionable credential feedback', async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({message:'Invalid email or password',code:'INVALID_EMAIL_OR_PASSWORD'}),{status:401,headers:{'content-type':'application/json'}});
 try {
  await assert.rejects(createAuthClient().signIn.email({email:'diagnostic@example.invalid',password:'test'}),error=>{
   assert.equal(error.status,401);
   assert.match(authErrorMessage(error,'sign-in'),/Email or password was not accepted/);
   return true;
  });
 } finally {globalThis.fetch=original;}
});
test('auth feedback distinguishes provider, rate limit, domain and reset failures without exposing raw errors',()=>{
 assert.match(authErrorMessage({status:503},'sign-in'),/temporarily unavailable/);
 assert.match(authErrorMessage({status:429},'sign-in'),/Too many attempts/);
 assert.match(authErrorMessage({status:403},'sign-in'),/domain configuration/);
 assert.match(authErrorMessage({code:'email_not_verified'},'sign-in'),/Verify your email/);
 assert.match(authErrorMessage({status:400},'reset'),/new setup link/);
 assert.match(authErrorMessage(new Error('sensitive provider detail'),'sign-in'),/Check your connection/);
});
