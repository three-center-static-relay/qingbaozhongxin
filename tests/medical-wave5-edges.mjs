import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";

const p="medical_clinical_calculators";
const a=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:1.0,creatinine_unit:"mg/dL"},{});
const b=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:88.4,creatinine_unit:"umol/L"},{});
assert.equal(b.egfr_ml_min_1_73m2,a.egfr_ml_min_1_73m2,"SI creatinine conversion must match mg/dL reference");
let ageError=null;try{await runAdapter(p,"egfr_2021_creatinine",{age_years:17,sex:"male",serum_creatinine:1},{});}catch(e){ageError=String(e?.message||e)}
assert.equal(ageError,"INVALID_AGE_YEARS");
let ureaError=null;try{await runAdapter(p,"curb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{});}catch(e){ureaError=String(e?.message||e)}
assert.equal(ureaError,"INVALID_UREA_MMOL_L");
console.log(JSON.stringify({ok:true,suite:"medical-wave5-edges",si_conversion:true,age_fail_closed:true,urea_fail_closed:true,egfr:a.egfr_ml_min_1_73m2}));