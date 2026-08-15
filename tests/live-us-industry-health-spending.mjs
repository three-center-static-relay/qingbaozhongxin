import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {CATALOG,CATALOG_VERSION,statusFor} from "../src/catalog.js";

assert.equal(CATALOG_VERSION,"2026-08-15.31");
for(const p of ["us_census_api","us_bls_api","us_bea_api","usda_nass_quickstats","nih_reporter","cms_data","usaspending","splus_us_official"]){
  assert.ok(CATALOG[p],`missing catalog ${p}`);
  assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`);
}
assert.equal(statusFor({},"us_census_api")?.configured,false);
assert.equal(statusFor({CENSUS_API_KEY:"x"},"us_census_api")?.configured,true);
assert.equal(statusFor({},"splus_us_official")?.configured,true);
assert.ok(OPERATIONS.us_census_api.includes("data"));
assert.ok(OPERATIONS.us_bls_api.includes("timeseries"));
assert.ok(OPERATIONS.us_bea_api.includes("data"));
assert.ok(OPERATIONS.usda_nass_quickstats.includes("query"));
assert.ok(OPERATIONS.nih_reporter.includes("projects"));
assert.ok(OPERATIONS.cms_data.includes("dataset"));
assert.ok(OPERATIONS.usaspending.includes("award_count"));

const calls=[];
globalThis.fetch=async(url,init={})=>{
  const u=String(url);calls.push({u,init});let body={};
  if(u.includes("api.census.gov"))body=[["NAME","B01001_001E","state"],["California","1","06"]];
  else if(u.includes("api.bls.gov"))body={status:"REQUEST_SUCCEEDED",message:[],Results:{series:[{seriesID:"LNS14000000",data:[]}]}};
  else if(u.includes("apps.bea.gov"))body={BEAAPI:{Request:{RequestParam:[{ParameterName:"UserID",ParameterValue:"BEA-SECRET"}]},Results:{Dataset:[{DatasetName:"NIPA"}]}}};
  else if(u.includes("quickstats.nass.usda.gov"))body={data:[{commodity_desc:"CORN",year:"2025"}]};
  else if(u.includes("reporter.nih.gov"))body={meta:{total:1},results:[{project_num:"R01",project_title:"test"}]};
  else if(u.includes("data.cms.gov"))body=[{STATE_CD:"MD"}];
  else if(u.includes("usaspending.gov"))body={results:{contracts:2,grants:1},page_metadata:{page:1}};
  const raw=JSON.stringify(body);
  return new Response(raw,{status:200,headers:{"content-type":"application/json","content-length":String(raw.length)}});
};

const census=await runAdapter("us_census_api","data",{year:"2025",dataset:"acs/acs5",variables:["NAME","B01001_001E"],for:"state:*"},{CENSUS_API_KEY:"CENSUS-KEY"});
assert.equal(census.items.length,1);assert.ok(calls.at(-1).u.includes("key=CENSUS-KEY"));
await assert.rejects(()=>runAdapter("us_census_api","data",{year:"2025",dataset:"acs/acs5",variables:["NAME"]},{}),/UPSTREAM_AUTH_FAILED/);
await assert.rejects(()=>runAdapter("us_census_api","data",{year:"2025",dataset:"https://evil.example/x",variables:["NAME"]},{CENSUS_API_KEY:"x"}),/INVALID_CENSUS_DATASET/);

const bls=await runAdapter("us_bls_api","timeseries",{series_ids:["LNS14000000"],start_year:2024,end_year:2025},{BLS_API_KEY:"BLS-KEY"});
assert.equal(bls.status,"REQUEST_SUCCEEDED");assert.ok(String(calls.at(-1).init.body).includes("BLS-KEY"));

const bea=await runAdapter("us_bea_api","datasets",{},{BEA_API_KEY:"BEA-SECRET"});
assert.equal(bea.data.BEAAPI.Request.RequestParam[0].ParameterValue,"[redacted]");
assert.equal(JSON.stringify(bea).includes("BEA-SECRET"),false);

const nass=await runAdapter("usda_nass_quickstats","query",{query:{commodity_desc:"CORN",year__GE:"2025"}},{USDA_NASS_API_KEY:"NASS-KEY"});
assert.equal(nass.items[0].commodity_desc,"CORN");
await assert.rejects(()=>runAdapter("usda_nass_quickstats","query",{query:{evil_url:"x"}},{USDA_NASS_API_KEY:"NASS-KEY"}),/INVALID_NASS_FIELD/);

const nih=await runAdapter("nih_reporter","projects",{query:"lung cancer",fiscal_years:[2025],limit:5},{});assert.equal(nih.items.length,1);
const cms=await runAdapter("cms_data","dataset",{dataset_id:"2457ea29-fc82-48b0-86ec-3b0755de7515",limit:5,filters:{STATE_CD:"MD"}},{});assert.equal(cms.items[0].STATE_CD,"MD");
await assert.rejects(()=>runAdapter("cms_data","dataset",{dataset_id:"https://evil.example"},{}),/INVALID_DATASET_ID/);
const usa=await runAdapter("usaspending","award_count",{start_date:"2025-01-01",end_date:"2025-12-31",award_type_codes:["A","B"],naics:["54"]},{});assert.equal(usa.data.results.contracts,2);
const umbrella=await runAdapter("splus_us_official","catalog",{},{});assert.equal(umbrella.items.length,7);

console.log(JSON.stringify({ok:true,suite:"live-us-industry-health-spending",providers:8,keyed:4,public:3,bea_secret_redaction:true,arbitrary_url_rejected:true}));
