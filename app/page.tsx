import { auth, neonAuth } from "../lib/auth";
import { NeonSignIn, NeonSignOut } from "../components/neon-sign-in";
import { connection } from "next/server";
import { AuthShell } from "../components/auth-shell";
import { VerifyEmail } from "../components/verify-email";
import Workspace from "../components/workspace";

function Welcome({children}: {children: React.ReactNode}) {
  return <AuthShell>{children}<a className="auth-preview" href="/preview">Explore the sample workspace →</a></AuthShell>;
}

export default async function Page() {
  await connection();
  if (!neonAuth()) {
    return <Welcome><p>Configure Neon Auth to sign in to ProjectKanban.</p></Welcome>;
  }
  const {userId} = await auth();
  const session = !userId ? await neonAuth()!.getSession() : null;
  if (!userId && session?.data?.user) {
    const user = session.data.user;
    return <Welcome>{!user.emailVerified ? <VerifyEmail email={user.email}/> : <><h1>Your account is ready</h1><p>No boards are assigned to this email yet. Ask the board owner to invite {user.email}.</p></>}<NeonSignOut/></Welcome>;
  }
  return userId
    ? <Workspace userId={userId} account={<NeonSignOut/>}/>
    : <Welcome><h1>Welcome back</h1><p>Sign in to your boards. New here? Open your invitation email to create an account.</p><NeonSignIn/></Welcome>;
}
