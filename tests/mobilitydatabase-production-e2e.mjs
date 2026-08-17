import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const r=await fetch(`${BASE}/v1/provider/mobilitydatabase/readiness`);
const body=await r.json().catch(()=>null);
assert.equal(r.status,200,`MobilityDatabase readiness HTTP ${r.status}: ${JSON.stringify(body)}`);
assert.equal(body?.ok,true,JSON.stringify(body));
assert.equal(body?.provider,"mobilitydatabase",JSON.stringify(body));
assert.equal(body?.configured,true,`MobilityDatabase not configured: ${JSON.stringify(body)}`);
console.log(JSON.stringify({ok:true,suite:"mobilitydatabase-readiness-production",configured:true,operations:body.operations||[],secrets_redacted:true}));
