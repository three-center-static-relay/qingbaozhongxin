import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";
const p="medical_clinical_calculators";
await assert.rejects(()=>runAdapter(p,"egfr_2021_creatinine",{age_years:17,sex:"male",serum_creatinine:1},{}),/INVALID_AGE_YEARS/);
await assert.rejects(()=>runAdapter(p,"curb65",{confusion:false,respiratory_rate:20,systolic_bp:120,diastolic_bp:80,age_years:50},{}),/INVALID_UREA_MMOL_L/);
console.log(JSON.stringify({ok:true,suite:"diag-wave5-negative-only",underage_rejected:true,missing_urea_rejected:true}));