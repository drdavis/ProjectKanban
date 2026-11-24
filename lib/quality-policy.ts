import {taskBoardFields} from "./task-board.ts";
import { z } from "zod";
export const qualityPolicyFields=z.object({
  taskBoard:taskBoardFields.default(()=>taskBoardFields.parse({})),
  workType:z.enum(["software","tasks"]).default("software"),
  requireStructuredBrief:z.boolean().default(true),
  requireBugDetails:z.boolean().default(true),
  allowOwnerExceptions:z.boolean().default(false),
}).strict();
export type QualityPolicy=z.output<typeof qualityPolicyFields>;
export const defaultQualityPolicy=qualityPolicyFields.parse({});
export function exceptionCanWaive(issues:string[],policy:QualityPolicy,reason?:string){
  const mandatory=["Passing test result","Verification evidence","Regression test evidence","Fix summary","Fixed-in version or release","Root-cause findings (or explicit unresolved cause)"];
  return policy.allowOwnerExceptions && !!reason && reason.trim().length>=20 && issues.every(issue=>!mandatory.includes(issue));
}
