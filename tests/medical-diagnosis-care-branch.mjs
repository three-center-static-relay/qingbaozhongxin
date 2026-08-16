import assert from "node:assert/strict";
import fs from "node:fs";
import {CATALOG} from "../src/catalog.js";

const branch=JSON.parse(fs.readFileSync(new URL("../data-assets/top-hospital-medical-branch.json",import.meta.url),"utf8"));
const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/intelligence-branch-registry.json",import.meta.url),"utf8"));
const evidence=JSON.parse(fs.readFileSync(new URL("../data-assets/personal-clinical-evidence-registry.json",import.meta.url),"utf8"));
const stack=JSON.parse(fs.readFileSync(new URL("../data-assets/medical-top-tier-capability-stack.json",import.meta.url),"utf8"));
const specialty=JSON.parse(fs.readFileSync(new URL("../data-assets/medical-top-tier-specialty-sources.json",import.meta.url),"utf8"));
const constitution=JSON.parse(fs.readFileSync(new URL("../data-assets/medical-branch-constitution.json",import.meta.url),"utf8"));
const allSpecialties=JSON.parse(fs.readFileSync(new URL("../data-assets/medical-all-specialties-capability-registry.json",import.meta.url),"utf8"));

assert.equal(branch.branch_id,"top-hospital-medical");
assert.equal(branch.label_zh,"顶级综合医院全科医学能力");
assert.equal(branch.constitution_registry,"data-assets/medical-branch-constitution.json");
assert.equal(branch.all_specialties_registry,"data-assets/medical-all-specialties-capability-registry.json");
assert.equal(branch.capability_registry,"data-assets/medical-top-tier-capability-stack.json");
assert.equal(branch.specialty_source_registry,"data-assets/medical-top-tier-specialty-sources.json");

for(const key of [
  "all_major_specialties_and_subspecialties","top_tier_comprehensive_hospital_breadth_target","cross_specialty_multimorbidity_analysis",
  "clinical_diagnosis","differential_diagnosis","laboratory_interpretation","ct_mri_pet_xray_ultrasound_image_support",
  "dicom_series_support","pathology_report_support","whole_slide_pathology_support","ecg_and_waveform_support",
  "drug_interaction_analysis","pharmacogenomic_support","evidence_based_medicine","treatment_option_comparison",
  "individualized_treatment_plan_design_support","procedure_and_intervention_option_analysis","clinical_calculators_and_risk_scores",
  "nursing_assessment_and_care","rare_disease_phenotype_reasoning","genetic_test_interpretation_support",
  "precision_oncology_support","longitudinal_case_analysis","second_opinion_support"
]) assert.equal(branch.capabilities?.[key],true,`missing capability ${key}`);

for(const removed of ["direct_output_contract","excluded_scope","safety_rules","routing_policy","workflow","process","policy","stages","queue","orchestration","committee"]){
  assert.equal(Object.prototype.hasOwnProperty.call(branch,removed),false,`${removed} must not be a top-level medical-branch structure`);
}

assert.equal(constitution.constitution_id,"medical-branch-capability-only");
assert.equal(constitution.applies_to,"top-hospital-medical");
assert.match(constitution.coverage,/all major medical specialties and subspecialties/i);
assert.match(constitution.target,/top-tier comprehensive hospital/i);
assert.ok(constitution.future_change_contract.allowed_additions.includes("clinical capability"));
assert.ok(constitution.future_change_contract.allowed_additions.includes("specialty capability"));
for(const prohibited of ["workflow","process pipeline","routing policy","multi-agent workflow","committee or expert-panel mechanism","approval chain","stage gate","task-state machine","queue orchestration","model-selection workflow","output contract framework"]){
  assert.ok(constitution.future_change_contract.prohibited_additions.includes(prohibited),`constitution must prohibit ${prohibited}`);
}
assert.match(constitution.future_change_contract.rule,/add or improve capability records, tools or authoritative sources only/i);

assert.equal(allSpecialties.coverage_mode,"full-specialty-capability");
assert.ok(allSpecialties.specialty_groups.length>=14);
const specialtyIds=allSpecialties.specialty_groups.flatMap(g=>g.specialties||[]);
assert.ok(specialtyIds.length>=150,`expected broad full-specialty coverage, got ${specialtyIds.length}`);
for(const id of [
  "general-practice-and-family-medicine","emergency-medicine","critical-care-medicine","cardiology","pulmonology","gastroenterology","hepatology",
  "nephrology","endocrinology","hematology","medical-oncology","rheumatology","infectious-diseases","neurology","psychiatry",
  "general-surgery","trauma-surgery","cardiac-surgery","neurosurgery","orthopedic-surgery","urology","obstetrics","gynecology",
  "maternal-fetal-medicine","general-pediatrics","neonatology","ophthalmology","otolaryngology-head-and-neck-surgery","dentistry","dermatology",
  "radiology","nuclear-medicine","pathology","laboratory-medicine","anesthesiology","pain-medicine","physical-medicine-and-rehabilitation",
  "clinical-pharmacy","nursing","critical-care-nursing","clinical-genetics-and-genomics"
]) assert.ok(specialtyIds.includes(id),`missing full-specialty capability ${id}`);
for(const cap of ["differential-diagnosis","evidence-based-medicine-retrieval-and-appraisal","treatment-option-comparison","nursing-care","rehabilitation-and-follow-up"]){
  assert.ok(allSpecialties.default_capabilities_for_each_specialty.includes(cap),`missing default specialty capability ${cap}`);
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

assert.ok(specialty.sources.length>=14);
for(const id of ["ncbi_clinvar","orphadata_api","nci_pdq","ema_medicines_data","kdigo_guidelines","idsa_guidelines","aha_acc_guidelines","esc_guidelines","aasld_guidelines","surviving_sepsis_campaign","rnao_best_practice_guidelines","who_rehabilitation_package","nei_eye_health","aao_preferred_practice_patterns"]){
  assert.ok(specialty.sources.some(x=>x.id===id),`missing specialty source ${id}`);
}

for(const provider of ["who_icd11","umls_uts","loinc_terminology","ucum_standard","medlineplus_connect","openfda_drug_label","rxclass","pubtator3","ncbi_clinvar","monarch_api","orphadata_api","ebi_ols","nci_evs","ncbi_gtr","cpic_pgx","clinpgx","civic_precision_oncology","open_targets","ema_medicines_data","nci_pdq","kdigo_guidelines","idsa_guidelines","aha_acc_guidelines","esc_guidelines","aasld_guidelines","surviving_sepsis","rnao_bpg","who_rehabilitation","nei_eye_health","aao_ppp","biomcp","who_smart_guidelines","hl7_fhir_standard","hl7_cql","dicomweb_standard","lactmed","livertox","medical_top_tier_search"]){
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
assert.match(med.scope,/full-specialty/i);
assert.match(med.scope,/evidence-based medicine/i);
assert.match(med.scope,/treatment and procedure option design/i);
assert.match(med.scope,/nursing/i);
assert.match(med.scope,/capability-only/i);

console.log(JSON.stringify({ok:true,suite:"medical-top-tier-full-specialty-capability",capability_only:true,constitution_enforced:true,full_specialty:true,specialty_count:specialtyIds.length,top_tier_comprehensive_hospital_target:true,multimodal:true,ct_mri_dicom:true,evidence_medicine:true,medication:true,treatment_design:true,nursing:true,precision_medicine:true,aggregate_catalog:true}));
