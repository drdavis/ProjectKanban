import { qualityPolicyFields } from "./quality-policy";
import { executionFields } from "./card-quality.ts";
import { publishedPlan } from "./planning";
import { releaseFields, roadmapAssignmentFields } from "./roadmap";
import { sampleProducts } from "./samples";
import { z } from "zod";

export const workflows = {
  development: ["Backlog", "Ready", "In Progress", "Review", "Done"],
  bug: ["Reported", "Triage", "Ready to Fix", "Fixing", "Verify", "Closed"],
};
export const kind = z.enum(["development", "bug"]);
export const priority = z.enum(["Urgent", "High", "Normal", "Low"]);
export const severity = z.enum(["", "Critical", "Major", "Moderate", "Minor"]);
export const externalLink = z.union([z.literal(""), z.url({protocol: /^https?$/})]).default("");
export { executionFields, type Execution } from "./card-quality.ts";

export const cardFields = z.object({
  kind,
  status: z.string().max(30),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(10000).default(""),
  criteria: z.string().trim().max(10000).default(""),
  priority: priority.default("Normal"),
  severity: severity.default(""),
  link: externalLink,
  execution: executionFields.optional(),
  responsible: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  roadmapAssignment: roadmapAssignmentFields.nullish(),
});
export const productFields = z.object({
  name: z.string().trim().min(1).max(100),
  aiEnabled: z.boolean().default(false),
  roadmap: z.string().trim().max(12000).default(""),
  repository: externalLink,
});
const id = z.uuid();
export const mutation = z.discriminatedUnion("action", [
  z.object({action:z.literal("quality.policy"),productId:id,revision:z.number().int(),fields:qualityPolicyFields}),
  z.object({action:z.literal("card.exception"),productId:id,revision:z.number().int(),cardId:id,status:z.string().max(30),reason:z.string().trim().min(20).max(2000)}),
  z.object({action: z.literal("product.create"), fields: productFields}),
  z.object({action: z.literal("product.import"), names: z.array(z.enum(Object.keys(sampleProducts) as [keyof typeof sampleProducts, ...(keyof typeof sampleProducts)[]])).min(1).max(3)}),
  z.object({action: z.literal("roadmap.release.save"), releaseId: id.optional(), productId: id, revision: z.number().int(), fields: releaseFields}),
  z.object({action: z.literal("product.update"), productId: id, revision: z.number().int(), fields: productFields}),
  z.object({action: z.literal("card.save"), productId: id, revision: z.number().int(), cardId: id.optional(), fields: cardFields}),
  z.object({action: z.literal("card.move"), productId: id, revision: z.number().int(), cardId: id, status: z.string().max(30), beforeId: id.nullable()}),
  z.object({action: z.literal("plan.publish"), productId: id, revision: z.number().int(), plan: publishedPlan}),
  z.object({action: z.literal("plan"), productId: id, revision: z.number().int(), includeRoadmap: z.boolean(), cardIds: z.array(id).max(100), prompt: z.string().trim().min(1).max(5000)}),
  z.object({action: z.literal("proposal.apply"), productId: id, proposalId: id}),
  z.object({action: z.literal("proposal.dismiss"), productId: id, proposalId: id}),
]);

export const planSchema = z.object({
  operations: z.array(z.object({
    type: z.enum(["create", "update", "move"]),
    cardId: id.nullable(),
    kind,
    status: z.string().max(30),
    title: z.string().max(180),
    description: z.string().max(10000),
    criteria: z.string().max(10000),
    priority,
    severity,
    beforeId: id.nullable(),
    reason: z.string().min(1).max(500),
    execution: executionFields.nullable().default(null),
  })).min(1).max(25),
});


export function plannerContext(request: string, product: {name: string; roadmap: string}, includeRoadmap: boolean,
  cards: Array<{id: string; kind: string; status: string; title: string; description: string; criteria: string; priority: string; severity: string; execution?: import("./card-quality").Execution | null}>) {
  return {request: request.trim(), product: product.name, ...(includeRoadmap ? {roadmap: product.roadmap} : {}),
    issues: cards.map(({id, kind, status, title, description, criteria, priority, severity, execution}) =>
      ({id, kind, status, title, description, criteria, priority, severity, execution}))};
}
