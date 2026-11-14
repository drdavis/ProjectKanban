import { auth } from "../../../lib/auth";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { database } from "../../../lib/db";
import { memberFields } from "../../../lib/member-fields";
import { activity, productMembers, products } from "../../../lib/schema";

export async function GET(request: Request) {
  const {userId} = await auth();
  if (!userId) return Response.json({error: "Sign in to continue."}, {status: 401});
  const id = z.uuid().safeParse(new URL(request.url).searchParams.get("product"));
  if (!id.success) return Response.json({error: "Invalid product."}, {status: 400});
  const db = database();
  const [owned] = await db.select({id: products.id}).from(products).where(and(eq(products.id, id.data), eq(products.owner, userId)));
  if (!owned) return Response.json({error: "Product not found."}, {status: 404});
  const members = await db.select().from(productMembers).where(eq(productMembers.productId, id.data)).orderBy(asc(productMembers.userId));
  return Response.json({members, userId});
}

export async function POST(request: Request) {
  const {userId} = await auth();
  if (!userId) return Response.json({error: "Sign in to continue."}, {status: 401});
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return Response.json({error: "Invalid origin."}, {status: 403});
  const parsed = memberFields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({error: "Enter a valid Neon Auth user ID and role."}, {status: 400});
  const input = parsed.data;
  const db = database();
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(and(eq(products.id, input.productId), eq(products.owner, userId))).for("update");
    if (!product) return Response.json({error: "Product not found."}, {status: 404});
    if (input.userId === userId) return Response.json({error: "The owner already has access."}, {status: 400});
    if (input.role === "remove") {
      await tx.delete(productMembers).where(and(eq(productMembers.productId, product.id), eq(productMembers.userId, input.userId)));
    } else {
      await tx.insert(productMembers).values({...input, role: input.role}).onConflictDoUpdate({
        target: [productMembers.productId, productMembers.userId], set: {role: input.role},
      });
    }
    await tx.insert(activity).values({productId: product.id, actor: userId, action: "Product access updated", after: input});
    return Response.json({ok: true});
  });
}
