const BASE="https://api.cloud.llamaindex.ai/api/v2/parse";
const TIMEOUT_MS=20000,MAX_RESPONSE_BYTES=700000;
const JOB_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const TIERS=new Set(["fast","cost_effective","agentic","agentic_plus"]);
const TIER_CREDITS_PER_PAGE=Object.freeze({fast:1,cost_effective:3,agentic:10,agentic_plus:45});
const MAX_PAGES_BY_TIER=Object.freeze({fast:50,cost_effective:50,agentic:25,agentic_plus:5});
const MAX_ESTIMATED_CREDITS_PER_JOB=250;
const STATUSES=new Set(["PENDING","RUNNING","COMPLETED","FAILED","CANCELLED"]);
const GOV_FILE_EXT=new Set(["pdf","xls","xlsx","xlsm","xlsb","csv","tsv","jpg","jpeg","png","gif","bmp","tif","tiff","webp","doc","docx","ppt","pptx","rtf","txt"]);
const SHEET_EXT=new Set(["xls","xlsx","xlsm","xlsb","csv","tsv"]);
const IMAGE_EXT=new Set(["jpg","jpeg","png","gif","bmp","tif","tiff","webp"]);

function fail(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function text(v,n=300){return String(v??"").trim().slice(0,n)}
function clamp(v,min,max,d){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d}
function key(env){const k=text(env?.LLAMA_CLOUD_API_KEY,1000);if(!k)fail("UPSTREAM_AUTH_FAILED",503,{missing:"LLAMA_CLOUD_API_KEY"});return k}
function governmentUrl(v){
  let u;try{u=new URL(String(v||""))}catch{fail("INVALID_SOURCE_URL")}
  if(u.protocol!=="https:"||u.username||u.password||u.port)fail("INVALID_SOURCE_URL");
  const h=u.hostname.toLowerCase();if(!(h==="gov.cn"||h.endsWith(".gov.cn")))fail("SOURCE_NOT_APPROVED_GOVERNMENT_HOST",403,{host:h});
  const name=u.pathname.split("/").pop()||"",ext=(name.includes(".")?name.split(".").pop():"").toLowerCase();
  if(!GOV_FILE_EXT.has(ext))fail("UNSUPPORTED_GOVERNMENT_DOCUMENT_TYPE",400,{extension:ext||null});
  u.hash="";return{url:u.toString(),extension:ext};
}
function chooseTier(ext,requested){
  const explicit=String(requested||"");
  if(explicit){if(!TIERS.has(explicit))fail("INVALID_TIER",400,{tier:explicit});return explicit}
  if(IMAGE_EXT.has(ext))return"agentic";
  if(SHEET_EXT.has(ext)||ext==="txt")return"fast";
  return"cost_effective";
}
function budgetFor(ext,tier,args={}){
  if(SHEET_EXT.has(ext)){
    const expectedSheets=clamp(args.expected_sheets,1,250,8),estimated=expectedSheets;
    if(estimated>MAX_ESTIMATED_CREDITS_PER_JOB)fail("LLAMAPARSE_JOB_CREDIT_BUDGET_EXCEEDED",402,{estimated_credits:estimated,max_estimated_credits:MAX_ESTIMATED_CREDITS_PER_JOB});
    return{pricing_basis:"spreadsheet-sheet-estimate",expected_sheets:expectedSheets,estimated_credit_upper_bound:estimated,max_estimated_credits:MAX_ESTIMATED_CREDITS_PER_JOB};
  }
  const maxPages=clamp(args.max_pages,1,MAX_PAGES_BY_TIER[tier],Math.min(12,MAX_PAGES_BY_TIER[tier]));
  const estimated=maxPages*TIER_CREDITS_PER_PAGE[tier];
  if(estimated>MAX_ESTIMATED_CREDITS_PER_JOB)fail("LLAMAPARSE_JOB_CREDIT_BUDGET_EXCEEDED",402,{estimated_credits:estimated,max_estimated_credits:MAX_ESTIMATED_CREDITS_PER_JOB});
  return{pricing_basis:"tier-pages-upper-bound",max_pages:maxPages,credits_per_page:TIER_CREDITS_PER_PAGE[tier],estimated_credit_upper_bound:estimated,max_estimated_credits:MAX_ESTIMATED_CREDITS_PER_JOB};
}
async function readJson(r){
  const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_RESPONSE_BYTES)fail("UPSTREAM_RESPONSE_TOO_LARGE",502);
  let body;try{body=raw?JSON.parse(raw):null}catch{fail("UPSTREAM_BAD_JSON",502,{http_status:r.status})}
  if(!r.ok){const status=r.status===401||r.status===403?503:r.status===402?402:502;fail(r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":r.status===402?"UPSTREAM_CREDIT_LIMIT":"UPSTREAM_HTTP_ERROR",status,{http_status:r.status,message:text(body?.detail||body?.message||body?.error,400)})}
  return body;
}
async function api(path,env,init={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{
    const headers={accept:"application/json",authorization:`Bearer ${key(env)}`,...(init.headers||{})};
    return await readJson(await fetch(`${BASE}${path}`,{...init,headers,signal:c.signal}));
  }catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(t)}
}
function compactJob(body){
  const job=body?.job||body||{};const out={id:job.id||null,project_id:job.project_id||null,status:job.status||null,tier:job.tier||null,error_message:job.error_message||null,created_at:job.created_at||null,updated_at:job.updated_at||null};
  if(body?.usage)out.usage=body.usage;if(body?.job?.usage)out.usage=body.job.usage;
  const markdown=body?.markdown||body?.job?.markdown;if(markdown!==undefined)out.markdown=typeof markdown==="string"?markdown.slice(0,120000):markdown;
  const textOut=body?.text||body?.job?.text;if(textOut!==undefined)out.text=typeof textOut==="string"?textOut.slice(0,120000):textOut;
  if(body?.items!==undefined)out.items=body.items;if(body?.metadata!==undefined)out.metadata=body.metadata;
  return out;
}
async function authSmoke(args,env){
  const size=clamp(args?.page_size,1,5,1),status=text(args?.status,20).toUpperCase();if(status&&!STATUSES.has(status))fail("INVALID_STATUS");
  const q=new URLSearchParams({page_size:String(size)});if(status)q.set("status",status);
  const data=await api(`?${q.toString()}`,env);
  return{provider:"llamaparse",operation:"auth_smoke",authenticated:true,parse_job_created:false,credit_consuming_parse_requested:false,total_size:data?.total_size??null,items:Array.isArray(data?.items)?data.items.slice(0,size).map(compactJob):[]};
}
function budgetPreview(args={}){
  const source=governmentUrl(args?.source_url),tier=chooseTier(source.extension,args?.tier),budget=budgetFor(source.extension,tier,args);
  return{provider:"llamaparse",operation:"budget_preview",source_url:source.url,document_extension:source.extension,tier,...budget,free_plan_guard:true,note:SHEET_EXT.has(source.extension)?"Spreadsheet pricing is per sheet; expected_sheets is a preflight estimate and actual billed usage must be read from the completed job.":"Non-spreadsheet estimate is the configured upper bound from tier credits/page multiplied by max_pages."};
}
async function parseGovernmentUrl(args,env){
  const source=governmentUrl(args?.source_url),tier=chooseTier(source.extension,args?.tier),version=text(args?.version,40)||"latest",spreadsheet=SHEET_EXT.has(source.extension),budget=budgetFor(source.extension,tier,args);
  const body={source_url:source.url,tier,version};if(!spreadsheet)body.page_ranges={max_pages:budget.max_pages};
  const data=await api("",env,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  return{provider:"llamaparse",operation:"parse_government_url",government_public_source:true,source_url:source.url,document_extension:source.extension,spreadsheet,billing_unit:spreadsheet?"sheet":"page",tier,version,max_pages:spreadsheet?null:budget.max_pages,budget,job:compactJob(data),evidence_boundary:"LlamaParse parses a lawfully public official government document; it does not convert the source into an authenticated government API/MCP source."};
}
async function jobGet(args,env){
  const id=text(args?.job_id,180);if(!JOB_ID.test(id))fail("INVALID_JOB_ID");
  const expand=text(args?.expand,120)||"markdown,items,metadata,usage";
  if(!/^[a-z_,]+$/i.test(expand))fail("INVALID_EXPAND");
  const data=await api(`/${encodeURIComponent(id)}?expand=${encodeURIComponent(expand)}`,env);
  return{provider:"llamaparse",operation:"job_get",job:compactJob(data),usage_is_authoritative_when_non_null:true};
}

export const OPERATIONS={llamaparse:["auth_smoke","budget_preview","parse_government_url","job_get"]};
export async function runAdapter(provider,operation,args={},env={}){
  if(provider!=="llamaparse"||!OPERATIONS.llamaparse.includes(operation))fail("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation});
  if(operation==="auth_smoke")return authSmoke(args,env);
  if(operation==="budget_preview")return budgetPreview(args);
  if(operation==="parse_government_url")return parseGovernmentUrl(args,env);
  return jobGet(args,env);
}
