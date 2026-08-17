import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const r=await fetch(`${BASE}/v1/provider/geonames/readiness`);
const body=await r.json().catch(()=>null);
assert.equal(r.status,200,`GeoNames readiness HTTP ${r.status}: ${JSON.stringify(body)}`);
assert.equal(body?.ok,true,JSON.stringify(body));
assert.equal(body?.provider,"geonames",JSON.stringify(body));
assert.equal(body?.configured,true,`GeoNames not configured: ${JSON.stringify(body)}`);
console.log(JSON.stringify({ok:true,suite:"geonames-readiness-production",configured:true,operations:body.operations||[],secrets_redacted:true}));
