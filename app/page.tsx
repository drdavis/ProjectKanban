import { auth, neonAuth } from "../lib/auth";
import { NeonSignIn, NeonSignOut } from "../components/neon-sign-in";
import { connection } from "next/server";
import { Layers3 } from "lucide-react";
import Workspace from "../components/workspace";

function Welcome({children}: {children: React.ReactNode}) {
  return <main className="welcome"><Layers3 size={34}/><h1>ProjectKanban</h1>{children}<a href="/preview">Explore the sample workspace →</a></main>;
}

export default async function Page() {
  await connection();
  if (!neonAuth()) {
    return <Welcome><p>Configure Neon Auth to sign in to ProjectKanban.</p></Welcome>;
  }
  const {userId} = await auth();
  return userId
    ? <Workspace userId={userId} account={<NeonSignOut/>}/>
    : <Welcome><p>Private workspace. Sign in with an authorized account to access your products. Public registration is disabled.</p><NeonSignIn/></Welcome>;
}
