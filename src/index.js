import {CATALOG,CATALOG_VERSION,EXCLUDED_PROVIDERS,statusFor,allStatuses} from "./catalog.js";
import {OPERATIONS,runAdapter} from "./adapters.js";
import {CAPABILITY_ABI_VERSION,intelligenceCapabilityManifest} from "./capability-manifest.js";

const API_VERSION="2026-08-15";
const MAX_BODY_BYTES=65536,DEFAULT_LEASE_SECONDS=1800,MAX_LEASE_SECONDS=7200,DEFAULT_RATE_PER_MIN=60;
const SERVICE="intelligence-worker";
const POLICY={fail_closed:true,single_active_task:true,network:"allowlisted-upstreams-only",arbitrary_url_fetch:false,arbitrary_code:false,max_retries:0,task_persistence:"operational-metadata-only",unknown_provider:"deny",unknown_operation:"deny",github_role:"static-source-relay-backup",runtime_authority:"cloudflare"};
const CAPABILITIES={fast_path:true,controlled_path:true,connector_registry:true,provider_readiness:true,adapter_contract:true,live_adapters:true,catalog_version:CATALOG_VERSION,provider_count:Object.keys(CATALOG).length,excluded_providers:EXCLUDED_PROVIDERS};
const now=()=>new Date().toISOString(),rid=()=>crypto.randomUUID();
const int=(v,d)=>{const n=Number(v);return Number.isFinite(n)?Math.trunc(n):d};
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{"cache-control":"no-store",...headers}});
const error=(code,message,status=400,details)=>json({ok:false,error:code,message,...(details?{details:redact(details)}:{})},status);
function redact(v){if(Array.isArray(v))return v.map(redact);if(v&&typeof v==="object"){const o={};for(const[k,x]of Object.entries(v))o[k]=/token|secret|password|authorization|cookie|api.?key|credentials/i.test(k)?"[REDACTED]":redact(x);return o}return v}
async function parseJson(req){const len=Number(req.headers.get("content-length")||0);if(len>MAX_BODY_BYTES)throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});const t=await req.text();if(new TextEncoder().encode(t).length>MAX_BODY_BYTES)throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});if(!t)return{};try{return JSON.parse(t)}catch{throw Object.assign(new Error("INVALID_REQUEST"),{status:400})}}
async function sha256Text(text){const data=new TextEncoder().encode(text),hash=await crypto.subtle.digest("SHA-256",data);return[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function sourceDigest(){return sha256Text(JSON.stringify({service:SERVICE,api_version:API_VERSION,policy:POLICY,capabilities:CAPABILITIES,catalog:CATALOG_VERSION}))}
function gate(env,shard="global"){return env.CENTER_GATE.get(env.CENTER_GATE.idFromName(shard))}
async function gateCall(env,path,method="GET",body,shard="global"){const init={method,headers:{"content-type":"application/json"}};if(body!==undefined)init.body=JSON.stringify(body);const r=await gate(env,shard).fetch(new Request(`https://gate.internal${path}`,init));const b=await r.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}));return{http:r.status,...b}}
const acquire=(env,taskId,kind,leaseSeconds)=>gateCall(env,"/acquire","POST",{task_id:taskId,kind,lease_seconds:leaseSeconds});
const release=(env,taskId)=>gateCall(env,"/release","POST",{task_id:taskId});
const saveTask=(env,taskId,patch)=>gateCall(env,`/task/${encodeURIComponent(taskId)}`,"POST",patch,`task:${taskId}`);
const loadTask=(env,taskId)=>gateCall(env,`/task/${encodeURIComponent(taskId)}`,"GET",undefined,`task:${taskId}`);
const checkRate=env=>gateCall(env,"/rate","POST",{limit:int(env.RATE_LIMIT_PER_MIN,DEFAULT_RATE_PER_MIN)});

