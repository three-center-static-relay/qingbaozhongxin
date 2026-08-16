import assert from "node:assert/strict";
import fs from "node:fs";
import {CATALOG} from "../src/catalog.js";

const branch=JSON.parse(fs.readFileSync(new URL("../data-assets/top-hospital-medical-branch.json",import.meta.url),"utf8"));
const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/intelligence-branch-registry.json",import.meta.url),"utf8"));
const evidence=JSON.parse(fs.readFileSync(new URL("../data-assets/personal-clinical-evidence-registry.json",import.meta.url),"utf8"));
const stack=JSON.parse(fs.readFileSync(new URL("../data-assets/medical-top-tier-capability-stack.json",import.meta.url),"utf8"));

assert.equal(branch.branch_id,"top-hospital-medical");
assert.equal(branch.label_zh,"医学诊断分析循证治疗与护理");
assert.equal(branch.capability_registry,"data-assets/medical-top-tier-capability-stack.json");

for(const key of [
  "clinical_diagnosis","differential_diagnosis","laboratory_interpretation","ct_mri_pet_xray_ultrasound_image_support",
  "dicom_series_support","pathology_report_support","whole_slide_pathology_support","ecg_and_waveform_support",
  "drug_interaction_analysis","pharmacogenomic_support","evidence_based_medicine","treatment_option_comparison",
  "individualized_treatment_plan_design_support","clinical_calculators_and_risk_scores","nursing_assessment_and_care",
  "rare_disease_phenotype_reasoning","genetic_test_interpretation_support","precision_oncology_support"
]) assert.equal(branch.capabilities?.[key],true,`missing capability ${key}`);

for(const removed of ["direct_output_contract","excluded_scope","safety_rules","routing_policy","workflow","process","policy"]){
  assert.equal(Object.prototype.hasOwnProperty.call(branch,removed),false,`${removed} must not be a top-level medical-branch process/rule block`);
}

assert.equal(stack.free_access_only,true);
assert.ok(stack.official_and_open_machine_sources.length>=25);
assert.ok(stack.medical_file_and_imaging_tools.length>=10);
for(const id of ["who_icd11_api","umls_uts_api","loinc_api","medlineplus_connect","openfda_drug_label","rxclass","pubtator3","monarch","ebi_ols","nci_evs","ncbi_gtr","cpic","clinpgx","civic","open_targets","biomcp","who_smart_guidelines","hl7_fhir","hl7_cql","dicomweb","lactmed","livertox"]){
  assert.ok(stack.official_and_open_machine_sources.some(x=>x.id===id),`missing source ${id}`);
}
for(const id of ["pydicom","highdicom","simpleitk","nibabel","monai_core","openslide","ohif_viewer","3d_slicer","qupath","wfdb_python"]){
  assert.ok(stack.medical_file_and_imaging_tools.some(x=>x.id===id),`missing tool ${id}`);
}

for(const provider of ["who_icd11","umls_uts","loinc_terminology","ucum_standard","medlineplus_connect","openfda_drug_label","rxclass","pubtator3","monarch_api","ebi_ols","nci_evs","ncbi_gtr","cpic_pgx","clinpgx","civic_precision_oncology","open_targets","biomcp","who_smart_guidelines","hl7_fhir_standard","hl7_cql","dicomweb_standard","lactmed","livertox"]){
  assert.ok(CATALOG[provider],`medical provider ${provider} missing from aggregate catalog`);
  assert.equal(CATALOG[provider].arbitrary_url,false);
  assert.equal(CATALOG[provider].write,false);
}

assert.equal(evidence.name,"medical-diagnosis-evidence-treatment-care-sources");
assert.ok(evidence.sources.length>=30);
assert.equal(Object.prototype.hasOwnProperty.call(evidence,"policy"),false);
assert.equal(Object.prototype.hasOwnProperty.call(evidence,"direct_use_rules"),false);
assert.equal(Object.prototype.hasOwnProperty.call(evidence,"evidence_priority"),false);

const med=registry.branches.find(x=>x.id==="top-hospital-medical");
assert.ok(med);
assert.match(med.scope,/CT\/MRI\/PET/i);
assert.match(med.scope,/evidence-based medicine/i);
assert.match(med.scope,/treatment-option/i);
assert.match(med.scope,/nursing/i);

console.log(JSON.stringify({ok:true,suite:"medical-top-tier-capability-stack",capability_only:true,free_access_only:true,multimodal:true,ct_mri_dicom:true,evidence_medicine:true,medication:true,treatment_design:true,nursing:true,precision_medicine:true,aggregate_catalog:true}));
