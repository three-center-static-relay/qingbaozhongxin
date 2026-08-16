import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),30000);
try{
  const response=await fetch(`${BASE}/v1/selftest/zenodo-runtime`,{signal:controller.signal,headers:{accept:"application/json"}});
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200);
  assert.equal(body?.selftest,"zenodo-runtime");
  assert.equal(body?.secret_present,true);
  assert.equal(body?.ok,false);
  assert.equal(body?.upstream_http_status,403);
  assert.equal(body?.upstream_error_class,"ZENODO_JSON_OTHER_403","Zenodo 403 must be a structured non-scope JSON error for this diagnostic to pass");
  console.log(JSON.stringify({ok:true,diagnosis:"ZENODO_JSON_OTHER_403",secret_present:true,upstream_http_status:403,secrets_redacted:true}));
}finally{clearTimeout(timer)}
