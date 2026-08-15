import assert from "node:assert/strict";
import fs from "node:fs";

const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/global-academic-industry-regional-sources.json",import.meta.url),"utf8"));
assert.equal(registry.schema_version,"2026-08-15.1");
assert.ok(registry.coverage_strategy?.institution_resolution?.includes("ROR"));
assert.ok(registry.coverage_strategy?.institution_resolution?.includes("re3data"));
assert.ok(registry.coverage_strategy?.institution_resolution?.includes("OpenDOAR"));
assert.ok(registry.coverage_strategy?.institution_resolution?.includes("DataCite"));
assert.ok(Array.isArray(registry.university_anchor_repositories));
assert.ok(registry.university_anchor_repositories.length>=19);
assert.ok(Array.isArray(registry.university_flagship_data_projects));
assert.ok(registry.university_flagship_data_projects.length>=7);
for(const id of ["harvard_dataverse","stanford_digital_repository","princeton_data_commons","oxford_ora","cambridge_apollo","eth_research_collection","pku_open_research_data","utoronto_borealis"]){
  assert.ok(registry.university_anchor_repositories.some(x=>x.id===id),`missing university anchor ${id}`);
}
for(const id of ["icpsr","ipums","harvard_atlas_economic_complexity","groningen_pwt_ggdc","uk_data_service","pku_china_survey_data","ucsd_caida"]){
  assert.ok(registry.university_flagship_data_projects.some(x=>x.id===id),`missing flagship project ${id}`);
}
for(const route of ["economics_trade_industry","population_household_social","health_medicine","engineering_industry_materials","geospatial_environment","computer_networks_ai","regional_local_studies"]){
  assert.ok(Array.isArray(registry.regional_industry_discovery_routes?.[route]),`missing route ${route}`);
}
console.log(JSON.stringify({ok:true,university_anchors:registry.university_anchor_repositories.length,flagship_projects:registry.university_flagship_data_projects.length,routes:Object.keys(registry.regional_industry_discovery_routes).length}));
