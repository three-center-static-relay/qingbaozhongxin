import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const timeoutMs=30000;

const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),timeoutMs);
try{
  const response=await fetch(`${BASE}/v1/selftest/zenodo-runtime`,{signal:controller.signal,headers:{accept:"application/json"}});
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200,"Zenodo runtime selftest endpoint must return HTTP 200");
  assert.equal(body?.selftest,"zenodo-runtime");
  assert.equal(body?.secret_present,true,"ZENODO_TOKEN must be present in production runtime");
  assert.equal(body?.ok,false,"This diagnostic expects the current Zenodo upstream selftest to fail");
  assert.equal(body?.error,"UPSTREAM_HTTP_ERROR");
  assert.equal(body?.upstream_http_status,403,"Zenodo upstream must return HTTP 403 for this diagnostic to pass");
  console.log(JSON.stringify({ok:true,diagnosis:"ZENODO_UPSTREAM_403_CONFIRMED",secret_present:true,secrets_redacted:true}));
}finally{clearTimeout(timer)}
