const MAX_BYTES=2000000;
const SOURCE_TIMEOUT_MS=8000;
const text=(v,n=300)=>String(v??"").trim().slice(0,n);

export const VENDOR_FREE_POLICIES={
  "zai-org/GLM-4.7-Flash":{
    vendor:"Z.AI",
    model_id:"zai-org/GLM-4.7-Flash",
    api_model:"glm-4.7-flash",
    provider_owner:"zai-org",
    access_mode:"vendor_direct_api",
    required_secret:"ZAI_API_KEY",
    registration_url:"https://z.ai/manage-apikey/apikey-list",
    api_base_url:"https://api.z.ai/api/paas/v4/",
    primary_source:"https://docs.z.ai/guides/overview/pricing",
    sources:[
      {
        source_type:"vendor_primary_pricing",
        url:"https://docs.z.ai/guides/overview/pricing",
        evidence_label:"GLM-4.7-Flash",
        evidence_pattern:/\bFree\b/i,
        evidence_window_bytes:2500
      },
      {
        source_type:"vendor_primary_model_guide",
        url:"https://docs.z.ai/guides/llm/glm-4.7",
        evidence_label:"GLM-4.7-Flash",
        evidence_pattern:/\bCompletely Free\b/i,
        evidence_window_bytes:5000
      },
      {
        source_type:"vendor_primary_release_note",
        url:"https://docs.z.ai/release-notes/new-released",
        evidence_label:"GLM-4.7-Flash",
        evidence_pattern:/\bfree-tier version\b/i,
        evidence_window_bytes:4000
      }
    ],
    policy_note:"Z.AI primary documentation identifies GLM-4.7-Flash as free for vendor-direct API access; this does not imply Hugging Face Router routes are free."
  }
};

export function vendorPolicyFor(modelId){
  return VENDOR_FREE_POLICIES[text(modelId,220)]||null;
}

async function fetchText(url){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),SOURCE_TIMEOUT_MS);
  try{
    const r=await fetch(url,{signal:c.signal,headers:{accept:"text/html,text/plain;q=0.9,*/*;q=0.1"}});
    const raw=await r.text();
    if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(new Error("VENDOR_POLICY_RESPONSE_TOO_LARGE"),{status:502});
    if(!r.ok)throw Object.assign(new Error("VENDOR_POLICY_UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});
    return {http_status:r.status,raw};
  }catch(e){
    if(e?.name==="AbortError")throw Object.assign(new Error("VENDOR_POLICY_TIMEOUT"),{status:504});
    throw e;
  }finally{clearTimeout(timer)}
}

function inspectEvidence(raw,source){
  const idx=raw.indexOf(source.evidence_label);
  const window=idx>=0?raw.slice(idx,Math.min(raw.length,idx+source.evidence_window_bytes)):"";
  const modelFound=idx>=0,freeEvidence=modelFound&&source.evidence_pattern.test(window);
  return {model_found:modelFound,free_evidence_found:freeEvidence};
}

async function verifySource(source){
  const observedAt=new Date().toISOString();
  try{
    const {http_status,raw}=await fetchText(source.url);
    const evidence=inspectEvidence(raw,source);
    return {
      source_type:source.source_type,
      source:source.url,
      http_status,
      ...evidence,
      reachable:true,
      error:null,
      observed_at:observedAt
    };
  }catch(error){
    return {
      source_type:source.source_type,
      source:source.url,
      http_status:Number(error?.details?.http_status)||null,
      model_found:false,
      free_evidence_found:false,
      reachable:false,
      error:String(error?.message||"VENDOR_POLICY_SOURCE_FAILED"),
      observed_at:observedAt
    };
  }
}

export async function verifyVendorFree(modelId,env={}){
  const policy=vendorPolicyFor(modelId);
  if(!policy)return {
    model_id:text(modelId,220),
    vendor_policy_available:false,
    vendor_free_verified:false,
    vendor_free_status:"unverified",
    registration_required:null,
    required_secret:null,
    secrets_redacted:true
  };

  const sourceConfigs=Array.isArray(policy.sources)&&policy.sources.length?policy.sources:[{
    source_type:"vendor_primary_pricing",
    url:policy.primary_source,
    evidence_label:policy.evidence_label,
    evidence_pattern:policy.evidence_pattern,
    evidence_window_bytes:policy.evidence_window_bytes||2500
  }];
  const attempts=[];
  let confirmed=null;
  for(const source of sourceConfigs){
    const attempt=await verifySource(source);
    attempts.push(attempt);
    if(attempt.free_evidence_found){confirmed=attempt;break}
  }

  const reachableCount=attempts.filter(x=>x.reachable).length;
  const keyPresent=Boolean(String(env?.[policy.required_secret]||"").trim());
  const verified=Boolean(confirmed);
  const status=verified?"vendor_confirmed_free":reachableCount>0?"not_confirmed":"unverified";
  const selected=confirmed||attempts.find(x=>x.reachable)||attempts[0]||null;

  return {
    model_id:policy.model_id,
    vendor:policy.vendor,
    vendor_policy_available:true,
    vendor_free_verified:verified,
    vendor_free_status:status,
    evidence:selected?{
      source_type:selected.source_type,
      source:selected.source,
      http_status:selected.http_status,
      model_found:selected.model_found,
      free_evidence_found:selected.free_evidence_found,
      observed_at:selected.observed_at
    }:null,
    source_attempts:attempts,
    source_count:sourceConfigs.length,
    sources_checked:attempts.length,
    reachable_source_count:reachableCount,
    verification_degraded:attempts.some(x=>!x.reachable),
    access:{
      mode:policy.access_mode,
      api_model:policy.api_model,
      api_base_url:policy.api_base_url,
      required_secret:policy.required_secret,
      key_present:keyPresent,
      registration_required:!keyPresent,
      registration_url:policy.registration_url
    },
    router_free_inference:false,
    policy_note:policy.policy_note,
    secrets_redacted:true
  };
}
