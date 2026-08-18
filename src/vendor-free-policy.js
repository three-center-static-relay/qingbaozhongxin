const MAX_BYTES=2000000;
const TIMEOUT_MS=15000;
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
    evidence_label:"GLM-4.7-Flash",
    evidence_pattern:/\bFree\b/i,
    evidence_window_bytes:2500,
    policy_note:"Z.AI primary pricing documentation marks GLM-4.7-Flash as Free for vendor-direct API access; this does not imply Hugging Face Router routes are free."
  }
};

export function vendorPolicyFor(modelId){
  return VENDOR_FREE_POLICIES[text(modelId,220)]||null;
}

async function fetchText(url){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);
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

  const {http_status,raw}=await fetchText(policy.primary_source);
  const idx=raw.indexOf(policy.evidence_label);
  const window=idx>=0?raw.slice(idx,Math.min(raw.length,idx+policy.evidence_window_bytes)):"";
  const modelFound=idx>=0,freeEvidence=modelFound&&policy.evidence_pattern.test(window);
  const keyPresent=Boolean(String(env?.[policy.required_secret]||"").trim());

  return {
    model_id:policy.model_id,
    vendor:policy.vendor,
    vendor_policy_available:true,
    vendor_free_verified:freeEvidence,
    vendor_free_status:freeEvidence?"vendor_confirmed_free":"not_confirmed",
    evidence:{
      source_type:"vendor_primary_pricing",
      source:policy.primary_source,
      http_status,
      model_found:modelFound,
      free_evidence_found:freeEvidence,
      observed_at:new Date().toISOString()
    },
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
