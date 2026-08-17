import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const cases=[
  ["ebi_ols","search",{query:"seizure",ontology:"hp",limit:3}],
  ["ncbi_clinvar","search",{query:"TP53[gene]",limit:3}]
];
let i=0;
for(const [provider,operation,args] of cases){
  const task_id=`fresh-ols-clinvar-20260817-${Date.now()}-${++i}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({task_id,provider,operation,args,timeout_seconds:90})});
  const b=await r.json().catch(()=>null);
  assert.equal(r.status,200,`${provider}:HTTP_${r.status}:${JSON.stringify(b)}`);
  assert.equal(b?.ok,true,`${provider}:NOT_OK:${JSON.stringify(b)}`);
  assert.match(String(b?.result_digest||""),/^[a-f0-9]{64}$/,`${provider}:NO_DIGEST`);
  if(Array.isArray(b?.result?.items))assert.ok(b.result.items.length>0,`${provider}:EMPTY_ITEMS`);
}
console.log(JSON.stringify({ok:true,suite:"fresh-ols-clinvar",providers:cases.map(x=>x[0]),count:2,real_upstream:true,patient_data:false}));
