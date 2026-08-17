import assert from "node:assert/strict";
import app from "../src/guard.js";

const env={KAGGLE_API_TOKEN:"__DATASET_EXPOSURE_TEST_SECRET__"};
const ctx={waitUntil(){}};

async function get(path){
  const response=await app.fetch(new Request(`https://intelligence.example${path}`,{method:"GET"}),env,ctx);
  const body=await response.json();
  return{response,body};
}

const openapi=await get("/openapi.json");
assert.equal(openapi.response.status,200);
for(const path of [
  "/v1/catalog",
  "/v1/run",
  "/v1/provider/{provider}/readiness",
  "/v1/provider/{provider}/operations",
  "/v1/dataset-radar/meta",
  "/v1/dataset-radar/latest"
])assert.ok(openapi.body?.paths?.[path],`OpenAPI must expose ${path}`);

const meta=await get("/v1/dataset-radar/meta");
assert.equal(meta.response.status,200);
assert.equal(meta.body?.ok,true);
assert.ok(Array.isArray(meta.body?.sources)&&meta.body.sources.length>=11,"active dataset collectors must be visible");
assert.equal(meta.body?.portal_radar?.portals_total,17,"all fixed-domain dataset portals must be visible");
assert.ok(Array.isArray(meta.body?.portal_radar?.portals)&&meta.body.portal_radar.portals.length===17);
for(const id of ["kaggle_datasets","kaggle_notebooks","huggingface","modelscope","zenodo","figshare","dataverse","dryad","datacite","hdx","openml"]){
  assert.ok(meta.body.sources.some(x=>x.id===id),`${id} must be exposed by dataset radar metadata`);
}
for(const id of ["tianchi_portal","sciencedb_portal","tpdc_portal","geodata_portal","ngdc_portal","cma_data_portal","uci_portal","openneuro_portal","physionet_portal","dataone_portal","pangaea_portal"]){
  assert.ok(meta.body.portal_radar.portals.some(x=>x.id===id),`${id} must be exposed by portal metadata`);
}

const catalog=await get("/v1/catalog");
assert.equal(catalog.response.status,200);
assert.equal(catalog.body?.ok,true);
for(const [provider,operation] of [
  ["zenodo","oai_list_records"],
  ["huggingface","datasets_search"],
  ["kaggle","datasets_search"],
  ["harvard_dataverse","search"],
  ["pangaea","oai_list_records"],
  ["figshare","search"],
  ["worldbank","indicator"],
  ["nasa_cmr","preset"],
  ["worldpop","population_submit"],
  ["fred","search"]
]){
  assert.ok(catalog.body?.providers?.[provider],`${provider} must be visible in /v1/catalog`);
  assert.ok(catalog.body.providers[provider].operations?.includes(operation),`${provider}.${operation} must be exposed as an approved live operation`);
}

const serialized=JSON.stringify({openapi:openapi.body,meta:meta.body,catalog:catalog.body});
assert.equal(serialized.includes("__DATASET_EXPOSURE_TEST_SECRET__"),false,"runtime secret values must never be exposed");

console.log(JSON.stringify({ok:true,suite:"dataset-exposure",active_collectors:meta.body.sources.length,portal_sources:meta.body.portal_radar.portals.length,catalog_providers:Object.keys(catalog.body.providers||{}).length,openapi_dataset_routes:true,secrets_redacted:true}));
