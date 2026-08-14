
const API_VERSION = "2026-08-14";
const MAX_BODY_BYTES = 65536;
const DEFAULT_LEASE_SECONDS = 1800;
const MAX_LEASE_SECONDS = 7200;
const DEFAULT_RATE_PER_MIN = 60;

function now(){ return new Date().toISOString(); }
function rid(){ return crypto.randomUUID(); }
function int(v,d){ const n=Number(v); return Number.isFinite(n)?Math.trunc(n):d; }
function json(body,status=200,headers={}){ return Response.json(body,{status,headers:{"cache-control":"no-store",...headers}}); }
function error(code,message,status=400,details){ return json({ok:false,error:code,message,details},status); }
async function parseJson(req){
  const len=Number(req.headers.get("content-length")||0);
  if(len>MAX_BODY_BYTES) throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});
  const t=await req.text();
  if(new TextEncoder().encode(t).length>MAX_BODY_BYTES) throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});
  if(!t) return {};
  try{return JSON.parse(t);}catch{throw Object.assign(new Error("INVALID_REQUEST"),{status:400});}
}
function redact(v){
  if(Array.isArray(v)) return v.map(redact);
  if(v&&typeof v==="object"){
    const o={}; for(const [k,x] of Object.entries(v)) o[k]=/token|secret|password|authorization|cookie|api.?key/i.test(k)?"[REDACTED]":redact(x); return o;
  }
  return v;
}
async function sha256Text(text){
  const data=new TextEncoder().encode(text); const hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function sourceDigest(service,policy,capabilities){ return sha256Text(JSON.stringify({service,api_version:API_VERSION,policy,capabilities})); }
function gate(env){ const id=env.CENTER_GATE.idFromName("global"); return env.CENTER_GATE.get(id); }
async function gateCall(env,path,method="GET",body){
  const init={method,headers:{"content-type":"application/json"}}; if(body!==undefined) init.body=JSON.stringify(body);
  const r=await gate(env).fetch(new Request(`https://gate.internal${path}`,init));
  const b=await r.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"})); return {http:r.status,...b};
}
async function acquire(env,taskId,kind,leaseSeconds){ return gateCall(env,"/acquire","POST",{task_id:taskId,kind,lease_seconds:leaseSeconds}); }
async function release(env,taskId){ return gateCall(env,"/release","POST",{task_id:taskId}); }
async function saveTask(env,taskId,patch){ return gateCall(env,`/task/${encodeURIComponent(taskId)}`,"POST",patch); }
async function loadTask(env,taskId){ return gateCall(env,`/task/${encodeURIComponent(taskId)}`); }
async function checkRate(env){ return gateCall(env,"/rate","POST",{limit:int(env.RATE_LIMIT_PER_MIN,DEFAULT_RATE_PER_MIN)}); }

export class CenterGate {
  constructor(state,env){ this.state=state; this.env=env; }
  async fetch(req){
    const u=new URL(req.url), s=this.state.storage;
    const body=async()=>{try{return await req.json();}catch{return {};}};
    const active=async()=>{
      const a=await s.get("active");
      if(a && a.expires_at_ms<=Date.now()){ await s.delete("active"); return null; }
      return a||null;
    };
    if(req.method==="GET"&&u.pathname==="/state") return json({ok:true,active:await active()});
    if(req.method==="POST"&&u.pathname==="/acquire"){
      const b=await body(), a=await active();
      if(a && a.task_id!==b.task_id) return json({ok:false,error:"BUSY",active:a},409);
      const lease=Math.max(30,Math.min(MAX_LEASE_SECONDS,int(b.lease_seconds,DEFAULT_LEASE_SECONDS)));
      const rec={task_id:String(b.task_id||""),kind:String(b.kind||"task"),acquired_at:now(),expires_at_ms:Date.now()+lease*1000};
      if(!rec.task_id) return json({ok:false,error:"INVALID_REQUEST"},400);
      await s.put("active",rec); return json({ok:true,active:rec});
    }
    if(req.method==="POST"&&u.pathname==="/release"){
      const b=await body(), a=await active();
      if(!a) return json({ok:true,released:false});
      if(a.task_id!==b.task_id) return json({ok:false,error:"LOCK_OWNER_MISMATCH",active:a},409);
      await s.delete("active"); return json({ok:true,released:true});
    }
    if(req.method==="POST"&&u.pathname==="/rate"){
      const b=await body(), limit=Math.max(1,Math.min(1000,int(b.limit,DEFAULT_RATE_PER_MIN)));
      const minute=Math.floor(Date.now()/60000), key=`rate:${minute}`;
      const count=(await s.get(key)||0)+1; await s.put(key,count); await s.delete(`rate:${minute-2}`);
      return count<=limit?json({ok:true,count,limit}):json({ok:false,error:"RATE_LIMITED",count,limit},429);
    }
    let m=u.pathname.match(/^\/task\/([^/]+)$/);
    if(m&&req.method==="GET") return json({ok:true,task:await s.get(`task:${decodeURIComponent(m[1])}`)||null});
    if(m&&req.method==="POST"){
      const id=decodeURIComponent(m[1]), b=await body(), old=await s.get(`task:${id}`)||{};
      const rec={...old,...redact(b),task_id:id}; await s.put(`task:${id}`,rec); return json({ok:true,task:rec});
    }
    m=u.pathname.match(/^\/task\/([^/]+)\/cancel$/);
    if(m&&req.method==="POST"){
      const id=decodeURIComponent(m[1]), key=`task:${id}`, old=await s.get(key);
      if(!old) return json({ok:false,error:"TASK_NOT_FOUND"},404);
      const rec={...old,cancel_requested:true,cancel_requested_at:now()}; await s.put(key,rec); return json({ok:true,task:rec});
    }
    return json({ok:false,error:"GATE_ROUTE_NOT_FOUND"},404);
  }
}

const SERVICE="intelligence-worker";
const POLICY={fail_closed:true,single_active_task:true,network:"allowlisted-upstreams-only",arbitrary_url_fetch:false,arbitrary_code:false,max_retries:1,task_persistence:"operational-metadata-only"};
const CAPABILITIES={fast_path:true,controlled_path:true,connector_registry:true,provider_readiness:true,adapter_contract:true,providers:["exa","tavily","serpapi","baidu","bigquery","earthengine","fred","worldbank","imf","oecd","who","qweather","opensky","huggingface","browserless"]};
const OPENAPI='{"openapi":"3.1.0","info":{"title":"Intelligence Center","version":"2026-08-14"},"paths":{"/health":{"get":{}},"/v1/policy":{"get":{}},"/v1/capabilities":{"get":{}},"/v1/run":{"post":{}},"/v1/status":{"post":{}},"/v1/cancel":{"post":{}}}}';
function providers(env){
  const defaults={
    exa:{configured:Boolean(env.EXA_API_KEY)},tavily:{configured:Boolean(env.TAVILY_API_KEY)},
    serpapi:{configured:Boolean(env.SERPAPI_API_KEY)},baidu:{configured:Boolean(env.BAIDU_API_KEY)},
    bigquery:{configured:Boolean(env.GOOGLE_CLOUD_CREDENTIALS||env.GOOGLE_API_KEY)},earthengine:{configured:Boolean(env.GOOGLE_CLOUD_CREDENTIALS)},
    fred:{configured:Boolean(env.FRED_API_KEY)},worldbank:{configured:true},imf:{configured:true},oecd:{configured:true},who:{configured:true},
    qweather:{configured:Boolean(env.QWEATHER_API_KEY)},opensky:{configured:Boolean(env.OPENSKY_CLIENT_ID&&env.OPENSKY_CLIENT_SECRET)},
    huggingface:{configured:Boolean(env.HUGGINGFACE_TOKEN)},browserless:{configured:Boolean(env.BROWSERLESS_TOKEN)}
  }; return defaults;
}
async function handle(req,env,ctx){
  const u=new URL(req.url);
  if(req.method==="GET"&&u.pathname==="/health") return json({ok:true,status:"ready",service:SERVICE,api_version:API_VERSION,source:"github-static-relay",upstreams_configured:Object.values(providers(env)).filter(x=>x.configured).length});
  if(req.method==="GET"&&(u.pathname==="/v1/policy"||u.pathname==="/policy")) return json({ok:true,service:SERVICE,policy:POLICY});
  if(req.method==="GET"&&(u.pathname==="/v1/capabilities"||u.pathname==="/capabilities")) return json({ok:true,service:SERVICE,capabilities:CAPABILITIES,providers:providers(env)});
  if(req.method==="GET"&&(u.pathname==="/quota"||u.pathname==="/v1/quota")) return json({ok:true,rate_limit_per_min:int(env.RATE_LIMIT_PER_MIN,60),single_active_task:true,max_body_bytes:MAX_BODY_BYTES});
  if(req.method==="GET"&&u.pathname==="/openapi.json") return new Response(OPENAPI,{headers:{"content-type":"application/json","cache-control":"no-store"}});
  if(req.method==="GET"&&u.pathname==="/source") return json({ok:true,service:SERVICE,api_version:API_VERSION,source_digest:await sourceDigest(SERVICE,POLICY,CAPABILITIES),secrets_redacted:true});
  if(req.method==="GET"&&u.pathname==="/v1/acceptance/latest") return json({ok:true,service:SERVICE,status:"not_verified",run_id:null,receipt_digest:null});
  let m=u.pathname.match(/^\/v1\/provider\/([^/]+)\/readiness$/);
  if(req.method==="GET"&&m){ const p=decodeURIComponent(m[1]).toLowerCase(), reg=providers(env); return p in reg?json({ok:true,provider:p,...reg[p]}):error("INVALID_REQUEST","Unknown provider",404); }
  if(req.method==="POST"&&u.pathname==="/v1/status"){
    const b=await parseJson(req); if(!b.task_id) return error("INVALID_REQUEST","task_id required",400); const t=await loadTask(env,b.task_id); return t.task?json({ok:true,task:t.task}):error("INVALID_REQUEST","Task not found",404);
  }
  if(req.method==="POST"&&u.pathname==="/v1/cancel"){
    const b=await parseJson(req); if(!b.task_id) return error("INVALID_REQUEST","task_id required",400); const r=await gateCall(env,`/task/${encodeURIComponent(b.task_id)}/cancel`,"POST",{}); await release(env,b.task_id); return json({ok:r.ok,task:r.task||null});
  }
  if(req.method==="POST"&&u.pathname==="/v1/run"){
    const rate=await checkRate(env); if(!rate.ok) return error("RATE_LIMITED","Request budget exceeded",429,rate);
    const b=await parseJson(req); const taskId=String(b.task_id||b.request_id||rid()); const provider=String(b.provider||"").toLowerCase();
    if(!provider||!(provider in providers(env))) return error("INVALID_REQUEST","Known provider required",400);
    const acq=await acquire(env,taskId,"intelligence",Math.min(1800,int(b.timeout_seconds,300))); if(!acq.ok) return error("BUSY","Another intelligence task is active",409,acq.active);
    const ready=providers(env)[provider];
    if(!ready.configured){ await saveTask(env,taskId,{status:"failed",provider,error:"UPSTREAM_AUTH_FAILED",finished_at:now()}); await release(env,taskId); return error("UPSTREAM_AUTH_FAILED","Provider is not configured in Cloudflare secrets",503,{provider}); }
    await saveTask(env,taskId,{status:"accepted",provider,created_at:now(),request_id:b.request_id||null});
    await saveTask(env,taskId,{status:"failed",provider,error:"POLICY_DENIED",message:"No approved adapter operation supplied",finished_at:now()}); await release(env,taskId);
    return error("POLICY_DENIED","Use an approved provider adapter operation",403,{task_id:taskId,provider});
  }
  return error("INVALID_REQUEST","Route not found",404);
}
export default {async fetch(req,env,ctx){try{return await handle(req,env,ctx)}catch(e){return error(e.message||"INTERNAL_ERROR","Request failed",e.status||500)}}};