export class CenterGate{
  constructor(state,env){this.state=state;this.env=env}
  async fetch(req){const u=new URL(req.url),s=this.state.storage,body=async()=>{try{return await req.json()}catch{return{}}};const active=async()=>{const a=await s.get("active");if(a&&a.expires_at_ms<=Date.now()){await s.delete("active");return null}return a||null};
    if(req.method==="GET"&&u.pathname==="/state")return json({ok:true,active:await active()});
    if(req.method==="POST"&&u.pathname==="/acquire"){const b=await body(),a=await active();if(a&&a.task_id!==b.task_id)return json({ok:false,error:"BUSY",active:a},409);const lease=Math.max(30,Math.min(MAX_LEASE_SECONDS,int(b.lease_seconds,DEFAULT_LEASE_SECONDS))),rec={task_id:String(b.task_id||""),kind:String(b.kind||"task"),acquired_at:now(),expires_at_ms:Date.now()+lease*1000};if(!rec.task_id)return json({ok:false,error:"INVALID_REQUEST"},400);await s.put("active",rec);return json({ok:true,active:rec})}
    if(req.method==="POST"&&u.pathname==="/release"){const b=await body(),a=await active();if(!a)return json({ok:true,released:false});if(a.task_id!==b.task_id)return json({ok:false,error:"LOCK_OWNER_MISMATCH",active:a},409);await s.delete("active");return json({ok:true,released:true})}
    if(req.method==="POST"&&u.pathname==="/rate"){const b=await body(),limit=Math.max(1,Math.min(1000,int(b.limit,DEFAULT_RATE_PER_MIN))),minute=Math.floor(Date.now()/60000),key=`rate:${minute}`,count=(await s.get(key)||0)+1;await s.put(key,count);await s.delete(`rate:${minute-2}`);return count<=limit?json({ok:true,count,limit}):json({ok:false,error:"RATE_LIMITED",count,limit},429)}
    let m=u.pathname.match(/^\/task\/([^/]+)$/);if(m&&req.method==="GET")return json({ok:true,task:await s.get(`task:${decodeURIComponent(m[1])}`)||null});if(m&&req.method==="POST"){const id=decodeURIComponent(m[1]),b=await body(),old=await s.get(`task:${id}`)||{},rec={...old,...redact(b),task_id:id};await s.put(`task:${id}`,rec);return json({ok:true,task:rec})}
    m=u.pathname.match(/^\/task\/([^/]+)\/cancel$/);if(m&&req.method==="POST"){const id=decodeURIComponent(m[1]),key=`task:${id}`,old=await s.get(key);if(!old)return json({ok:false,error:"TASK_NOT_FOUND"},404);const rec={...old,cancel_requested:true,cancel_requested_at:now()};await s.put(key,rec);return json({ok:true,task:rec})}
    return json({ok:false,error:"GATE_ROUTE_NOT_FOUND"},404)
  }
}

