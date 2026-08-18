const MAX_BYTES=1500000;
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const finiteOrNull=v=>v===null||v===undefined||v===""?null:(Number.isFinite(Number(v))?Number(v):null);
function modelId(v){const s=text(v,220);if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(s))throw Object.assign(new Error("INVALID_HF_MODEL_ID"),{status:400});return s}
function headers(env){const h={accept:"application/json"};if(env?.HUGGINGFACE_TOKEN)h.authorization=`Bearer ${env.HUGGINGFACE_TOKEN}`;return h}
async function fetchJson(url,env){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
  try{
    const r=await fetch(url,{signal:c.signal,headers:headers(env)});
    const raw=await r.text();
    if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});
    return body;
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
function provider(p){
  const pricing=p?.pricing&&typeof p.pricing==="object"?{input:finiteOrNull(p.pricing.input),output:finiteOrNull(p.pricing.output)}:{input:null,output:null};
  const zeroPriced=pricing.input===0&&pricing.output===0;
  const explicitFree=typeof p?.is_free==="boolean"?p.is_free:null;
  const evidence=explicitFree===true?"provider_promo_free":zeroPriced?"zero_price_candidate":explicitFree===false?"provider_not_marked_free":"unknown";
  return {
    provider:text(p?.provider,80)||null,
    status:text(p?.status,24)||null,
    is_free:explicitFree,
    pricing,
    zero_priced:zeroPriced,
    free_evidence:evidence,
    requires_vendor_confirmation:explicitFree!==true&&zeroPriced,
    context_length:finiteOrNull(p?.context_length),
    supports_tools:typeof p?.supports_tools==="boolean"?p.supports_tools:null,
    supports_structured_output:typeof p?.supports_structured_output==="boolean"?p.supports_structured_output:null,
    first_token_latency_ms:finiteOrNull(p?.first_token_latency_ms),
    throughput:finiteOrNull(p?.throughput),
    is_model_author:typeof p?.is_model_author==="boolean"?p.is_model_author:null
  };
}
function model(m){
  const providers=Array.isArray(m?.providers)?m.providers.map(provider):[];
  const promo=providers.filter(p=>p.is_free===true);
  const zero=providers.filter(p=>p.zero_priced===true);
  const candidates=providers.filter(p=>p.is_free===true||p.zero_priced===true);
  const explicit=providers.filter(p=>typeof p.is_free==="boolean");
  const status=promo.length?"provider_promo_free":zero.length?"zero_price_candidate":explicit.length===providers.length&&providers.length?"not_free":"unknown";
  return {
    id:text(m?.id,220)||null,
    object:text(m?.object,40)||null,
    created:finiteOrNull(m?.created),
    owned_by:text(m?.owned_by,120)||null,
    architecture:m?.architecture&&typeof m.architecture==="object"?m.architecture:null,
    providers,
    promo_free_providers:promo,
    zero_priced_providers:zero,
    free_candidate_providers:candidates,
    explicit_free_signal_count:explicit.length,
    promo_free_provider_count:promo.length,
    zero_priced_provider_count:zero.length,
    free_candidate_provider_count:candidates.length,
    free_radar_status:status,
    requires_vendor_confirmation:promo.length===0&&zero.length>0
  };
}
async function list(env){
  const body=await fetchJson("https://router.huggingface.co/v1/models",env);
  if(!Array.isArray(body?.data))throw Object.assign(new Error("HF_ROUTER_LIST_SCHEMA_MISMATCH"),{status:502});
  return body.data.map(model);
}
function filter(items,args={},candidateOnly=false){
  const q=text(args.query,220).toLowerCase(),wantedProvider=text(args.provider,80).toLowerCase();
  const liveOnly=args.live_only===true,toolsOnly=args.supports_tools===true,structuredOnly=args.supports_structured_output===true;
  return items.filter(m=>{
    if(q&&!String(m.id||"").toLowerCase().includes(q))return false;
    let ps=m.providers||[];
    if(wantedProvider)ps=ps.filter(p=>String(p.provider||"").toLowerCase()===wantedProvider);
    if(liveOnly)ps=ps.filter(p=>p.status==="live");
    if(toolsOnly)ps=ps.filter(p=>p.supports_tools===true);
    if(structuredOnly)ps=ps.filter(p=>p.supports_structured_output===true);
    if(candidateOnly)ps=ps.filter(p=>p.is_free===true||p.zero_priced===true);
    return wantedProvider||liveOnly||toolsOnly||structuredOnly||candidateOnly?ps.length>0:true;
  });
}
export const OPERATIONS={huggingface:["router_models","router_model","free_models","free_candidates"]};
export async function runAdapter(providerName,operation,args={},env={}){
  if(providerName!=="huggingface"||!OPERATIONS.huggingface.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const items=await list(env);
  if(operation==="router_model"){
    const id=modelId(args.model_id),item=items.find(m=>m.id===id);
    if(!item)throw Object.assign(new Error("HF_ROUTER_MODEL_NOT_FOUND"),{status:404});
    return {provider:"huggingface",operation,source:"hf-router-v1-models-list-filter",pricing_unit:"USD_per_million_tokens",free_semantics:"is_free=true means provider promotional/current free signal; zero input+output pricing is a free candidate requiring vendor confirmation",item};
  }
  const candidateOnly=operation==="free_models"||operation==="free_candidates"||args.free_only===true;
  const limit=clamp(args.limit,1,100,20),filtered=filter(items,args,candidateOnly).slice(0,limit);
  return {provider:"huggingface",operation,source:"hf-router-v1-models",pricing_unit:"USD_per_million_tokens",free_semantics:"radar candidates include is_free=true or zero input+output pricing; zero-priced candidates require vendor confirmation",total_seen:items.length,matched:filtered.length,items:filtered};
}
