import assert from "node:assert/strict";

const url="https://intelligence-worker.a15280020511.workers.dev/v1/selftest/modelscope-runtime";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),30000);
try{
  const r=await fetch(url,{headers:{accept:"application/json"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(r.status,200,`ModelScope intelligence production selftest HTTP ${r.status}: ${JSON.stringify(body)}`);
  assert.equal(body?.ok,true);
  assert.equal(body?.secret_present,true);
  assert.equal(body?.authenticated,true);
  assert.equal(body?.models_ok,true);
  assert.equal(body?.models_nonempty,true);
  assert.ok(Number(body?.models_payload_bytes)>2);
  assert.match(String(body?.models_payload_digest||""),/^[a-f0-9]{64}$/);
  assert.equal(body?.datasets_ok,true);
  assert.equal(body?.datasets_nonempty,true);
  assert.ok(Number(body?.datasets_payload_bytes)>2);
  assert.match(String(body?.datasets_payload_digest||""),/^[a-f0-9]{64}$/);
  assert.equal(body?.skills_ok,true);
  assert.equal(body?.studios_ok,true);
  console.log(JSON.stringify({ok:true,suite:"modelscope-nonempty-production-e2e",center:"intelligence",authenticated:true,models_ok:true,models_nonempty:true,models_payload_bytes:body?.models_payload_bytes,datasets_ok:true,datasets_nonempty:true,datasets_payload_bytes:body?.datasets_payload_bytes,skills_ok:true,studios_ok:true,secrets_redacted:true}));
}finally{clearTimeout(timer)}
