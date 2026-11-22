// Shared, bounded CSV parsing and preview. No formulas or attachment URLs are executed.
export const csvLimit = 2 * 1024 * 1024;
export type CsvMapping = {title:string; notes:string; assignee:string; status:string; attachments:string; summary:string};
export type ImportedRow = {row:number; title:string; description:string; responsible:string; status:string; originalStatus:string; source:Record<string,string>};
export function parseCsv(text:string): string[][] {
  if(new TextEncoder().encode(text).length > csvLimit) throw new Error("CSV must be 2 MB or smaller.");
  text=text.replace(/^\uFEFF/,"");
  const rows:string[][]=[]; let row:string[]=[], field="", quoted=false, closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){if(field || closed)throw new Error("Unexpected quote in CSV.");quoted=true;continue;}
    if(c===',' || c==='\n' || c==='\r'){
      row.push(field);field="";closed=false;
      if(c!==','){if(c==='\r' && text[i+1]==='\n')i++;rows.push(row);row=[];if(rows.length>501)throw new Error("Import up to 500 rows at a time.");}
    }else {if(closed)throw new Error("Unexpected text after a quoted CSV field.");field+=c;}
  }
  if(quoted)throw new Error("CSV contains an unclosed quoted field.");
  if(field || row.length || closed){row.push(field);rows.push(row);}
  if(rows.length<2)throw new Error("CSV needs a header and at least one data row.");
  if(rows.length>501)throw new Error("Import up to 500 rows at a time.");
  const headers=rows[0].map(v=>v.trim());
  if(headers.some(v=>!v) || new Set(headers).size!==headers.length)throw new Error("Column names must be nonempty and unique.");
  if(headers.length>100)throw new Error("CSV has too many columns.");
  return [headers,...rows.slice(1).filter(r=>r.some(v=>v.trim())).map(r=>{if(r.length!==headers.length)throw new Error("A CSV row has a different number of columns than the header.");return r;})];
}
export function defaultMapping(headers:string[]):CsvMapping {
  const find=(names:string[])=>headers.find(h=>names.includes(h.toLowerCase()))??"";
  return {title:find(['name','title','task']),notes:find(['notes','description']),assignee:find(['assignee','responsible person','owner']),status:find(['status']),attachments:find(['attachments']),summary:find(['attachment summary'])};
}
export function previewCsv(csv:string,mapping:CsvMapping,doneOnly:boolean,preserveDone:boolean){
  const [headers,...raw]=parseCsv(csv);
  if(!mapping.title || !headers.includes(mapping.title))throw new Error("Choose a task title column.");
  for(const h of Object.values(mapping))if(h && !headers.includes(h))throw new Error("A mapped column was not found.");
  if(doneOnly && !mapping.status)throw new Error("Choose a status column to import completed tasks only.");
  const rows:ImportedRow[]=[];let skipped=0;
  raw.forEach((values,index)=>{
    const source=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
    const get=(key:keyof CsvMapping)=>source[mapping[key]]??"";
    const title=get('title').trim(), originalStatus=get('status').trim();
    const done=['done','complete','completed','closed'].includes(originalStatus.toLowerCase());
    if(!title || (doneOnly && !done)){skipped++;return;}
    const extras=headers.filter(h=>![mapping.title,mapping.notes,mapping.assignee,mapping.status].includes(h) && source[h].trim());
    const description=[get('notes'),...(title.length>180?[`Original title: ${title}`]:[]),...extras.map(h=>`${h}: ${source[h]}`)].filter(Boolean).join('\n\n');
    if(description.length>10000)throw new Error(`Row ${index+2}: notes exceed 10,000 characters.`);
    if(get('assignee').trim().length>100)throw new Error(`Row ${index+2}: assignee exceeds 100 characters.`);
    rows.push({row:index+2,title:title.length>180?title.slice(0,177)+'...':title,description,responsible:get('assignee').trim(),status:preserveDone&&done?'Done':'Backlog',originalStatus,source});
  });
  return {rows,skipped,headers};
}
// Stable identity across reordered columns, filenames, filters and repeated uploads.
export function rowIdentity(source:Record<string,string>){return JSON.stringify(Object.keys(source).sort().map(k=>[k,source[k]]));}
