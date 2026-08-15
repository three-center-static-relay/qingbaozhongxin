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
  rcsb_pdb:"search",
  ncbi_entrez:"search",
  dbpedia_lookup:"search",
  rijksmuseum:"search",
  finna:"search",
  cleveland_museum:"search"
};
for(const [provider,operation] of Object.entries(live)){
  assert.ok(CATALOG[provider],`missing catalog provider: ${provider}`);
  assert.ok(OPERATIONS[provider]?.includes(operation),`missing live operation: ${provider}.${operation}`);
  assert.notEqual(CATALOG[provider].adapter,"catalog-only",`live provider registered as catalog-only: ${provider}`);
}
const catalogOnly=[
  "re3data","openfda","congress_gov","regulations_gov",
  "rijksmuseum_library_sru","pangaea","deutsche_digitale_bibliothek",
  "getty_vocabularies","getty_collection","musicbrainz",
  "harvard_art_museums","trove"
];
for(const provider of catalogOnly){
  assert.ok(CATALOG[provider],`missing catalog provider: ${provider}`);
}
assert.equal(CATALOG.congress_gov.registration_url,"https://api.congress.gov/sign-up");
assert.equal(CATALOG.regulations_gov.registration_url,"https://api.data.gov/signup/");
assert.equal(CATALOG.openfda.registration_url,"https://api.data.gov/signup/");
assert.equal(CATALOG.deutsche_digitale_bibliothek.secrets?.[0],"DDB_API_KEY");
assert.equal(CATALOG.harvard_art_museums.secrets?.[0],"HARVARD_ART_MUSEUMS_API_KEY");
assert.equal(CATALOG.trove.secrets?.[0],"TROVE_API_KEY");
console.log(JSON.stringify({ok:true,live:Object.keys(live).length,catalog_only:catalogOnly.length,total_checked:Object.keys(live).length+catalogOnly.length}));
