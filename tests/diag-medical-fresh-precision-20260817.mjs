import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const cases=[
  ["orphadata_api","by_gene_symbol",{gene_symbol:"TP53"}],
  ["ncbi_gtr","search",{query:"BRCA1[gene]",limit:3}],
  ["cpic_pgx","pairs",{gene_symbol:"CYP2C19",drug_name:"clopidogrel",limit:3}],
  ["civic_precision_oncology","assertions",{disease:"breast cancer",limit:3}],
  ["open_targets","search",{query:"breast cancer",entities:["disease"],limit:3}]
];
let i=0;
for(const [provider,operation,args] of cases){
  const task_id=`fresh-precision-20260817-${Date.now()}-${++i}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({task_id,provider,operation,args,timeout_seconds:90})});
  const b=await r.json().catch(()=>null);
  assert.equal(r.status,200,`${provider}:${operation}:HTTP_${r.status}:${JSON.stringify(b)}`);
  assert.equal(b?.ok,true,`${provider}:${operation}:NOT_OK:${JSON.stringify(b)}`);
  assert.match(String(b?.result_digest||""),/^[a-f0-9]{64}$/,`${provider}:NO_DIGEST`);
}
console.log(JSON.stringify({ok:true,suite:"fresh-precision-medical",providers:cases.map(x=>x[0]),count:cases.length,real_upstream:true,patient_data:false}));
