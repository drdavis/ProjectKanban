import { z } from "zod";

const plannedCard = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(10000),
  criteria: z.string().trim().min(1).max(10000),
});

export const publishedPlan = z.object({
  requestId: z.uuid(),
  roadmap: z.string().trim().min(1).max(12000),
  cards: z.array(plannedCard).min(1).max(20),
});

export type PublishedPlan = z.output<typeof publishedPlan>;
export type PlannedCard = z.output<typeof plannedCard>;
