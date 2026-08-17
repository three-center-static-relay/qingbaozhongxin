import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";
const p="medical_clinical_calculators";
const bmi=await runAdapter(p,"bmi",{weight_kg:70,height_m:1.75},{});assert.equal(bmi.adult_who_category,"normal-range");
const a=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:1,creatinine_unit:"mg/dL"},{});const b=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:88.4,creatinine_unit:"umol/L"},{});assert.equal(b.egfr_ml_min_1_73m2,a.egfr_ml_min_1_73m2);
const crb=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:32,systolic_bp:110,diastolic_bp:70,age_years:70},{});assert.match(crb.nice_risk_group,/intermediate/);
const curb=await runAdapter(p,"curb65",{confusion:true,urea_mmol_l:8,respiratory_rate:31,systolic_bp:88,diastolic_bp:62,age_years:70},{});assert.match(curb.nice_risk_group,/high/);
const q=await runAdapter(p,"qsofa",{respiratory_rate:22,systolic_bp:100,altered_mentation:false},{});assert.equal(q.positive_two_or_more,true);
console.log(JSON.stringify({ok:true,suite:"diag-wave5-positive-details",unit_conversion:true,nice_risk_labels:true,qsofa_flag:true}));