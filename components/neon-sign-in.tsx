"use client";
import { createAuthClient } from "@neondatabase/auth/next";
import { useEffect, useState } from "react";
import { authErrorMessage } from "../lib/auth-error";

const client = createAuthClient();

export function NeonSignIn({initialEmail = ""}: {initialEmail?: string}) {
  const [mode, setMode] = useState<"sign-in" | "request" | "reset">("sign-in");
  useEffect(() => { if (new URLSearchParams(window.location.search).has("token")) setMode("reset"); }, []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="auth-form" onSubmit={async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "request") {
        const result = await client.requestPasswordReset({email: String(data.get("email")), redirectTo: window.location.origin + "/"});
        if (result.error) setError(authErrorMessage(result.error, mode));
        else setMessage("If the account is eligible, check your email for a password setup link.");
        return;
      }
      if (mode === "reset") {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) {setError("Request a new password setup link."); return;}
        const result = await client.resetPassword({token, newPassword: String(data.get("password"))});
        if (result.error) setError(authErrorMessage(result.error, mode));
        else {setMode("sign-in");window.history.replaceState(null,"","/");setMessage("Password saved. Sign in below to continue.");}
        return;
      }
      const result = await client.signIn.email({email: String(data.get("email")), password: String(data.get("password"))});
      if (result.error) setError(authErrorMessage(result.error, mode));
      else window.location.assign("/");
    } catch (error) {setError(authErrorMessage(error, mode));}
    finally {setBusy(false);}
  }}>
    {mode !== "reset" && <label>Email<input name="email" defaultValue={initialEmail} type="email" autoComplete="username" required/></label>}
    {mode !== "request" && <label>Password<input name="password" type="password" autoComplete={mode === "reset" ? "new-password" : "current-password"} minLength={mode === "reset" ? 8 : undefined} required/></label>}
    <button className="primary" disabled={busy}>{mode === "reset" ? "Set password" : mode === "request" ? "Send setup link" : "Sign in"}</button>
    {mode !== "reset" && <button type="button" className="secondary" disabled={busy} onClick={() => {
      setMode(mode === "request" ? "sign-in" : "request"); setError(""); setMessage("");
    }}>{mode === "request" ? "Back to sign in" : "Set or reset password"}</button>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </form>;
}

export function NeonSignOut() {
  return <button className="secondary" onClick={async () => {
    const result = await client.signOut();
    if (!result.error) window.location.assign("/");
  }}>Sign out</button>;
}
