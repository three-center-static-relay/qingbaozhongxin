import assert from "node:assert/strict";
import fs from "node:fs";

const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/global-advisory-knowledge-intelligence-sources.json",import.meta.url),"utf8"));
assert.equal(registry.schema_version,"2026-08-15.1");
assert.ok(Array.isArray(registry.sources));
assert.ok(registry.sources.length>=80,`expected broad advisory source coverage, got ${registry.sources.length}`);
const ids=registry.sources.map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,"duplicate advisory source id");
for(const x of registry.sources){
  assert.ok(x.id&&x.name&&x.region&&x.class&&Array.isArray(x.family)&&x.family.length>0,`invalid source ${x.id}`);
  assert.ok(x.access&&x.machine_access&&x.priority&&x.role,`incomplete source metadata ${x.id}`);
}
const required=[
  "cn_state_council_policy_library","cn_npcssd","cn_nstrs","cn_ckcest","cn_cssn_cass","cn_drc","cn_caict","cn_cicir","cn_ciis",
  "rand","brookings","csis","carnegie","chatham_house","sipri","bruegel","lowy","rieti","world_bank_okr","imf_publications","oecd_publications",
  "cia_reading_room","us_frus","wilson_digital_archive","gwu_national_security_archive","us_crs","us_gao","uk_green_book","uk_magenta_book",
  "ucdp","prio_data","correlates_of_war","jpal","3ie","campbell_collaboration","cia_tradecraft"
];
for(const id of required)assert.ok(ids.includes(id),`missing required advisory source ${id}`);
for(const route of ["china_policy_and_strategy","global_geopolitics_security","economic_policy","policy_evaluation_and_methods","declassified_primary_sources","conflict_defence","science_engineering_advisory","health_evidence"]){
  assert.ok(Array.isArray(registry.routing?.[route])&&registry.routing[route].length>=4,`weak route ${route}`);
  for(const id of registry.routing[route])assert.ok(ids.includes(id),`route ${route} references missing source ${id}`);
}
assert.equal(registry.principles.free_first,true);
assert.match(registry.principles.china_realname_rule,/do not auto-register|do-not-auto-register|do not auto/i);
console.log(JSON.stringify({ok:true,sources:ids.length,families:registry.source_families.length,routes:Object.keys(registry.routing).length}));
