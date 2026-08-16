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
  assert.ok(Number.isInteger(body?.upstream_http_status)&&body.upstream_http_status>=400&&body.upstream_http_status<500,"Zenodo upstream error must be HTTP 4xx for this diagnostic to pass");
  console.log(JSON.stringify({ok:true,diagnosis:"ZENODO_UPSTREAM_4XX_CONFIRMED",secret_present:true,secrets_redacted:true}));
}finally{clearTimeout(timer)}
