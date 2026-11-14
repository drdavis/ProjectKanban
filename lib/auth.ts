import { createNeonAuth } from "@neondatabase/auth/next/server";

export function neonAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  return baseUrl && secret && secret.length >= 32
    ? createNeonAuth({baseUrl, cookies: {secret}})
    : null;
}

export async function auth() {
  const {data} = await neonAuth()?.getSession() ?? {};
  return {userId: data?.user?.id ?? null};
}
