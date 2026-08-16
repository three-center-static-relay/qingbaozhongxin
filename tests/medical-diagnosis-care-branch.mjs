import assert from "node:assert/strict";
import fs from "node:fs";

const branch=JSON.parse(fs.readFileSync(new URL("../data-assets/top-hospital-medical-branch.json",import.meta.url),"utf8"));
const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/intelligence-branch-registry.json",import.meta.url),"utf8"));

assert.equal(branch.branch_id,"top-hospital-medical");
assert.equal(branch.label_zh,"医学诊断分析与护理");
assert.equal(branch.capabilities?.diagnostic_analysis?.enabled,true);
assert.equal(branch.capabilities?.clinical_evidence_interpretation?.enabled,true);
assert.equal(branch.capabilities?.nursing_and_self_care?.enabled,true);

for(const field of ["ranked_differential_diagnosis","red_flags_and_urgency","nursing_and_self_care","uncertainty_and_information_gaps"]){
  assert.ok(branch.direct_output_contract.includes(field),`missing direct output ${field}`);
}

for(const banned of ["expert-center routing","compute-center routing","multi-agent or committee workflow","hospital operations workflow","PACS or DICOM server deployment","image-model training or segmentation pipelines"]){
  assert.ok(branch.excluded_scope.includes(banned),`missing excluded mechanism ${banned}`);
}

assert.ok(branch.safety_rules.some(x=>/never written into GitHub/i.test(x)));
assert.ok(branch.safety_rules.some(x=>/single photo/i.test(x)));
assert.ok(branch.safety_rules.some(x=>/life, vision/i.test(x)));
assert.ok(branch.authoritative_free_evidence_sources.length>=10);
assert.ok(branch.authoritative_free_evidence_sources.every(x=>["public","public-api"].includes(x.access)));

const med=registry.branches.find(x=>x.id==="top-hospital-medical");
assert.ok(med);
assert.match(med.scope,/diagnostic analysis/i);
assert.match(med.scope,/no expert\/compute routing/i);

const forbiddenTopLevel=["routing_policy","medical_tool_registry","hospital_and_research_dataset_sources","top_hospital_open_research_anchors"];
for(const k of forbiddenTopLevel)assert.equal(Object.prototype.hasOwnProperty.call(branch,k),false,`${k} must be removed from direct-care branch`);

console.log(JSON.stringify({ok:true,suite:"medical-diagnosis-care-branch",capabilities:["diagnostic-analysis","clinical-evidence-interpretation","nursing-self-care"],orchestration_removed:true,patient_data_to_github:false}));
