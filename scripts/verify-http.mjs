// Public HTTP acceptance checks. Does not create accounts or mutate board data.
const base=process.env.PROJECTKANBAN_BASE_URL??'https://projectkanban-omega.vercel.app';
const cases=[
 ['Homepage','/','GET',200],
 ['Invitation page','/invite','GET',200],
 ...['collaboration','invitations','integrations','integration-jobs','my-work','preferences','export','release-notes'].map(route=>['Unauthenticated '+route,'/api/'+route,'GET',401]),
 ...['collaboration','invitations','integrations','integration-jobs','preferences'].map(route=>['Unauthenticated '+route+' write','/api/'+route,'POST',401]),
 ['Workspace MCP without token','/api/mcp/workspace','POST',401],
 ['Unauthenticated board','/api/kanban','GET',401],
 ['Unauthenticated board write','/api/kanban','POST',401],
 ['Unauthenticated attachment list','/api/attachments','GET',401],
 ['Unauthenticated upload','/api/attachments','POST',401],
 ['Unauthenticated removal','/api/attachments','DELETE',401],
 ['Unauthenticated members','/api/members','GET',401],
 ['Unauthenticated portfolio','/api/portfolio','GET',401],
 ['Unauthenticated AI settings','/api/ai-provider','GET',401],
 ['Unauthenticated AI draft','/api/planning-draft','POST',401],
 ['Unauthenticated token management','/api/mcp/tokens','POST',401],
 ['Public signup blocked','/api/auth/sign-up/email','POST',403],
 ['Social signup blocked','/api/auth/sign-in/social','POST',403],
 ['MCP GET rejected','/api/mcp','GET',405],
];
const results=await Promise.all(cases.map(async([name,path,method,expected])=>{
 try{
  const response=await fetch(new URL(path,base),{method,redirect:'manual',signal:AbortSignal.timeout(15000),...(method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{})});
  return {name,status:response.status,expected,passed:response.status===expected};
 }catch(error){return {name,passed:false,error:error.message};}
}));
for(const [name,headers,expected] of [
 ['Unknown MCP token rejected',{Authorization:'Bearer pk_mcp_'+'A'.repeat(43)},401],
 ['Foreign MCP origin rejected',{Origin:'https://untrusted.example'},403],
]){
 try{
  const response=await fetch(new URL('/api/mcp',base),{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
  results.push({name,status:response.status,expected,passed:response.status===expected});
 }catch(error){results.push({name,passed:false,error:error.message});}
}
console.table(results);
if(results.some(result=>!result.passed))process.exitCode=1;
