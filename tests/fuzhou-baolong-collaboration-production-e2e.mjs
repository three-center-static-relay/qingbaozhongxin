import assert from "node:assert/strict";
const URL="https://intelligence-worker.a15280020511.workers.dev/v1/selftest/fuzhou-baolong-collaboration";
const r=await fetch(URL);const body=await r.json().catch(()=>null);
assert.ok(body&&Array.isArray(body.stages),`SELFTEST_BODY_MISSING HTTP ${r.status}: ${JSON.stringify(body)}`);
const stage=body.stages.find(x=>x.name==="network_intelligence"&&x.ok===true);
assert.ok(stage,`NETWORK_INTELLIGENCE_NO_PASS:${JSON.stringify(body.stages.filter(x=>x.name==="network_intelligence"))}`);
assert.ok((stage.summary?.row_count||0)>0,`NETWORK_INTELLIGENCE_EMPTY:${JSON.stringify(stage)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"network_intelligence",provider:stage.provider,row_count:stage.summary.row_count,top:stage.summary.top||[],secrets_redacted:true}));
