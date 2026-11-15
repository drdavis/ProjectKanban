import { createNeonAuth } from "@neondatabase/auth/next/server";
import { eq } from "drizzle-orm";
import { database } from "./db";
import { products, productMembers } from "./schema";
import { emailIsAllowed } from "./access-policy";

export function neonAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  return baseUrl && secret && secret.length >= 32
    ? createNeonAuth({baseUrl, cookies: {secret}})
    : null;
}

export async function auth() {
  const {data} = await neonAuth()?.getSession() ?? {};
  const user = data?.user;
  if (!user) return {userId: null};
  if (emailIsAllowed(user.email, user.emailVerified === true, process.env.AUTH_ALLOWED_EMAILS)) return {userId: user.id};
  // Existing owners and explicitly added product members retain access. A new
  // provider account cannot bootstrap its own workspace through product.create.
  const db = database();
  const [owned] = await db.select({id: products.id}).from(products).where(eq(products.owner, user.id)).limit(1);
  if (owned) return {userId: user.id};
  const [member] = await db.select({id: productMembers.productId}).from(productMembers).where(eq(productMembers.userId, user.id)).limit(1);
  return {userId: member ? user.id : null};
}
