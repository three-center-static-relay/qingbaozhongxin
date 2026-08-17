import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const r=await fetch(`${BASE}/v1/dataset-sources/status`,{headers:{accept:"application/json"}});
const b=await r.json().catch(()=>null);
assert.equal(r.status,200,`STATUS_HTTP_${r.status}:${JSON.stringify(b)}`);
assert.equal(b?.ok,true);
const x=b.sources?.find(x=>x.id==="modelscope");
assert.equal(x?.status,"LIVE",`modelscope:${JSON.stringify(x)}`);
console.log(JSON.stringify({ok:true,suite:"modelscope-production-connectivity",status:x?.status,secrets_redacted:true}));
