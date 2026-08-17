import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";
const p="medical_clinical_calculators";
const a=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:1,creatinine_unit:"mg/dL"},{});
const b=await runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:88.4,creatinine_unit:"umol/L"},{});
assert.equal(b.egfr_ml_min_1_73m2,a.egfr_ml_min_1_73m2);
console.log(JSON.stringify({ok:true,suite:"diag-wave5-si-conversion",mgdl:a.egfr_ml_min_1_73m2,umol:b.egfr_ml_min_1_73m2}));