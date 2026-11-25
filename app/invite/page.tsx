'use client';
import {useEffect,useState} from 'react';
import {AuthShell} from '../../components/auth-shell';
import {VerifyEmail} from '../../components/verify-email';
import {NeonSignIn} from '../../components/neon-sign-in';
import {signupErrorMessage} from '../../lib/signup-error';
type Invite={email?:string;name?:string;board:string;accepted?:boolean};
export default function InvitePage(){
 const [token,setToken]=useState(''),[invite,setInvite]=useState<Invite|null>(null),[mode,setMode]=useState<'loading'|'create'|'signin'|'verify'|'invalid'>('loading'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const value=window.location.hash.slice(1);setToken(value);let active=true;
 fetch('/api/invitations/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:value})}).then(async response=>{const data=await response.json();if(!active)return;if(!response.ok){setError(data.error);setMode('invalid');return;}setInvite(data);setMode(data.accepted?'signin':'create');}).catch(()=>{if(active){setError('We could not check this invitation. Please reload to try again.');setMode('invalid');}});return()=>{active=false;};},[]);
 return <AuthShell>{mode==='loading'?<p role="status">Checking your invitation…</p>:mode==='invalid'?<><h1>Let’s get you a new link</h1><p role="alert" className="auth-error">{error}</p><a href="/">Already joined? Sign in</a></>:mode==='verify'&&invite?.email?<VerifyEmail email={invite.email}/>:<>
 <span className="auth-eyebrow">You’re invited</span><h1>{invite?.board}</h1><p>Join your team’s board. Your invitation gives you access to this board only.</p>
 <div className="auth-tabs"><button type="button" aria-pressed={mode==='create'} disabled={invite?.accepted} onClick={()=>{setMode('create');setError('');}}>Create account</button><button type="button" aria-pressed={mode==='signin'} onClick={()=>{setMode('signin');setError('');}}>Sign in</button></div>
 {mode==='signin'?<NeonSignIn initialEmail={invite?.email}/>:<form className="auth-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');const values=new FormData(event.currentTarget);try{const response=await fetch('/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json','X-Invitation-Token':token},body:JSON.stringify({name:values.get('name'),email:invite?.email,password:values.get('password'),callbackURL:window.location.origin+'/'})});const detail=await response.json().catch(()=>null);if(response.ok)setMode('verify');else setError(signupErrorMessage(response.status,detail));}catch{setError('We could not reach the sign-up service. Please try again.');}finally{setBusy(false);}}}>
 <label>Your name<input name="name" defaultValue={invite?.name} maxLength={100} required autoComplete="name"/></label><label>Invited email<input value={invite?.email??''} readOnly type="email" autoComplete="email"/></label><label>Create a password<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" aria-describedby="password-help"/></label><p id="password-help" className="auth-help">Use at least 12 characters.</p><button className="primary" disabled={busy}>{busy?'Creating your account…':'Create account & continue'}</button>
 {error&&<p role="alert" className="auth-error">{error}</p>}</form>}
 </>}</AuthShell>;
}
