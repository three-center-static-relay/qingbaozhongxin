import assert from "node:assert/strict";

const url="https://intelligence-worker.a15280020511.workers.dev/v1/selftest/modelscope-runtime";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),25000);
try{
  const r=await fetch(url,{headers:{accept:"application/json"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(r.status,200,`ModelScope intelligence production selftest HTTP ${r.status}: ${JSON.stringify(body)}`);
  assert.equal(body?.ok,true);
  assert.equal(body?.secret_present,true);
  assert.equal(body?.authenticated,true);
  assert.equal(body?.models_ok,true);
  assert.equal(body?.datasets_ok,true);
  assert.equal(body?.skills_ok,true);
  assert.equal(body?.studios_ok,true);
  console.log(JSON.stringify({ok:true,suite:"modelscope-production-live-probe",center:"intelligence",authenticated:true,models_ok:true,datasets_ok:true,skills_ok:true,studios_ok:true,models_count:body?.models_count??null,datasets_count:body?.datasets_count??null,skills_count:body?.skills_count??null,studios_count:body?.studios_count??null,secrets_redacted:true}));
}finally{clearTimeout(timer)}
