import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const run=async(operation,args={})=>{
  const task_id=`prod-mobility-${operation}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"mobilitydatabase",operation,timeout_seconds:30,args})});
  const body=await r.json().catch(()=>null);return{status:r.status,body};
};
const count=d=>Array.isArray(d)?d.length:["feeds","results","items","data"].map(k=>Array.isArray(d?.[k])?d[k].length:0).find(n=>n>0)||0;
const meta=await run("metadata");
assert.equal(meta.status,200,`metadata HTTP ${meta.status}: ${JSON.stringify(meta.body)}`);assert.equal(meta.body?.ok,true,JSON.stringify(meta.body));assert.ok(meta.body?.result?.data,"metadata missing");
const global=await run("gtfs_search",{limit:5});
assert.equal(global.status,200,`global GTFS HTTP ${global.status}: ${JSON.stringify(global.body)}`);assert.equal(global.body?.ok,true,JSON.stringify(global.body));assert.ok(count(global.body?.result?.data)>0,`global GTFS empty: ${JSON.stringify(global.body)}`);
const cn=await run("gtfs_search",{country_code:"CN",limit:20});
assert.equal(cn.status,200,`CN GTFS HTTP ${cn.status}: ${JSON.stringify(cn.body)}`);assert.equal(cn.body?.ok,true,JSON.stringify(cn.body));
console.log(JSON.stringify({ok:true,suite:"mobilitydatabase-production-e2e",metadata:true,global_gtfs_nonempty:true,china_query:true,china_sample_count:count(cn.body?.result?.data),secrets_redacted:true}));
