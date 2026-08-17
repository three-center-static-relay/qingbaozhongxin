import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const cases=[
  ["medlineplus_connect","lookup",{code_system:"loinc",code:"718-7"}],
  ["openfda_drug_label","search",{drug:"metformin",limit:2}],
  ["rxnorm","drugs_by_name",{name:"metformin",limit:3}],
  ["rxclass","classes_by_drug",{drug_name:"metformin",limit:3}],
  ["dailymed","search_labels",{drug_name:"metformin",limit:2}]
];
let i=0;
for(const [provider,operation,args] of cases){
  const task_id=`fresh-medication-20260817-${Date.now()}-${++i}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({task_id,provider,operation,args,timeout_seconds:90})});
  const b=await r.json().catch(()=>null);
  assert.equal(r.status,200,`${provider}:${operation}:HTTP_${r.status}:${JSON.stringify(b)}`);
  assert.equal(b?.ok,true,`${provider}:${operation}:NOT_OK:${JSON.stringify(b)}`);
  assert.match(String(b?.result_digest||""),/^[a-f0-9]{64}$/,`${provider}:NO_DIGEST`);
  if(Array.isArray(b?.result?.items))assert.ok(b.result.items.length>0,`${provider}:EMPTY_ITEMS`);
}
console.log(JSON.stringify({ok:true,suite:"fresh-medication-upstreams",providers:cases.map(x=>x[0]),count:cases.length,real_upstream:true,patient_data:false}));
