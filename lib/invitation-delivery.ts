export type InvitationDelivery={status:'sending'|'sent'|'failed'|'unknown'|'not-requested';at:string;messageId?:string;reason?:string};
export function deliveryLabel(delivery?:InvitationDelivery){
 switch(delivery?.status){
  case 'sent':return 'Email sent — accepted by Resend';
  case 'failed':return 'Email not sent';
  case 'unknown':return 'Email send could not be confirmed';
  case 'sending':return 'Email send started — confirmation pending';
  case 'not-requested':return 'Link only — no email sent';
  default:return 'Email status not recorded for this older invitation';
 }
}
export async function sendInvitationEmail(input:{email:string;productName:string;url:string;invitationId:string}):Promise<InvitationDelivery>{
 const at=new Date().toISOString();
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'invitation/'+input.invitationId},body:JSON.stringify({from:process.env.INVITATION_FROM_EMAIL,to:[input.email],subject:'Invitation to '+input.productName,text:'You have been invited to '+input.productName+' in ProjectKanban. Use your invited email address to join: '+input.url+'\nThis link expires in seven days.'}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return {status:'failed',at,reason:response.status===401?'Resend rejected the API key. Check the production email settings.':response.status===403?'Resend rejected the sender or key permissions. Check the verified sending domain and API key scope.':response.status===429?'Resend’s sending limit was reached. Check your Resend account before trying again.':`Resend rejected the send request (HTTP ${response.status}). Check Resend logs and the sender settings.`};
  const data=await response.json().catch(()=>null);
  if(typeof data?.id!=='string')return {status:'unknown',at,reason:'Resend returned no message ID. Check Resend logs before sending another invitation.'};
  return {status:'sent',at,messageId:data.id};
 }catch{return {status:'unknown',at,reason:'The send request timed out or the connection failed. Check Resend logs before sending another invitation.'};}
}
