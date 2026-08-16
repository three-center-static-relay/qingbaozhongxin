import app,{CenterGate} from "./production-guard.js";
import {runAdapter} from "./adapters.js";
export {CenterGate};

const ORIGIN="https://intelligence.internal";
const SERVICE="intelligence-worker";
const DEPLOYMENT_ATTESTATION="required-secrets-zenodo-kaggle-v1";
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});

async function readApp(path,env,ctx){
  const response=await app.fetch(new Request(`${ORIGIN}${path}`,{method:"GET"}),env,ctx);
  const body=await response.json().catch(()=>({ok:false,error:"ADMIN_BAD_JSON"}));
  return {http_status:response.status,body};
}

async function readGate(env){
  if(!env.CENTER_GATE?.get||!env.CENTER_GATE?.idFromName)return {ok:false,error:"CENTER_GATE_UNAVAILABLE",active:null};
  const gate=env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"));
  const response=await gate.fetch(new Request("https://gate.internal/state",{method:"GET"}));
  const body=await response.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}));
  return {http_status:response.status,...body};
}

function classifyZenodo403(error){
  if(Number(error?.details?.http_status)!==403)return null;
  const raw=String(error?.details?.body||"").trim();
  const lower=raw.toLowerCase();
  if(/ip address|ip has been blocked|you are being blocked|blocked.*support@zenodo\.org|contact.*support@zenodo\.org/.test(lower))return"IP_BLOCKED";
  if(/<!doctype html|<html|cloudflare|captcha|attention required|challenge|cf-ray/.test(lower))return"WAF_OR_HTML_FORBIDDEN";
  let parsed=null;try{parsed=JSON.parse(raw)}catch{}
  const message=String(parsed?.message||"").trim().toLowerCase();
  if(/scope|missing authorization|not authorized|permission/.test(message))return"AUTHORIZATION_SCOPE";
  if(parsed&&Number(parsed?.status)===403&&/^forbidden\.?$/.test(message))return"ZENODO_JSON_FORBIDDEN_GENERIC";
  if(parsed&&Number(parsed?.status)===403)return"ZENODO_JSON_OTHER_403";
  if(/^forbidden\.?$/.test(lower))return"GENERIC_FORBIDDEN";
  return"OTHER_403";
}

async function providerRuntimeSelftest(provider,env){
  const isZenodo=provider==="zenodo";
  const secretName=isZenodo?"ZENODO_TOKEN":"KAGGLE_API_TOKEN";
  const operation=isZenodo?"search":"datasets_search";
  const args=isZenodo?{query:"climate",limit:1,page:1,sort:"bestmatch"}:{query:"population",page:1,sort:"hottest"};
  const secretPresent=Boolean(String(env[secretName]||"").trim());
  try{
    const result=await runAdapter(provider,operation,args,env);
    const itemCount=Array.isArray(result?.items)?result.items.length:0;
    return json({ok:itemCount>0,selftest:`${provider}-runtime`,secret_present:secretPresent,upstream_http_status:200,item_count:itemCount,total:result?.total??null,error:null,upstream_error_class:null,secrets_redacted:true});
  }catch(error){
    return json({ok:false,selftest:`${provider}-runtime`,secret_present:secretPresent,upstream_http_status:Number(error?.details?.http_status)||null,error:String(error?.message||`${provider.toUpperCase()}_SELFTEST_FAILED`),adapter_status:Number(error?.status)||500,upstream_error_class:isZenodo?classifyZenodo403(error):null,secrets_redacted:true});
  }
}

async function adminContext(env,ctx){
  const health=await readApp("/health",env,ctx);
  const source=await readApp("/source",env,ctx);
  const acceptance=await readApp("/v1/acceptance/latest",env,ctx);
  const gate=await readGate(env);
  const version=env.CF_VERSION_METADATA||{};
  const ok=health.http_status===200&&health.body?.ok===true&&source.http_status===200&&source.body?.ok===true&&gate.ok===true;
  return json({ok,service:SERVICE,admin_read_only:true,deployment_attestation:DEPLOYMENT_ATTESTATION,observed_at:new Date().toISOString(),runtime_version:{id:version.id||null,tag:version.tag||null,timestamp:version.timestamp||null},health:health.body,source:source.body,acceptance:acceptance.body,active_task:gate.active||null,active_state_verified:gate.ok===true,secrets_redacted:true},ok?200:503);
}

export default{
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/zenodo-runtime")return providerRuntimeSelftest("zenodo",env);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/kaggle-runtime")return providerRuntimeSelftest("kaggle",env);
    if(req.method==="GET"&&url.pathname==="/v1/admin/context"){
      if(url.hostname!=="intelligence.internal")return json({ok:false,error:"POLICY_DENIED",message:"admin context is service-binding internal only"},403);
      return adminContext(env,ctx);
    }
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx)}
};