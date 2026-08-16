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

async function zenodoRuntimeSelftest(env){
  const secretPresent=Boolean(String(env.ZENODO_TOKEN||"").trim());
  try{
    const result=await runAdapter("zenodo","search",{query:"climate",limit:1,page:1,sort:"bestmatch"},env);
    const itemCount=Array.isArray(result?.items)?result.items.length:0;
    return json({ok:itemCount>0,selftest:"zenodo-runtime",secret_present:secretPresent,upstream_http_status:200,item_count:itemCount,total:result?.total??null,error:null,secrets_redacted:true});
  }catch(error){
    return json({ok:false,selftest:"zenodo-runtime",secret_present:secretPresent,upstream_http_status:Number(error?.details?.http_status)||null,error:String(error?.message||"ZENODO_SELFTEST_FAILED"),adapter_status:Number(error?.status)||500,secrets_redacted:true});
  }
}

async function adminContext(env,ctx){
  const health=await readApp("/health",env,ctx);
  const source=await readApp("/source",env,ctx);
  const acceptance=await readApp("/v1/acceptance/latest",env,ctx);
  const gate=await readGate(env);
  const version=env.CF_VERSION_METADATA||{};
  const ok=health.http_status===200&&health.body?.ok===true&&source.http_status===200&&source.body?.ok===true&&gate.ok===true;
  return json({
    ok,
    service:SERVICE,
    admin_read_only:true,
    deployment_attestation:DEPLOYMENT_ATTESTATION,
    observed_at:new Date().toISOString(),
    runtime_version:{id:version.id||null,tag:version.tag||null,timestamp:version.timestamp||null},
    health:health.body,
    source:source.body,
    acceptance:acceptance.body,
    active_task:gate.active||null,
    active_state_verified:gate.ok===true,
    secrets_redacted:true
  },ok?200:503);
}

export default{
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/zenodo-runtime")return zenodoRuntimeSelftest(env);
    if(req.method==="GET"&&url.pathname==="/v1/admin/context"){
      if(url.hostname!=="intelligence.internal")return json({ok:false,error:"POLICY_DENIED",message:"admin context is service-binding internal only"},403);
      return adminContext(env,ctx);
    }
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx);
  }
};