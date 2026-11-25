export function authErrorMessage(error: unknown, mode: "sign-in" | "request" | "reset"): string {
  const detail = error && typeof error === "object" ? error as {status?: number; code?: string} : {};
  if (detail.status === 429) return "Too many attempts. Wait a few minutes, then try again.";
  if (detail.status && detail.status >= 500) return "The sign-in service is temporarily unavailable. Please try again shortly.";
  if (mode === "request") return "Password setup email could not be requested. Please try again shortly.";
  if (mode === "reset") return "Could not set the password. Request a new setup link and use a password of at least 8 characters.";
  if (detail.code === "email_not_verified" || detail.code === "EMAIL_NOT_VERIFIED") return "Verify your email address before signing in. Check your inbox for the verification email.";
  if (detail.status === 401 || detail.code === "invalid_credentials" || detail.code === "INVALID_EMAIL_OR_PASSWORD") return "Email or password was not accepted. Use the email address for your existing account, or choose Set or reset password.";
  if (detail.status === 403) return "Sign-in was blocked. The app's authentication domain configuration may need attention.";
  return "Could not complete sign-in. Check your connection and try again.";
}
