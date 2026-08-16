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
  assert.equal(body?.upstream_error_class,"ZENODO_JSON_FORBIDDEN_GENERIC","Zenodo 403 must be the standard generic JSON Forbidden response for this diagnostic to pass");
  console.log(JSON.stringify({ok:true,diagnosis:"ZENODO_JSON_FORBIDDEN_GENERIC",secret_present:true,upstream_http_status:403,secrets_redacted:true}));
}finally{clearTimeout(timer)}
