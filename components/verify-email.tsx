'use client';
import {useState} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
const client=createAuthClient();
export function VerifyEmail({email}:{email:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 return <div className="auth-flow"><span className="auth-eyebrow">Confirm your email</span><h1>One last step</h1><p>Your account is ready. Verify <strong>{email}</strong> to unlock your invited board.</p><p>Look for an email from ProjectKanban. Check spam too. If it hasn’t arrived, request a verification email below.</p>
 <button className="primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');setMessage('');try{const result=await client.sendVerificationEmail({email,callbackURL:window.location.origin+'/'});if(result.error)throw result.error;setMessage('Verification email requested. Open its link to continue.');}catch{setError('We could not request the verification email. Wait a moment and try again.');}finally{setBusy(false);}}}>{busy?'Requesting email…':'Send verification email'}</button>
 <button className="secondary" disabled={busy} onClick={()=>window.location.assign('/')}>I’ve verified my email — continue</button>
 {message&&<p role="status" className="auth-notice">{message}</p>}{error&&<p role="alert" className="auth-error">{error}</p>}
 <p className="auth-help">If you verified in another browser, return here and sign in with this email.</p></div>;
}
