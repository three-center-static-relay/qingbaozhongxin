import assert from "node:assert/strict";
import fs from "node:fs";

const branches=JSON.parse(fs.readFileSync(new URL("../data-assets/intelligence-branch-registry.json",import.meta.url),"utf8"));
const medical=JSON.parse(fs.readFileSync(new URL("../data-assets/top-hospital-medical-branch.json",import.meta.url),"utf8"));
const index=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

assert.equal(branches.center,"intelligence-center");
assert.equal(branches.root_service,"intelligence-worker");
assert.ok(index.includes('SERVICE="intelligence-worker"'));
assert.ok(branches.branches.every(x=>x.type==="intelligence-subdomain"&&x.replaces_center===false));
for(const id of ["nasa-earth-space","top-hospital-medical","finance-markets","law-policy","geospatial-location","global-advisory"])assert.ok(branches.branches.some(x=>x.id===id),`missing branch ${id}`);

assert.equal(medical.parent,"intelligence-center");
assert.equal(medical.replaces_center,false);
assert.equal(medical.label_zh,"医学诊断分析与护理");
assert.equal(medical.capabilities?.diagnostic_analysis?.enabled,true);
assert.equal(medical.capabilities?.clinical_evidence_interpretation?.enabled,true);
assert.equal(medical.capabilities?.nursing_and_self_care?.enabled,true);

for(const field of ["ranked_differential_diagnosis","red_flags_and_urgency","nursing_and_self_care","uncertainty_and_information_gaps"]){
  assert.ok(medical.direct_output_contract?.includes(field),`missing direct medical output ${field}`);
}

for(const removed of ["routing_policy","medical_tool_registry","hospital_and_research_dataset_sources","top_hospital_open_research_anchors"]){
  assert.equal(Object.prototype.hasOwnProperty.call(medical,removed),false,`${removed} must remain removed from the direct-care branch`);
}

assert.ok(medical.authoritative_free_evidence_sources?.length>=10);
assert.ok(medical.excluded_scope?.includes("expert-center routing"));
assert.ok(medical.excluded_scope?.includes("compute-center routing"));
assert.ok(branches.invariants.some(x=>/medical branch does not create a separate orchestration, compute, expert or hospital workflow runtime/i.test(x)));

console.log(JSON.stringify({ok:true,root:branches.root_service,branches:branches.branches.length,medical_branch:"diagnosis-analysis-and-care",medical_sources:medical.authoritative_free_evidence_sources.length,legacy_medical_tool_registry_removed:true,legacy_research_dataset_layer_removed:true}));
