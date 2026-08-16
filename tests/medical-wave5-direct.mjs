import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-extra49.js";

const p="medical_clinical_calculators";
for(const op of ["bmi","egfr_2021_creatinine","egfr_2021_creatinine_cystatin_c","crb65","curb65","qsofa"])assert.ok(OPERATIONS[p].includes(op));
const bmi=await runAdapter(p,"bmi",{weight_kg:70,height_m:1.75});assert.equal(bmi.bmi,22.9);
const egfr=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:1.0,creatinine_unit:"mg/dL"});assert.equal(egfr.egfr_ml_min_1_73m2,91.7);
const combined=await runAdapter(p,"egfr_2021_creatinine_cystatin_c",{age_years:50,sex:"male",serum_creatinine:1.0,cystatin_c_mg_l:1.0});assert.equal(combined.egfr_ml_min_1_73m2,88.1);
const crb=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:32,systolic_bp:110,diastolic_bp:70,age_years:70});assert.equal(crb.score,2);
const curb=await runAdapter(p,"curb65",{confusion:true,urea_mmol_l:8,respiratory_rate:31,systolic_bp:88,diastolic_bp:62,age_years:70});assert.equal(curb.score,5);
const q=await runAdapter(p,"qsofa",{respiratory_rate:22,systolic_bp:100,altered_mentation:false});assert.equal(q.score,2);
console.log(JSON.stringify({ok:true,suite:"medical-wave5-direct",direct_module:true,bmi:bmi.bmi,egfr:egfr.egfr_ml_min_1_73m2,egfr_combined:combined.egfr_ml_min_1_73m2,crb65:crb.score,curb65:curb.score,qsofa:q.score}));