import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const nonce=`med-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
const cases=[
["who_icd11","search",{query:"type 2 diabetes mellitus",limit:3}],
["umls_uts","search",{query:"type 2 diabetes mellitus",limit:3}],
["medlineplus_connect","lookup",{code_system:"loinc",code:"718-7"}],
["openfda_drug_label","search",{drug:"metformin",limit:3}],
["rxclass","classes_by_drug",{drug_name:"metformin",limit:5}],
["pubtator3","entity_autocomplete",{query:"metformin",concept:"chemical"}],
["monarch_api","search",{query:"Marfan syndrome",limit:3}],
["ebi_ols","search",{query:"seizure",ontology:"hp",limit:3}],
["ncbi_clinvar","search",{query:"TP53[gene]",limit:3}],
["orphadata_api","by_gene_symbol",{gene_symbol:"TP53"}],
["nci_evs","search",{query:"breast carcinoma",limit:3}],
["civic_precision_oncology","assertions",{disease:"breast cancer",limit:3}],
["open_targets","search",{query:"breast cancer",entities:["disease"],limit:3}],
["rxnorm","drugs_by_name",{name:"metformin",limit:5}],
["dailymed","search_labels",{drug_name:"metformin",limit:3}],
["ncbi_gtr","search",{query:"BRCA1[gene]",limit:3}],
["cpic_pgx","pairs",{gene_symbol:"CYP2C19",drug_name:"clopidogrel",limit:3}],
["medical_clinical_calculators","bmi",{weight_kg:70,height_m:1.75}],
["medical_top_tier_search","search",{query:"acute chest pain differential diagnosis guideline",specialty:"cardiology",mode:"differential diagnosis",limit_per_engine:3}]
];
const receipts=[];let i=0;
for(const [provider,operation,args] of cases){const task_id=`${nonce}-${++i}`;const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({task_id,provider,operation,args,timeout_seconds:120})});const b=await r.json().catch(()=>null);assert.equal(r.status,200,`RUN_HTTP_${provider}_${operation}_${r.status}:${JSON.stringify(b)}`);assert.equal(b?.ok,true,`RUN_NOT_OK_${provider}_${operation}:${JSON.stringify(b)}`);assert.match(String(b?.result_digest||""),/^[a-f0-9]{64}$/);receipts.push({provider,operation,digest:b.result_digest});}
console.log(JSON.stringify({ok:true,suite:"top-hospital-fresh-only",execution_count:receipts.length,providers:receipts.map(x=>x.provider),patient_data_used:false}));