import type { Execution } from "./card-quality";
// Drafting may preserve recorded facts or reset verification, never manufacture them.
export function plannerExecutionIsSafe(proposed:Execution|null,previous?:Execution|null){
  if(!proposed)return true;
  if(proposed.result!=="Pending" && proposed.result!==(previous?.result??"Pending"))return false;
  if(proposed.evidence && proposed.evidence!==(previous?.evidence??""))return false;
  if(proposed.approved && (!previous?.approved || proposed.approach!==previous.approach || JSON.stringify(proposed.brief)!==JSON.stringify(previous.brief)))return false;
  for(const field of ["rootCause","fixSummary","regressionTest","fixedIn"] as const){
    if(proposed.bug?.[field] && proposed.bug[field]!==previous?.bug?.[field])return false;
  }
  return true;
}
