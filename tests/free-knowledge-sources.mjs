import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS} from "../src/adapters.js";

const live={
  dryad:"search",
  art_institute_chicago:"search",
  vam_collections:"search",
  gbif_species:"search",
  pubchem:"compound_by_name",
  chembl:"search",
  harvard_dataverse:"search",
  rcsb_pdb:"search"
};
for(const [provider,operation] of Object.entries(live)){
  assert.ok(CATALOG[provider],`missing catalog provider: ${provider}`);
  assert.ok(OPERATIONS[provider]?.includes(operation),`missing live operation: ${provider}.${operation}`);
  assert.notEqual(CATALOG[provider].adapter,"catalog-only",`live provider registered as catalog-only: ${provider}`);
}

for(const provider of ["re3data","openfda","congress_gov","regulations_gov"]){
  assert.ok(CATALOG[provider],`missing catalog provider: ${provider}`);
}
assert.equal(CATALOG.congress_gov.registration_url,"https://api.congress.gov/sign-up");
assert.equal(CATALOG.regulations_gov.registration_url,"https://api.data.gov/signup/");
assert.equal(CATALOG.openfda.registration_url,"https://api.data.gov/signup/");

console.log(JSON.stringify({ok:true,live:Object.keys(live).length,catalog_only:4,total_checked:Object.keys(live).length+4}));
