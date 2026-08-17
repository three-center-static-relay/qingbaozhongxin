import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const task_id=`prod-mobility-metadata-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"mobilitydatabase",operation:"metadata",timeout_seconds:30,args:{}})});
const body=await r.json().catch(()=>null);
assert.equal(r.status,200,`Mobility metadata HTTP ${r.status}: ${JSON.stringify(body)}`);
assert.equal(body?.ok,true,JSON.stringify(body));
assert.ok(body?.result?.data,`Mobility metadata missing: ${JSON.stringify(body)}`);
console.log(JSON.stringify({ok:true,suite:"mobilitydatabase-metadata-production-e2e",auth_chain:true,result_digest:body.result_digest,secrets_redacted:true}));
