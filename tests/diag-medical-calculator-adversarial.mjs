import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";
const p="medical_clinical_calculators";

async function mustReject(operation,args,pattern){
  await assert.rejects(()=>runAdapter(p,operation,args,{}),pattern);
}

// Missing/null/empty/boolean numeric inputs must never be silently coerced to zero.
for(const bad of [null,"",false]){
  await mustReject("curb65",{confusion:false,urea_mmol_l:bad,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},/INVALID_UREA_MMOL_L/);
  await mustReject("crb65",{confusion:false,respiratory_rate:bad,systolic_bp:120,diastolic_bp:80,age_years:50},/INVALID_RESPIRATORY_RATE/);
}

// Boundary criteria must remain exact.
const rr29=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:29,systolic_bp:120,diastolic_bp:80,age_years:64},{});
assert.equal(rr29.score,0);
const rr30=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:30,systolic_bp:120,diastolic_bp:80,age_years:64},{});
assert.equal(rr30.score,1);
const dbp60=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:60,age_years:64},{});
assert.equal(dbp60.score,1);
const sbp90=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:90,diastolic_bp:70,age_years:64},{});
assert.equal(sbp90.score,0);
const sbp89=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:89,diastolic_bp:70,age_years:64},{});
assert.equal(sbp89.score,1);
const age65=await runAdapter(p,"crb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:65},{});
assert.equal(age65.score,1);
const urea7=await runAdapter(p,"curb65",{confusion:false,urea_mmol_l:7,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{});
assert.equal(urea7.score,0);
const urea71=await runAdapter(p,"curb65",{confusion:false,urea_mmol_l:7.1,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{});
assert.equal(urea71.score,1);

console.log(JSON.stringify({ok:true,suite:"medical-calculator-adversarial",null_coercion_guard:true,crb65_boundaries:true,curb65_boundaries:true}));
