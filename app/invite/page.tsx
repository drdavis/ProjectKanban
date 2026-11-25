'use client';
import {useState,useEffect} from 'react';
import {signupErrorMessage} from '../../lib/signup-error';
import {NeonSignIn} from '../../components/neon-sign-in';
export default function Invite(){const [token,setToken]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>setToken(window.location.hash.slice(1)),[]);
 return <main className="welcome"><h1>Join your shared board</h1><p>Use the email address your board owner invited. Existing users can sign in below. New users can create an account, then verify their email.</p>
 {token && <form onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage('');const values=new FormData(event.currentTarget);try{const response=await fetch('/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json','X-Invitation-Token':token},body:JSON.stringify({name:values.get('name'),email:values.get('email'),password:values.get('password'),callbackURL:window.location.origin+'/'})});const detail=await response.json().catch(()=>null);setMessage(response.ok?'Account created. Check your email for verification, then sign in.':signupErrorMessage(response.status,detail));}catch{setMessage('Account setup is temporarily unavailable.');}finally{setBusy(false);}}}>
 <label>Name<input name="name" maxLength={100} required autoComplete="name"/></label><label>Invited email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength={12} required autoComplete="new-password"/></label><button className="primary" disabled={busy}>Create invited account</button></form>}
 {message&&<p role="status">{message}</p>}<h2>Already have an account?</h2><NeonSignIn/></main>;
}
