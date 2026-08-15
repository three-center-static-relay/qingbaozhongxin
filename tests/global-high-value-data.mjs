import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS} from "../src/adapters.js";

const live={
  ons_uk:["list_datasets","dataset_get"],
  statcan:["changed_series","vector_latest"],
  ecb_data:["data"],
  sec_edgar:["companyfacts"],
  clinicaltrials:["search_studies"]
};
for(const [provider,ops] of Object.entries(live)){
  assert.ok(CATALOG[provider],`missing catalog provider: ${provider}`);
  assert.notEqual(CATALOG[provider].adapter,"catalog-only",`live provider is catalog-only: ${provider}`);
  for(const op of ops)assert.ok(OPERATIONS[provider]?.includes(op),`missing operation ${provider}.${op}`);
}

const keySources={
  estat_japan:"ESTAT_JAPAN_APP_ID",
  kosis_korea:"KOSIS_API_KEY",
  opendart_korea:"OPENDART_API_KEY",
  edinet_japan:"EDINET_API_KEY",
  companies_house_uk:"COMPANIES_HOUSE_API_KEY",
  eia_open_data:"EIA_API_KEY",
  us_bea_api:"BEA_API_KEY",
  usda_nass_quickstats:"USDA_NASS_API_KEY",
  materials_project:"MATERIALS_PROJECT_API_KEY"
};
for(const [provider,secret] of Object.entries(keySources)){
  assert.ok(CATALOG[provider],`missing key source: ${provider}`);
  assert.ok(CATALOG[provider].secrets?.includes(secret),`missing secret ${secret} for ${provider}`);
  assert.equal(CATALOG[provider].adapter,"catalog-only",`unverified key provider unexpectedly live: ${provider}`);
}

for(const provider of ["abs_australia","destatis_genesis","insee_france","istat_italy","cbs_netherlands","scb_sweden","ssb_norway","statfin_finland","statbank_denmark","gleif_lei","bank_canada_valet","us_census_api","us_bls_api","us_treasury_fiscaldata","faa_aerodata","noaa_accessais","copernicus_marine","emodnet","argo_gdac","gebco","world_bank_pink_sheet","imf_commodity_prices","jodi_oil_gas","nih_reporter","cdc_open_data","cms_data","usaspending","ted_eu_procurement","usgs_earthquake","gdacs","reliefweb","nomad_materials","aflowlib"]){
  assert.ok(CATALOG[provider],`missing global high-value source: ${provider}`);
}

const routing=JSON.parse(readFileSync(new URL("../data-assets/global-domain-routing-map.json",import.meta.url),"utf8"));
assert.ok(routing.domains.macro_and_national_accounts.length>=10);
assert.ok(routing.domains.health_medicine_biomedical.length>=10);
assert.ok(routing.domains.satellite_geospatial_population.length>=10);
assert.ok(routing.advanced_economy_country_hubs.US.length>=10);
assert.match(routing.market_data_note,/real-time exchange-grade/i);
console.log(JSON.stringify({ok:true,live:Object.keys(live).length,key_sources:Object.keys(keySources).length,domains:Object.keys(routing.domains).length,country_hubs:Object.keys(routing.advanced_economy_country_hubs).length}));
