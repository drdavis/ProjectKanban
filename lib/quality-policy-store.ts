import { and, desc, eq } from "drizzle-orm";
import { activity } from "./schema";
import type { database } from "./db";
import { qualityPolicyFields } from "./quality-policy";
type Transaction=Parameters<Parameters<ReturnType<typeof database>["transaction"]>[0]>[0];
export async function readQualityPolicy(tx:Transaction,productId:string){
  const [record]=await tx.select({after:activity.after}).from(activity).where(and(eq(activity.productId,productId),eq(activity.action,"Changed quality policy"))).orderBy(desc(activity.createdAt),desc(activity.id)).limit(1);
  return qualityPolicyFields.parse(record?.after??{});
}
