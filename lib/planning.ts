import { z } from "zod";
import { releaseFields } from "./roadmap.ts";
const plannedCard = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(10000),
  criteria: z.string().trim().min(1).max(10000),
  testPlan:z.string().trim().max(10000).default(""),
  phase:z.string().trim().max(100).optional(),
  milestone:z.string().trim().max(100).optional(),
});
export const publishedPlan = z.object({
  requestId: z.uuid(), roadmap: z.string().trim().min(1).max(12000),
  release:releaseFields.optional(), cards: z.array(plannedCard).min(1).max(20),
});
export const assistedPlan=z.object({
  name:z.string().min(1).max(100),audience:z.string().max(1000),problem:z.string().max(2000),success:z.string().max(2000),
  milestones:z.string().max(4000),phases:z.string().max(2000),constraints:z.string().max(2000),cards:z.array(plannedCard).min(1).max(20),
});
export type PublishedPlan = z.output<typeof publishedPlan>;
export type PlannedCard = z.output<typeof plannedCard>;
