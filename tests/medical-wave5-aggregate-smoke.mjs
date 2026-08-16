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
console.log(JSON.stringify({ok:true,suite:"medical-wave5-aggregate-smoke",catalog:true,aggregate_operations:true,aggregate_dispatch:true}));