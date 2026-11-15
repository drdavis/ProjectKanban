import { readQualityPolicy } from "./quality-policy-store";
import { exceptionCanWaive } from "./quality-policy";
import { asc, eq } from "drizzle-orm";
import type { z } from "zod";
import type { database } from "./db";
import { activity, cards, products } from "./schema";
import { cardFields, executionFields, workflows } from "./workflow";
import { assignmentIsValid } from "./roadmap";
import { qualityIssues, briefFields, bugFields, executionAfterTransition } from "./card-quality";

type Transaction = Parameters<Parameters<ReturnType<typeof database>["transaction"]>[0]>[0];

export class RequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function saveCard(tx: Transaction, productId: string, actor: string, input: z.input<typeof cardFields>, cardId?: string, beforeId?: string | null, exception?: {reason:string}) {
  const fields = cardFields.parse(input);
  const legal = workflows[fields.kind];
  if (!legal.includes(fields.status)) throw new RequestError("Choose a status on the destination board.");
  if (["Done", "Closed"].includes(fields.status) && !fields.criteria) {
    throw new RequestError("Record acceptance or verification evidence before closing this card.");
  }
  const all = await tx.select().from(cards).where(eq(cards.productId, productId)).orderBy(asc(cards.position));
  const previous = all.find((card) => card.id === cardId);
  if (cardId && !previous) throw new RequestError("Card not found.", 404);
  const assignment = fields.roadmapAssignment === undefined ? previous?.roadmapAssignment ?? null : fields.roadmapAssignment;
  if (assignment) {
    const [product] = await tx.select({releases: products.releases}).from(products).where(eq(products.id, productId));
    if (!product || !assignmentIsValid(assignment, product.releases)) throw new RequestError("Choose a release, phase, and milestone from this product.");
  }
  const execution = executionAfterTransition(executionFields.parse(fields.execution ?? previous?.execution ?? {verificationRequired: true,
    ...(fields.kind === "bug" ? {bug: bugFields.parse({})} : {brief: briefFields.parse({})})}), previous?.status, fields.status);
  // Clients cannot erase an adopted brief by omitting it from a replacement plan.
  execution.brief ??= previous?.execution?.brief;
  execution.bug ??= previous?.execution?.bug;
  if (!previous || previous.kind !== fields.kind) {
    if (fields.kind === "bug") execution.bug ??= bugFields.parse({});
    else execution.brief ??= briefFields.parse({});
  }
  const policy = await readQualityPolicy(tx,productId);
  const missing = qualityIssues({...fields, execution}, fields.status, policy);
  const waived = missing.length > 0 && exceptionCanWaive(missing,policy,exception?.reason);
  if (missing.length && !waived) throw new RequestError("Before moving to " + fields.status + ", complete: " + missing.join(", ") + ".");
  const approved = execution.approved && (!!execution.approach && !!fields.criteria);
  const closed = ["Done", "Closed"];
  const verified = (plan: typeof execution | null) => !plan?.verificationRequired ||
    (plan.result === "Passed" && !!plan.testPlan && !!plan.evidence);
  const prerequisites = new Map(all.map((card) => [card.id, card]));
  for (const related of [execution.parentId, execution.bug?.duplicateOf]) {
    if (related && (related === cardId || !prerequisites.has(related))) throw new RequestError("Choose a related card from this product, other than itself.");
  }
  for (const relation of ["parentId", "duplicateOf"] as const) {
    const seen = new Set<string>(cardId ? [cardId] : []);
    let next = relation === "parentId" ? execution.parentId : execution.bug?.duplicateOf;
    while (next) {
      if (seen.has(next)) throw new RequestError("Related cards cannot form a cycle.");
      seen.add(next);
      const related = prerequisites.get(next);
      next = relation === "parentId" ? related?.execution?.parentId : related?.execution?.bug?.duplicateOf;
    }
  }
  const visited = new Set<string>();
  const pending = [...execution.blockers];
  while (pending.length) {
    const id = pending.pop()!;
    if (id === cardId) throw new RequestError("Those dependencies form a cycle.");
    if (visited.has(id)) continue;
    visited.add(id);
    const blocker = prerequisites.get(id);
    if (!blocker) throw new RequestError("Select dependencies from this product.");
    pending.push(...(blocker.execution?.blockers ?? []));
  }
  if (!["Backlog", "Reported", "Triage"].includes(fields.status)) {
    if (execution.planningRequired && !approved && !waived) throw new RequestError("Review the plan and acceptance criteria before advancing.");
    for (const id of execution.blockers) {
      const blocker = prerequisites.get(id)!;
      if (!closed.includes(blocker.status) || !verified(blocker.execution) || qualityIssues(blocker, blocker.status, policy).length) {
        throw new RequestError("Waiting for " + blocker.title + " to close with any required verification.");
      }
    }
  }
  if (closed.includes(fields.status) && !verified(execution)) {
    throw new RequestError("Add a test plan, passing result, and evidence before closing.");
  }
  const column = all.filter((card) => card.id !== cardId && card.kind === fields.kind && card.status === fields.status);
  const sameColumn = previous?.kind === fields.kind && previous.status === fields.status;
  let position = sameColumn && beforeId === undefined ? previous.position : (column.at(-1)?.position ?? 0) + 1024;
  if (beforeId) {
    const index = column.findIndex((card) => card.id === beforeId);
    if (index < 0) throw new RequestError("The destination card is no longer in that column.", 409);
    for (const [offset, card] of column.entries()) {
      const rank = (offset + (offset >= index ? 2 : 1)) * 1024;
      if (card.position !== rank) await tx.update(cards).set({position: rank}).where(eq(cards.id, card.id));
    }
    position = (index + 1) * 1024;
  }
  const values = {...fields, responsible: fields.responsible ?? previous?.responsible ?? "",
    tags: fields.tags ? [...new Set(fields.tags)] : previous?.tags ?? [], roadmapAssignment: assignment, execution: {...execution, approved}, severity: fields.kind === "bug" ? fields.severity : "", position};
  const [saved] = previous
    ? await tx.update(cards).set(values).where(eq(cards.id, previous.id)).returning()
    : await tx.insert(cards).values({...values, productId}).returning();
  if (waived) await tx.insert(activity).values({productId,actor,action:"Granted quality exception",after:{cardId:saved.id,status:fields.status,reason:exception!.reason,waived:missing}});
  await tx.insert(activity).values({productId, actor, action: previous ? "Updated card" : "Created card", before: previous, after: saved});
  return saved;
}
