import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
export function validSignature(raw:string,secret:string,signature:string,provider:'github'|'vercel'){
 const algorithm=provider==='github'?'sha256':'sha1',prefix=provider==='github'?'sha256=':'';
 const expected=prefix+createHmac(algorithm,secret).update(raw).digest('hex');
 return expected.length===signature.length && timingSafeEqual(Buffer.from(expected),Buffer.from(signature));
}
const sha=z.string().regex(/^[a-f0-9]{40,64}$/i);
const url=z.url({protocol:/^https$/});
export function deliveryFromWebhook(provider:'github'|'vercel',event:string,payload:unknown){
 const body=z.record(z.string(),z.any()).parse(payload);
 if(provider==='github'){
  const identity=z.string().min(3).parse(body.repository?.full_name).toLowerCase();
  if(event==='pull_request'){
   const pr=body.pull_request;const commit=sha.parse(pr?.head?.sha);
   // PR commit and merge commit are distinct; keep both as evidence when supplied.
   const cardIds=[...String(pr?.body??'').matchAll(/PK:([0-9a-f-]{36})/gi)].map(m=>m[1]).filter(id=>z.uuid().safeParse(id).success);
   return {identity,commit,mergeCommit:sha.safeParse(pr?.merge_commit_sha).success?pr.merge_commit_sha:undefined,cardIds,kind:'pull-request',url:url.parse(pr?.html_url),state:pr?.merged?'merged':'pending',summary:'Pull request '+String(pr?.number??body.number)+' · '+String(body.action)};
  }
  if(event==='check_run'){const run=body.check_run;return {identity,commit:sha.parse(run?.head_sha),cardIds:[],kind:'ci',url:url.parse(run?.html_url),state:run?.status==='completed'?(run.conclusion==='success'?'passed':['failure','cancelled','timed_out','action_required'].includes(run.conclusion)?'failed':'pending'):'pending',summary:String(run?.name??'Check')+' · '+String(run?.conclusion??run?.status)};}
  return null;
 }
 if(!['deployment.created','deployment.ready','deployment.succeeded','deployment.error','deployment.canceled','deployment.promoted'].includes(event))return null;
 const p=body.payload,identity=z.string().min(1).parse(p?.project?.id),commit=sha.parse(p?.deployment?.meta?.githubCommitSha);
 const rawUrl=String(p?.deployment?.url??'');
 return {identity,commit,cardIds:[],kind:(p?.target??p?.deployment?.target)==='production'?'production':'preview',url:url.parse(rawUrl.startsWith('https://')?rawUrl:'https://'+rawUrl),state:['deployment.ready','deployment.succeeded','deployment.promoted'].includes(event)?'deployed':['deployment.error','deployment.canceled'].includes(event)?'failed':'pending',summary:event};
}
