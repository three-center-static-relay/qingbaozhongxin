import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const p="medical_clinical_calculators",c=CATALOG[p];
assert.ok(c,"calculator provider missing from aggregate catalog");
assert.equal(c.adapter,"medical_clinical_calculators.local-deterministic");
assert.equal(c.access,"local");
assert.equal(c.write,false);
assert.equal(c.arbitrary_url,false);
for(const op of ["bmi","egfr_2021_creatinine","egfr_2021_creatinine_cystatin_c","crb65","curb65","qsofa"])assert.ok(OPERATIONS[p]?.includes(op),`aggregate operation missing: ${op}`);
const out=await runAdapter(p,"bmi",{weight_kg:70,height_m:1.75},{});
assert.equal(out.bmi,22.9);
const egfrMg=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:1,creatinine_unit:"mg/dL"},{});
const egfrSi=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:88.4,creatinine_unit:"umol/L"},{});
assert.equal(egfrSi.egfr_ml_min_1_73m2,egfrMg.egfr_ml_min_1_73m2);
assert.equal(egfrSi.serum_creatinine_mg_dl,1);
await assert.rejects(()=>runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:3000,creatinine_unit:"umol/L"},{}),/INVALID_SERUM_CREATININE/);
for(const bad of [null,"",false,[],{}]){
  await assert.rejects(()=>runAdapter(p,"curb65",{confusion:false,urea_mmol_l:bad,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{}),/INVALID_UREA_MMOL_L/);
  await assert.rejects(()=>runAdapter(p,"crb65",{confusion:false,respiratory_rate:bad,systolic_bp:120,diastolic_bp:80,age_years:50},{}),/INVALID_RESPIRATORY_RATE/);
}
const rr29=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:29,systolic_bp:120,diastolic_bp:80,age_years:64},{});assert.equal(rr29.score,0);
const rr30=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:30,systolic_bp:120,diastolic_bp:80,age_years:64},{});assert.equal(rr30.score,1);
const dbp60=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:60,age_years:64},{});assert.equal(dbp60.score,1);
const sbp90=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:90,diastolic_bp:70,age_years:64},{});assert.equal(sbp90.score,0);
const sbp89=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:89,diastolic_bp:70,age_years:64},{});assert.equal(sbp89.score,1);
const age65=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:65},{});assert.equal(age65.score,1);
const urea7=await runAdapter(p,"curb65",{confusion:false,urea_mmol_l:7,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{});assert.equal(urea7.score,0);
const urea71=await runAdapter(p,"curb65",{confusion:false,urea_mmol_l:7.1,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{});assert.equal(urea71.score,1);
console.log(JSON.stringify({ok:true,suite:"medical-wave5-aggregate-smoke",catalog:true,aggregate_operations:true,aggregate_dispatch:true,si_creatinine_conversion:true,si_range_guard:true,strict_numeric_inputs:true,crb65_boundaries:true,curb65_boundaries:true}));