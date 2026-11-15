import { z } from "zod";
import { briefFields, bugFields, executionFields } from "./card-quality.ts";
import { releaseFields } from "./roadmap.ts";
const revision = z.number().int().nonnegative();
const executionPatch = executionFields.partial().extend({brief: briefFields.partial().optional(), bug: bugFields.partial().optional()}).strict();
const assignment = z.object({releaseId:z.uuid(),phase:z.string().trim().min(1).max(100).optional(),milestone:z.string().trim().min(1).max(100).optional()}).strict();
export const patchFields = z.object({
  title: z.string().trim().min(1).max(180).optional(), description:z.string().max(10000).optional(),
  acceptanceCriteria:z.string().max(10000).optional(), priority:z.enum(["Urgent","High","Normal","Low"]).optional(),
  severity:z.enum(["","Critical","Major","Moderate","Minor"]).optional(),
  responsible:z.string().trim().max(100).optional(), tags:z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  link:z.union([z.literal(""),z.url({protocol:/^https?$/})]).optional(),
  execution:executionPatch.optional(), roadmapAssignment:assignment.nullable().optional(),
}).strict();
export const createArgs = patchFields.extend({board:z.enum(["development","bug"]),title:z.string().trim().min(1).max(180),requestId:z.uuid().optional(),expectedRevision:revision.optional()}).strict();
export const moveArgs = z.object({cardId:z.uuid(),status:z.string().trim().min(1).max(30),expectedRevision:revision.optional()}).strict();
export const updateArgs = z.object({cardId:z.uuid(),expectedRevision:revision,fields:patchFields.refine(x=>Object.keys(x).length>0,"Supply at least one field")}).strict();
export const roadmapArgs = z.object({expectedRevision:revision,requestId:z.uuid(),reviewed:z.literal(true),
  roadmap:z.string().trim().max(12000),releases:z.array(releaseFields.extend({id:z.uuid()}).strict()).max(100).optional(),
}).strict();
