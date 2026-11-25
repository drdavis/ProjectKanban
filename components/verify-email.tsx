'use client';
import {useState} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
const client=createAuthClient();
export function VerifyEmail({email}:{email:string}){
 const [busy,setBusy]=useState(false),[code,setCode]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 return <div className="auth-flow"><span className="auth-eyebrow">Confirm your email</span><h1>One last step</h1><p>Verify <strong>{email}</strong> to open your invited board.</p><p>Enter the six-digit code from the ProjectKanban verification email sent by Neon Auth. The code expires after 10 minutes.</p>
 <form className="auth-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await client.emailOtp.verifyEmail({email,otp:code});if(result.error)throw result.error;window.location.assign('/');}catch{setError('That code could not be verified. Check the code or request a new one.');}finally{setBusy(false);}}}>
 <label htmlFor="verification-code">Verification code</label><input id="verification-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} required placeholder="123456"/>
 <button className="primary" disabled={busy||code.length!==6}>{busy?'Please wait…':'Verify and open board'}</button></form>
 <button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');setMessage('');try{const result=await client.emailOtp.sendVerificationOtp({email,type:'email-verification'});if(result.error)throw result.error;setMessage('A new code was requested. Check your inbox and spam folder.');}catch{setError('We could not request a new code. Wait a moment and try again.');}finally{setBusy(false);}}}>Send a new code</button>
 {message&&<p role="status" className="auth-notice">{message}</p>}{error&&<p role="alert" className="auth-error">{error}</p>}
 </div>;
}
