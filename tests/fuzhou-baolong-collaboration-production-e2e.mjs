import assert from "node:assert/strict";
const URL="https://intelligence-worker.a15280020511.workers.dev/v1/selftest/fuzhou-baolong-collaboration";
const r=await fetch(URL);const body=await r.json().catch(()=>null);
assert.ok(body&&Array.isArray(body.stages),`SELFTEST_BODY_MISSING HTTP ${r.status}: ${JSON.stringify(body)}`);
const stage=body.stages.find(x=>x.name==="tencent_target");
assert.ok(stage,`TENCENT_TARGET_STAGE_MISSING:${JSON.stringify(body)}`);
assert.equal(stage.ok,true,`TENCENT_TARGET_FAIL:${JSON.stringify(stage)}`);
assert.ok((stage.summary?.row_count||0)>0,`TENCENT_TARGET_EMPTY:${JSON.stringify(stage)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"tencent_target",row_count:stage.summary.row_count,secrets_redacted:true}));
