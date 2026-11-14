"use client";
import { createAuthClient } from "@neondatabase/auth/next";
import { useEffect, useState } from "react";

const auth = createAuthClient();

export default function Connect() {
  const [stage, setStage] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void auth.getSession().then(({data}) => {
      setStage(data?.user ? (window.location.pathname.endsWith("/consent") ? "consent" : "continue") : "login");
    }).catch(() => setError("Could not check your session."));
  }, []);
  async function act(action: () => Promise<{error?: unknown}>) {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result.error) setError("Authorization failed. Restart the connection in Codex.");
    } catch {setError("Authorization could not be completed.");}
    finally {setBusy(false);}
  }
  return <main className="welcome"><h1>Connect ProjectKanban</h1>
    {stage === "login" && <form onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      void act(async () => {
        const result = await auth.signIn.email({email: String(values.get("email")), password: String(values.get("password"))});
        return result.error ? result : auth.oauth2.continue({selected: true});
      });
    }}><label>Email<input name="email" type="email" autoComplete="username" required/></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
      <button className="primary" disabled={busy}>Sign in</button></form>}
    {stage === "continue" && <button className="primary" disabled={busy} onClick={() => void act(() => auth.oauth2.continue({selected: true}))}>Continue</button>}
    {stage === "consent" && <><p>Allow the requesting app to read, create, and move cards in the board linked to this connection?</p>
      <button className="primary" disabled={busy} onClick={() => void act(() => auth.oauth2.consent({accept: true}))}>Allow</button>
      <button className="secondary" disabled={busy} onClick={() => void act(() => auth.oauth2.consent({accept: false}))}>Deny</button></>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
