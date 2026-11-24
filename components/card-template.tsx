'use client';
import {useState} from 'react';
import {Button} from './ui/button';
export function CardTemplate({human=false}:{human?:boolean}){
 const [template,setTemplate]=useState(''),[message,setMessage]=useState('');
 const choices=human?{'General task':'Instructions:\n\nExpected result:\n\nUseful links:', 'Client request':'Client / requester:\n\nRequest:\n\nExpected result:\n\nSource:', 'Recurring operations':'Routine:\n\nSteps:\n\nCompletion notes:'}:{'Software feature':'User need:\n\nProposed behavior:\n\nConstraints:\n\nOpen questions:', 'Investigation':'Observed problem:\n\nQuestions to answer:\n\nEvidence to collect:\n\nFindings:'};
 return <details><summary>Start from a template</summary><div className="actions"><select aria-label="Card template" value={template} onChange={e=>setTemplate(e.target.value)}><option value="">Choose a template</option>{Object.keys(choices).map(key=><option key={key}>{key}</option>)}</select><Button type="button" variant="outline" disabled={!template} onClick={event=>{const area=event.currentTarget.closest('form')?.querySelector<HTMLTextAreaElement>('textarea[name="description"]');if(!area)return;if(area.value.trim()){setMessage('Your notes already contain text. Clear them first if you want to use a template.');return;}area.value=choices[template as keyof typeof choices]??'';area.dispatchEvent(new Event('input',{bubbles:true}));setMessage('Template added to notes. Fill in the details before advancing the task.');}}>Apply template</Button></div>{message&&<p role="status">{message}</p>}</details>;
}
