export function emailIsAllowed(email: string | null | undefined, verified: boolean, configured: string | undefined) {
  if (!email || !verified) return false;
  return (configured ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export function blockedAuthPath(path: string[]) {
  const route = path.join("/").toLowerCase();
  return route === "sign-up" || route.startsWith("sign-up/") || route === "sign-in/social";
}
