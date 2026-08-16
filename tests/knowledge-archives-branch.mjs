import assert from "node:assert/strict";
import fs from "node:fs";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS} from "../src/adapters.js";

const branches=JSON.parse(fs.readFileSync(new URL("../data-assets/intelligence-branch-registry.json",import.meta.url),"utf8"));
const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/knowledge-graph-knowledgebase-archives-registry.json",import.meta.url),"utf8"));
const branch=branches.branches.find(x=>x.id==="knowledge-graph-knowledgebase-archives");
assert.ok(branch,"knowledge branch missing");
assert.equal(branch.type,"intelligence-subdomain");
assert.equal(branch.replaces_center,false);
assert.equal(registry.parent,"intelligence-center");
assert.equal(registry.replaces_center,false);
assert.equal(registry.coverage_model.mode,"federated-not-mirrored");
assert.equal(registry.coverage_model.literal_all_sources_claim,false);
for(const name of ["exa","tavily"])assert.ok(CATALOG[name],`discovery provider missing: ${name}`);
const live=["library_of_congress","nara_catalog","europeana","dpla","gallica","ndl_search","data_gov_us","data_europa"];
for(const name of live){
  assert.ok(CATALOG[name],`catalog provider missing: ${name}`);
  assert.ok(OPERATIONS[name]?.includes("search"),`search operation missing: ${name}`);
  assert.equal(CATALOG[name].arbitrary_url,false,`arbitrary URL must be denied: ${name}`);
  assert.equal(CATALOG[name].write,false,`write must be denied: ${name}`);
  assert.notEqual(CATALOG[name].adapter,"catalog-only",`provider must be live-routable: ${name}`);
}
for(const p of registry.protocol_families)assert.ok(p.policy,"protocol policy missing");
assert.ok(registry.runtime_invariants.includes("no arbitrary URL fetch"));
assert.ok(registry.runtime_invariants.includes("provider authentication secrets stay in runtime secret storage, never Git"));
console.log(JSON.stringify({ok:true,branch:branch.id,providers:live.length,protocols:registry.protocol_families.length,discovery:["exa","tavily"]}));
