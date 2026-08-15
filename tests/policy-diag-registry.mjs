import assert from "node:assert/strict";
import {OPERATIONS} from "../src/adapters.js";
import {CATALOG,statusFor} from "../src/catalog.js";
for(const p of ["federal_register","congress_gov","regulations_gov","splus_policy_regulatory_primary"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`)}
assert.equal(statusFor({},"federal_register")?.configured,true);
assert.equal(statusFor({},"congress_gov")?.configured,false);assert.equal(statusFor({CONGRESS_GOV_API_KEY:"x"},"congress_gov")?.configured,true);
assert.equal(statusFor({},"regulations_gov")?.configured,false);assert.equal(statusFor({REGULATIONS_GOV_API_KEY:"x"},"regulations_gov")?.configured,true);
assert.deepEqual(OPERATIONS.federal_register,["documents","document","agencies"]);
assert.ok(OPERATIONS.congress_gov.includes("bills")&&OPERATIONS.congress_gov.includes("bill_actions"));
assert.ok(OPERATIONS.regulations_gov.includes("documents")&&OPERATIONS.regulations_gov.includes("dockets"));
assert.equal(OPERATIONS.regulations_gov.includes("comments"),false);
console.log(JSON.stringify({ok:true,phase:"policy-registry"}));
