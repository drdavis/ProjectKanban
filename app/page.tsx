import { auth, neonAuth } from "../lib/auth";
import { NeonSignIn, NeonSignOut } from "../components/neon-sign-in";
import { connection } from "next/server";
import { AuthShell } from "../components/auth-shell";
import { VerifyEmail } from "../components/verify-email";
import Workspace from "../components/workspace";

function Welcome({children}: {children: React.ReactNode}) {
  return <AuthShell>{children}<a className="auth-preview" href="/preview">Explore the sample workspace →</a></AuthShell>;
}

export default async function Page({searchParams}: {searchParams: Promise<{token?:string;error?:string;signedOut?:string}>}) {
  await connection();
  if (!neonAuth()) {
    return <Welcome><p>Configure Neon Auth to sign in to ProjectKanban.</p></Welcome>;
  }
  const query = await searchParams;
  if (query.token) return <Welcome><h1>Set your password</h1><p>Choose a new password, then sign in to continue.</p><NeonSignIn/></Welcome>;
  if (query.error) return <Welcome><h1>Request a new setup link</h1><p>This password setup link is invalid or expired. Use Set or reset password below.</p><NeonSignIn/></Welcome>;
  const {userId} = await auth();
  const session = await neonAuth()!.getSession();
  if (!userId && session?.data?.user) {
    const user = session.data.user;
    return <Welcome>{!user.emailVerified ? <VerifyEmail email={user.email}/> : <><h1>Your account is ready</h1><p>No boards are assigned to this email yet. Ask the board owner to invite {user.email}.</p></>}<NeonSignOut/></Welcome>;
  }
  return userId
    ? <Workspace userId={userId} accountEmail={session?.data?.user?.email} account={<NeonSignOut/>}/>
    : <Welcome><h1>Welcome back</h1>{query.signedOut && <p role="status">Your session ended or you signed out in another tab. Sign in to continue.</p>}<p>Sign in to your boards. New here? Open your invitation email to create an account.</p><NeonSignIn/></Welcome>;
}
