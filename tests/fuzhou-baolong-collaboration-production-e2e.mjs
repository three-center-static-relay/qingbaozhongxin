import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const task_id=`baolong-tavily-${Date.now()}`;
const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"tavily",operation:"search",timeout_seconds:30,args:{query:"福州宝龙广场",limit:3}})});
const body=await r.json().catch(()=>null);
assert.equal(r.status,200,`TAVILY_SEARCH_HTTP_${r.status}:${JSON.stringify(body)}`);
assert.equal(body?.ok,true,`TAVILY_SEARCH_NOT_OK:${JSON.stringify(body)}`);
const items=body?.result?.items;assert.ok(Array.isArray(items)&&items.length>0,`TAVILY_SEARCH_EMPTY:${JSON.stringify(body)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"tavily_search_minimal",row_count:items.length,result_digest:body.result_digest,secrets_redacted:true}));
