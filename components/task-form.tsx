"use client";
import {workFields} from "../lib/collaboration";
import {defaultTaskBoard,taskStatusLabel,type TaskBoard} from "../lib/task-board";
import {CardTemplate} from "./card-template";
import type { z } from "zod";
import type { cards } from "../lib/schema";
import { cardFields, workflows, executionFields } from "../lib/workflow";
import { CardAttachments } from "./card-attachments";
import { Button } from "./ui/button";

type Card = typeof cards.$inferSelect;
export function TaskForm({card,status,productId,canEdit,busy,preview,save,config=defaultTaskBoard,clients=[],agencies=[]}:{config?:TaskBoard;clients?:string[];agencies?:string[];card?:Card;status:string;productId:string;canEdit:boolean;busy:boolean;preview:boolean;save:(fields:z.input<typeof cardFields>)=>void}) {
  return <form onSubmit={event=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    save({kind:"development",title:String(data.get("title")),description:String(data.get("description")),responsible:String(data.get("responsible")),status:String(data.get("status")),
      priority:cardFields.shape.priority.parse(card?.priority ?? "Normal"),criteria:card?.criteria??"",link:card?.link??"",tags:card?.tags??[],roadmapAssignment:card?.roadmapAssignment??null,
      execution:{...executionFields.parse(card?.execution??{}),attachmentSummary:String(data.get("attachmentSummary")),work:{...workFields.parse(card?.execution?.work??{}),client:String(data.get("client")??""),agency:config.showAgency?String(data.get("agency")??""):(card?.execution?.work?.agency??"")}}});
  }}>
    <p>Describe the work, assign it, and update its status. Choose Done when the task is complete.</p>
    {!card && <CardTemplate human/>}
    <label>Name<input name="title" required maxLength={180} defaultValue={card?.title}/></label>
    <label>{config.clientLabel}<input name="client" list="task-clients" maxLength={120} defaultValue={card?.execution?.work?.client}/></label><datalist id="task-clients">{clients.map(c=><option key={c} value={c}/>)}</datalist>
    {config.showAgency&&<><label>{config.agencyLabel}<input name="agency" list="task-agencies" maxLength={120} defaultValue={card?.execution?.work?.agency}/></label><datalist id="task-agencies">{agencies.map(a=><option key={a} value={a}/>)}</datalist></>}
    <label>Notes<textarea name="description" rows={7} maxLength={10000} defaultValue={card?.description}/></label>
    <label>Assignee<input name="responsible" maxLength={100} defaultValue={card?.responsible}/></label>
    <label>Status<select name="status" defaultValue={status || "Backlog"}>{workflows.development.map(value=><option key={value} value={value}>{taskStatusLabel(value,config)}</option>)}</select></label>
    {!preview && <CardAttachments productId={productId} cardId={card?.id} canEdit={canEdit}/>}
    <label>Attachment Summary<textarea name="attachmentSummary" maxLength={10000} defaultValue={card?.execution?.attachmentSummary}/></label>
    <Button type="submit" disabled={busy || !canEdit}>Save task</Button>
  </form>;
}
