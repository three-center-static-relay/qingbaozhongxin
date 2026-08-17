import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const p="medical_clinical_calculators";
assert.ok(CATALOG[p]);assert.equal(CATALOG[p].adapter,"medical_clinical_calculators.local-deterministic");assert.equal(CATALOG[p].access,"local");assert.equal(CATALOG[p].write,false);assert.equal(CATALOG[p].arbitrary_url,false);
for(const op of ["bmi","egfr_2021_creatinine","egfr_2021_creatinine_cystatin_c","crb65","curb65","qsofa"])assert.ok(OPERATIONS[p].includes(op));

const bmi=await runAdapter(p,"bmi",{weight_kg:70,height_m:1.75,age_years:40},{});assert.equal(bmi.bmi,22.9);assert.equal(bmi.adult_who_category,"normal-range");assert.equal(bmi.classification_applicable,true);
const childBmi=await runAdapter(p,"bmi",{weight_kg:35,height_m:1.4,age_years:10},{});assert.equal(childBmi.bmi,17.9);assert.equal(childBmi.adult_who_category,null);assert.equal(childBmi.classification_applicable,false);assert.match(childBmi.classification_scope,/pediatric BMI requires/);
const unknownAgeBmi=await runAdapter(p,"bmi",{weight_kg:70,height_m:1.75},{});assert.equal(unknownAgeBmi.adult_who_category,null);assert.equal(unknownAgeBmi.classification_applicable,false);
const egfr=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:1.0,creatinine_unit:"mg/dL"},{});assert.ok(Math.abs(egfr.egfr_ml_min_1_73m2-91.7)<0.05);assert.equal(egfr.transition_age_note,null);
const egfrSi=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:88.4,creatinine_unit:"umol/L"},{});assert.equal(egfrSi.egfr_ml_min_1_73m2,egfr.egfr_ml_min_1_73m2);
const egfrYoungAdult=await runAdapter(p,"egfr_2021_creatinine",{age_years:20,sex:"female",serum_creatinine:0.8,creatinine_unit:"mg/dL"},{});assert.match(egfrYoungAdult.transition_age_note,/CKiD U25/);
const combined=await runAdapter(p,"egfr_2021_creatinine_cystatin_c",{age_years:50,sex:"male",serum_creatinine:1.0,cystatin_c_mg_l:1.0},{});assert.ok(Math.abs(combined.egfr_ml_min_1_73m2-88.1)<0.05);
const crb=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:32,systolic_bp:110,diastolic_bp:70,age_years:70},{});assert.equal(crb.score,2);assert.match(crb.nice_risk_group,/intermediate/);assert.match(crb.applicability,/adult/);
const curb=await runAdapter(p,"curb65",{confusion:true,urea_mmol_l:8,respiratory_rate:31,systolic_bp:88,diastolic_bp:62,age_years:70},{});assert.equal(curb.score,5);assert.match(curb.nice_risk_group,/high/);
const q=await runAdapter(p,"qsofa",{respiratory_rate:22,systolic_bp:100,altered_mentation:false},{});assert.equal(q.score,2);assert.equal(q.positive_two_or_more,true);assert.match(q.screening_warning,/not use qSOFA as a single/i);

await assert.rejects(()=>runAdapter(p,"egfr_2021_creatinine",{age_years:17,sex:"male",serum_creatinine:1},{}),/INVALID_AGE_YEARS/);
await assert.rejects(()=>runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:17},{}),/INVALID_AGE_YEARS/);
await assert.rejects(()=>runAdapter(p,"curb65",{confusion:false,urea_mmol_l:5,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:17},{}),/INVALID_AGE_YEARS/);
await assert.rejects(()=>runAdapter(p,"curb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{}),/INVALID_UREA_MMOL_L/);
console.log(JSON.stringify({ok:true,suite:"medical-live-core-wave5",provider:p,deterministic:true,network_calls:0,bmi:true,pediatric_bmi_guard:true,egfr2021:true,young_adult_egfr_note:true,curb65:true,crb65:true,adult_pneumonia_scope:true,qsofa:true,qsofa_screening_warning:true,arbitrary_url:false,write:false}));
