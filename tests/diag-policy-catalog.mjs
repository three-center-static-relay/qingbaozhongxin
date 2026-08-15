import assert from "node:assert/strict";
import {CATALOG,statusFor} from "../src/catalog.js";
for(const p of ["federal_register","congress_gov","regulations_gov","splus_policy_regulatory_primary"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`)}
assert.equal(statusFor({},"federal_register")?.configured,true);
assert.equal(statusFor({},"congress_gov")?.configured,false);assert.equal(statusFor({CONGRESS_GOV_API_KEY:"x"},"congress_gov")?.configured,true);
assert.equal(statusFor({},"regulations_gov")?.configured,false);assert.equal(statusFor({REGULATIONS_GOV_API_KEY:"x"},"regulations_gov")?.configured,true);
console.log(JSON.stringify({ok:true,suite:"diag-policy-catalog"}));
