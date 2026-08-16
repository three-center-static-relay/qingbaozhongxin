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
  assert.equal(body?.ok,true,`Zenodo upstream selftest failed: ${body?.error||"unknown"}`);
  assert.equal(body?.upstream_http_status,200,"Zenodo upstream must return HTTP 200");
  assert.ok(Number(body?.item_count)>0,"Zenodo upstream must return non-empty real records");
  console.log(JSON.stringify({ok:true,provider:"zenodo",adapter_e2e:true,secret_present:true,upstream_http_status:body.upstream_http_status,item_count:body.item_count,secrets_redacted:true}));
}finally{clearTimeout(timer)}
