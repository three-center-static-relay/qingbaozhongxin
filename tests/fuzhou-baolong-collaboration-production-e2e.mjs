import assert from "node:assert/strict";
const URL="https://intelligence-worker.a15280020511.workers.dev/v1/provider/tencent_maps/readiness";
const r=await fetch(URL);const body=await r.json().catch(()=>null);
assert.equal(r.status,200,`TENCENT_READINESS_HTTP_${r.status}:${JSON.stringify(body)}`);
assert.equal(body?.ok,true,`TENCENT_READINESS_NOT_OK:${JSON.stringify(body)}`);
assert.equal(body?.provider,"tencent_maps",JSON.stringify(body));
assert.equal(body?.configured,true,`TENCENT_MAPS_NOT_CONFIGURED:${JSON.stringify(body)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"tencent_readiness",configured:true,operations:body.operations||[],secrets_redacted:true}));
