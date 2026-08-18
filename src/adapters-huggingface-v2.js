import {vendorPolicyFor,verifyVendorFree} from "./vendor-free-policy.js";

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
  const author=typeof p?.is_model_author==="boolean"?p.is_model_author:null;
  const evidence=explicitFree===true?"provider_promo_free":zeroPriced?"zero_price_candidate":author===true?"vendor_check_candidate":explicitFree===false?"provider_not_marked_free":"unknown";
  return {
    provider:text(p?.provider,80)||null,
    status:text(p?.status,24)||null,
    is_free:explicitFree,
    free_status:explicitFree===true?"free":explicitFree===false?"not_free":"unknown",
    pricing,
    zero_priced:zeroPriced,
    free_evidence:evidence,
    requires_vendor_confirmation:explicitFree!==true&&(zeroPriced||author===true),
    context_length:finiteOrNull(p?.context_length),
    supports_tools:typeof p?.supports_tools==="boolean"?p.supports_tools:null,
    supports_structured_output:typeof p?.supports_structured_output==="boolean"?p.supports_structured_output:null,
    first_token_latency_ms:finiteOrNull(p?.first_token_latency_ms),
    throughput:finiteOrNull(p?.throughput),
    is_model_author:author
  };
}
function model(m){
  const id=text(m?.id,220)||null;
  const providers=Array.isArray(m?.providers)?m.providers.map(provider):[];
  const promo=providers.filter(p=>p.is_free===true);
  const zero=providers.filter(p=>p.zero_priced===true);
  const vendorCheck=providers.filter(p=>p.is_model_author===true&&p.is_free!==true&&!p.zero_priced);
  const candidates=providers.filter(p=>p.is_free===true||p.zero_priced===true||p.is_model_author===true);
  const explicit=providers.filter(p=>typeof p.is_free==="boolean");
  const policy=vendorPolicyFor(id);
  const radarStatus=promo.length?"provider_promo_free":zero.length?"zero_price_candidate":policy||vendorCheck.length?"vendor_check_candidate":explicit.length===providers.length&&providers.length?"not_free":"unknown";
  const legacyFreeStatus=promo.length?"free":zero.length?"candidate":radarStatus==="not_free"?"not_free":"unknown";
  return {
    id,
    object:text(m?.object,40)||null,
    created:finiteOrNull(m?.created),
    owned_by:text(m?.owned_by,120)||null,
    architecture:m?.architecture&&typeof m.architecture==="object"?m.architecture:null,
    providers,
    promo_free_providers:promo,
    zero_priced_providers:zero,
    vendor_check_providers:vendorCheck,
    free_candidate_providers:candidates,
    explicit_free_signal_count:explicit.length,
    promo_free_provider_count:promo.length,
    zero_priced_provider_count:zero.length,
    vendor_check_provider_count:vendorCheck.length,
    free_candidate_provider_count:candidates.length,
    vendor_policy_available:Boolean(policy),
    free_radar_status:radarStatus,
    requires_vendor_confirmation:promo.length===0&&(zero.length>0||vendorCheck.length>0||Boolean(policy)),
    free_providers:promo,
    free_provider_count:promo.length,
    has_explicit_free_provider:promo.length>0,
    unknown_free_status_provider_count:providers.filter(p=>p.is_free===null).length,
    free_status:legacyFreeStatus
  };
}
async function list(env){
  const body=await fetchJson("https://router.huggingface.co/v1/models",env);
  if(!Array.isArray(body?.data))throw Object.assign(new Error("HF_ROUTER_LIST_SCHEMA_MISMATCH"),{status:502});
  return body.data.map(model);
}
function matchesFilters(m,args={},mode="all"){
  const q=text(args.query,220).toLowerCase(),wantedProvider=text(args.provider,80).toLowerCase();
  const liveOnly=args.live_only===true,toolsOnly=args.supports_tools===true,structuredOnly=args.supports_structured_output===true;
  if(q&&!String(m.id||"").toLowerCase().includes(q))return false;
  let ps=m.providers||[];
  if(wantedProvider)ps=ps.filter(p=>String(p.provider||"").toLowerCase()===wantedProvider);
  if(liveOnly)ps=ps.filter(p=>p.status==="live");
  if(toolsOnly)ps=ps.filter(p=>p.supports_tools===true);
  if(structuredOnly)ps=ps.filter(p=>p.supports_structured_output===true);
  if(mode==="hf-free")ps=ps.filter(p=>p.is_free===true||p.zero_priced===true);
  if(mode==="candidate")ps=ps.filter(p=>p.is_free===true||p.zero_priced===true||p.is_model_author===true);
  if(mode==="vendor-check")ps=ps.filter(p=>p.is_model_author===true&&p.is_free!==true&&!p.zero_priced);
  return wantedProvider||liveOnly||toolsOnly||structuredOnly||mode!=="all"?ps.length>0:true;
}
function publicVendorPolicy(modelIdValue){
  const p=vendorPolicyFor(modelIdValue);if(!p)return null;
  return {vendor:p.vendor,access_mode:p.access_mode,api_model:p.api_model,required_secret:p.required_secret,registration_url:p.registration_url,primary_source:p.primary_source};
}
function publicRouterError(error){
  if(!error)return null;
  return {code:text(error?.message||"HF_ROUTER_FAILED",120),http_status:Number(error?.details?.http_status)||null,status:Number(error?.status)||null};
}
export const OPERATIONS={huggingface:["router_models","router_model","free_models","free_candidates","vendor_check_candidates","vendor_free_status","free_model_status"]};
export async function runAdapter(providerName,operation,args={},env={}){
  if(providerName!=="huggingface"||!OPERATIONS.huggingface.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  if(operation==="vendor_free_status")return {provider:"huggingface",operation,...await verifyVendorFree(modelId(args.model_id),env)};
  if(operation==="free_model_status"){
    const id=modelId(args.model_id);
    const [routerOutcome,vendor]=await Promise.all([
      (async()=>{try{const items=await list(env),item=items.find(m=>m.id===id);if(!item)throw Object.assign(new Error("HF_ROUTER_MODEL_NOT_FOUND"),{status:404});return {item,error:null}}catch(error){return {item:null,error}}})(),
      verifyVendorFree(id,env)
    ]);
    const item=routerOutcome.item,routerError=routerOutcome.error;
    if(vendor.vendor_free_verified){
      return {provider:"huggingface",operation,model_id:id,final_free_status:"vendor_confirmed_free",recommended_access:"vendor_direct_api",router:item,router_evidence_available:Boolean(item),router_error:publicRouterError(routerError),vendor,paid_fallback_allowed:false,secrets_redacted:true};
    }
    if(routerError)throw routerError;
    const status=item.promo_free_provider_count>0?"provider_promo_free":item.zero_priced_provider_count>0?"zero_price_candidate":"not_confirmed_free";
    const recommendedAccess=item.promo_free_provider_count>0?"hf_router_free_provider":item.zero_priced_provider_count>0?"hf_router_zero_price_candidate":"none";
    return {provider:"huggingface",operation,model_id:id,final_free_status:status,recommended_access:recommendedAccess,router:item,router_evidence_available:true,router_error:null,vendor,paid_fallback_allowed:false,secrets_redacted:true};
  }
  const items=await list(env);
  if(operation==="router_model"){
    const id=modelId(args.model_id),item=items.find(m=>m.id===id);
    if(!item)throw Object.assign(new Error("HF_ROUTER_MODEL_NOT_FOUND"),{status:404});
    return {provider:"huggingface",operation,source:"hf-router-v1-models-list-filter",pricing_unit:"USD_per_million_tokens",free_semantics:"HF route evidence and vendor-direct free evidence are separate; is_free=true is provider current/promo free",vendor_policy:publicVendorPolicy(id),item};
  }
  let mode="all";
  if(operation==="free_models")mode="hf-free";
  if(operation==="free_candidates")mode="candidate";
  if(operation==="vendor_check_candidates")mode="vendor-check";
  if(args.free_only===true&&mode==="all")mode="hf-free";
  const limit=clamp(args.limit,1,100,20),filtered=items.filter(m=>matchesFilters(m,args,mode)).slice(0,limit);
  return {provider:"huggingface",operation,source:"hf-router-v1-models",pricing_unit:"USD_per_million_tokens",free_semantics:"free_candidates may include model-author routes requiring vendor-primary verification; free_models is limited to HF is_free=true or explicit zero-price route evidence",total_seen:items.length,matched:filtered.length,items:filtered};
}
