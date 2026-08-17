import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const aliases=["福州宝龙广场","宝龙城市广场","宝龙广场","福州台江宝龙广场"];
let winner=null,last=null;
for(let i=0;i<aliases.length;i++){
  const keyword=aliases[i],task_id=`baolong-tencent-alias-${Date.now()}-${i}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"tencent_maps",operation:"place_text",timeout_seconds:30,args:{keyword,region:"福州",limit:8}})});
  const body=await r.json().catch(()=>null);last={keyword,status:r.status,body};
  const rows=body?.result?.data?.data;
  if(r.status===200&&body?.ok===true&&Array.isArray(rows)&&rows.length>0){winner={keyword,row_count:rows.length,title:rows[0]?.title||null,result_digest:body.result_digest};break}
}
assert.ok(winner,`TENCENT_ALIAS_ALL_FAILED:${JSON.stringify(last)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"tencent_alias_search",winner,secrets_redacted:true}));
