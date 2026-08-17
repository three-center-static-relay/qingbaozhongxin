import assert from "node:assert/strict";
const URL="https://intelligence-worker.a15280020511.workers.dev/v1/selftest/fuzhou-baolong-collaboration";
const r=await fetch(URL);const body=await r.json().catch(()=>null);
assert.ok(body&&Array.isArray(body.stages),`SELFTEST_BODY_MISSING HTTP ${r.status}: ${JSON.stringify(body)}`);
const stage=body.stages.find(x=>x.name==="baidu_traffic");
assert.ok(stage,`BAIDU_TRAFFIC_STAGE_MISSING:${JSON.stringify(body)}`);
assert.equal(stage.ok,true,`BAIDU_TRAFFIC_FAIL:${JSON.stringify(stage)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"baidu_traffic",summary:stage.summary||null,secrets_redacted:true}));
