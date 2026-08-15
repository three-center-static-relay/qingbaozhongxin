import assert from "node:assert/strict";
import fs from "node:fs";

const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/elite-advisory-finance-intelligence-sources.json",import.meta.url),"utf8"));
assert.equal(registry.schema_version,"2026-08-15.1");
assert.ok(Array.isArray(registry.sources));
assert.ok(registry.sources.length>=55,`expected >=55 elite advisory sources, got ${registry.sources.length}`);
const ids=registry.sources.map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,"duplicate source ids");
const required=[
  "mckinsey_insights","mckinsey_global_institute","bcg_publications","bain_insights",
  "goldman_sachs_insights","goldman_sachs_global_institute","morgan_stanley_research","jpmorgan_global_research",
  "bank_of_america_institute","citi_institute","ubs_global_research_public","deutsche_bank_research_public",
  "blackrock_investment_institute","us_dod_publications","dtic_public","darpa_programs","iarpa_public",
  "odni_reports","nic_global_trends","dia_threat_insight","nsa_cyber_guidance","cia_reading_room_anchor",
  "reliefweb","gdacs","copernicus_ems","who_emergencies"
];
for(const id of required) assert.ok(ids.includes(id),`missing required elite source: ${id}`);
const byId=Object.fromEntries(registry.sources.map(x=>[x.id,x]));
assert.match(byId.goldman_sachs_insights.restriction,/not assumed accessible/i);
assert.match(byId.morgan_stanley_research.restriction,/metadata-only/i);
assert.match(byId.dtic_public.restriction,/controlled|export-restricted|CAC/i);
assert.match(byId.nsa_cyber_guidance.restriction,/public products/i);
assert.equal(registry.rules.no_bypass,true);
assert.equal(registry.rules.advisory_not_ground_truth,true);
for(const [route,routeIds] of Object.entries(registry.routing)){
  assert.ok(routeIds.length>0,`empty route: ${route}`);
  for(const id of routeIds) assert.ok(byId[id],`route ${route} references unknown source ${id}`);
}
console.log(JSON.stringify({ok:true,sources:registry.sources.length,routes:Object.keys(registry.routing).length}));