function catalogView(env){return Object.fromEntries(Object.entries(CATALOG).map(([name,p])=>[name,{...p,...statusFor(env,name),secrets:p.secrets?.map(()=>"[SECRET]")||undefined,secret_groups:p.secret_groups?.map(g=>g.map(()=>"[SECRET]"))||undefined,operations:OPERATIONS[name]||[]}]))}
async function run(req,env){
  const rate=await checkRate(env);if(!rate.ok)return error("RATE_LIMITED","Request budget exceeded",429,rate);
  const b=await parseJson(req),taskId=String(b.task_id||b.request_id||rid()),provider=String(b.provider||"").toLowerCase(),operation=String(b.operation||"");
  if(!provider||!CATALOG[provider])return error("INVALID_REQUEST","Known provider required",400,{excluded:EXCLUDED_PROVIDERS});
  if(!operation)return error("INVALID_REQUEST","operation required",400,{allowed:OPERATIONS[provider]||[]});
  if(!OPERATIONS[provider]?.includes(operation))return error("POLICY_DENIED","Provider is restored in the catalog but this operation is not yet approved for live execution",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
  const old=await loadTask(env,taskId);if(old.task)return error("DUPLICATE_TASK","task_id already exists; duplicate upstream execution blocked",409,{task_id:taskId,status:old.task.status});
  const ready=statusFor(env,provider);if(!ready?.configured)return error("UPSTREAM_AUTH_FAILED","Provider is not configured in Cloudflare runtime",503,{provider});
  const acq=await acquire(env,taskId,"intelligence",Math.min(1800,Math.max(30,int(b.timeout_seconds,300))));if(!acq.ok)return error("BUSY","Another intelligence task is active",409,acq.active);
  await saveTask(env,taskId,{status:"running",provider,operation,created_at:now(),request_id:b.request_id||null});
  try{
    const result=await runAdapter(provider,operation,b.args||{},env),after=await loadTask(env,taskId);
    if(after.task?.cancel_requested){await saveTask(env,taskId,{status:"cancelled",provider,operation,finished_at:now()});return error("CANCELLED","Task was cancelled; upstream result discarded",409,{task_id:taskId})}
    const digest=await sha256Text(JSON.stringify(result)),items=Array.isArray(result?.items)?result.items.length:null;
    await saveTask(env,taskId,{status:"pass",provider,operation,result_digest:digest,item_count:items,finished_at:now()});
    return json({ok:true,task_id:taskId,provider,operation,result_digest:digest,result});
  }catch(e){await saveTask(env,taskId,{status:"failed",provider,operation,error:String(e?.message||e),finished_at:now()});return error(e?.message||"UPSTREAM_FAILED","Approved adapter execution failed",e?.status||502,e?.details)}finally{await release(env,taskId)}
}

async function handle(req,env){const u=new URL(req.url);
  if(req.method==="GET"&&u.pathname==="/health"){const s=allStatuses(env);return json({ok:true,status:"ready",service:SERVICE,api_version:API_VERSION,catalog_version:CATALOG_VERSION,providers_total:Object.keys(s).length,providers_configured:Object.values(s).filter(x=>x.configured).length,live_adapters:Object.values(s).filter(x=>x.live_adapter).length})}
  if(req.method==="GET"&&(u.pathname==="/v1/policy"||u.pathname==="/policy"))return json({ok:true,service:SERVICE,policy:POLICY});
  if(req.method==="GET"&&(u.pathname==="/v1/capabilities"||u.pathname==="/capabilities")){const providers=allStatuses(env);return json({ok:true,service:SERVICE,capabilities:{...CAPABILITIES,providers:Object.keys(CATALOG)},providers,capability_abi_version:CAPABILITY_ABI_VERSION,capability_manifest:intelligenceCapabilityManifest({catalogVersion:CATALOG_VERSION,providerStatuses:providers})})}
  if(req.method==="GET"&&u.pathname==="/v1/catalog")return json({ok:true,catalog_version:CATALOG_VERSION,excluded:EXCLUDED_PROVIDERS,providers:catalogView(env)});
  if(req.method==="GET"&&(u.pathname==="/quota"||u.pathname==="/v1/quota"))return json({ok:true,rate_limit_per_min:int(env.RATE_LIMIT_PER_MIN,60),single_active_task:true,max_body_bytes:MAX_BODY_BYTES,max_retries:0});
  if(req.method==="GET"&&u.pathname==="/source")return json({ok:true,service:SERVICE,api_version:API_VERSION,catalog_version:CATALOG_VERSION,source_digest:await sourceDigest(),secrets_redacted:true});
  if(req.method==="GET"&&u.pathname==="/v1/acceptance/latest")return json({ok:true,service:SERVICE,status:"not_verified",run_id:null,receipt_digest:null});
  if(req.method==="GET"&&u.pathname==="/openapi.json")return json({openapi:"3.1.0",info:{title:"Intelligence Center",version:API_VERSION},paths:{"/health":{get:{}},"/v1/policy":{get:{}},"/v1/capabilities":{get:{}},"/v1/catalog":{get:{}},"/v1/run":{post:{}},"/v1/status":{post:{}},"/v1/cancel":{post:{}}}});
  let m=u.pathname.match(/^\/v1\/provider\/([^/]+)\/readiness$/);if(req.method==="GET"&&m){const p=decodeURIComponent(m[1]).toLowerCase(),s=statusFor(env,p);return s?json({ok:true,provider:p,...s,operations:OPERATIONS[p]||[]}):error("INVALID_REQUEST","Unknown provider",404)}
  m=u.pathname.match(/^\/v1\/provider\/([^/]+)\/operations$/);if(req.method==="GET"&&m){const p=decodeURIComponent(m[1]).toLowerCase();return CATALOG[p]?json({ok:true,provider:p,operations:OPERATIONS[p]||[],live:Boolean(OPERATIONS[p]?.length)}):error("INVALID_REQUEST","Unknown provider",404)}
  if(req.method==="POST"&&u.pathname==="/v1/status"){const b=await parseJson(req);if(!b.task_id)return error("INVALID_REQUEST","task_id required",400);const t=await loadTask(env,b.task_id);return t.task?json({ok:true,task:t.task}):error("INVALID_REQUEST","Task not found",404)}
  if(req.method==="POST"&&u.pathname==="/v1/run")return run(req,env);
  return error("INVALID_REQUEST","Route not found",404)
}
export default{async fetch(req,env,ctx){try{return await handle(req,env,ctx)}catch(e){return error(e?.message||"INTERNAL_ERROR","Request failed",e?.status||500,e?.details)}}};
