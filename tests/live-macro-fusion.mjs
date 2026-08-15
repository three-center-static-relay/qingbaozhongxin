import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {CATALOG,CATALOG_VERSION,statusFor} from "../src/catalog.js";

assert.match(CATALOG_VERSION,/^2026-08-15\.\d+$/);
assert.ok(Number(CATALOG_VERSION.split(".").at(-1))>=29,`macro fusion requires catalog revision >=29, got ${CATALOG_VERSION}`);
for(const p of ["worldbank","imf","bis","fred","eia","us_treasury_fiscaldata","splus_macro_fusion"])assert.ok(CATALOG[p],`missing catalog ${p}`);
for(const p of ["imf","bis","us_treasury_fiscaldata","splus_macro_fusion"])assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`);
assert.ok(OPERATIONS.worldbank.includes("indicator"),"legacy World Bank indicator operation lost");
assert.ok(OPERATIONS.worldbank.includes("multi_indicator"),"new World Bank multi operation missing");
assert.ok(OPERATIONS.fred.includes("series_observations"),"legacy FRED observations operation lost");
assert.ok(OPERATIONS.fred.includes("search"),"new FRED search operation missing");
assert.ok(OPERATIONS.imf.includes("timeseries"));
assert.ok(OPERATIONS.bis.includes("data"));
assert.ok(OPERATIONS.eia.includes("data"));
assert.ok(OPERATIONS.us_treasury_fiscaldata.includes("debt_to_penny"));
assert.ok(OPERATIONS.splus_macro_fusion.includes("compare"));

const calls=[];
globalThis.fetch=async(url,init={})=>{
  const u=String(url);calls.push({u,init});let body={};
  if(u.includes("api.worldbank.org/v2/country/CHN/indicator/NY.GDP.MKTP.KD.ZG"))body=[{page:1},[{date:"2025",value:5.0}]];
  else if(u.includes("api.worldbank.org/v2/country/CHN/indicator/SP.POP.TOTL"))body=[{page:1},[{date:"2025",value:1400000000}]];
  else if(u.includes("imf.org/external/datamapper/api/v2/NGDP_RPCH/CHN"))body={values:{NGDP_RPCH:{CHN:{"2025":5.1}}}};
  else if(u.includes("imf.org/external/datamapper/api/v2/PCPIPCH/CHN"))body={values:{PCPIPCH:{CHN:{"2025":1.2}}}};
  else if(u.includes("imf.org/external/datamapper/api/v2/indicators"))body={indicators:{NGDP_RPCH:{label:"Real GDP growth"}}};
  else if(u.includes("api.eia.gov"))body={response:{data:[{period:"2025",value:"1"}]},request:{params:{api_key:"SECRET-EIA"}}};
  else if(u.includes("fiscaldata.treasury.gov"))body={data:[{record_date:"2025-01-01",tot_pub_debt_out_amt:"1"}],meta:{count:1}};
  else if(u.includes("stats.bis.org"))body={data:{dataSets:[]}};
  else if(u.includes("stlouisfed.org"))body={seriess:[{id:"GDP",title:"Gross Domestic Product"}],count:1,limit:20,offset:0};
  else if(u.includes("api.worldbank.org"))body=[{page:1},[]];
  const raw=JSON.stringify(body);
  return new Response(raw,{status:200,headers:{"content-type":"application/json","content-length":String(raw.length)}});
};

const oldWb=await runAdapter("worldbank","indicator",{country:"CHN",indicator:"SP.POP.TOTL",date:"2025",limit:5},{});
assert.equal(oldWb.items[0].value,1400000000);
const imf=await runAdapter("imf","indicators",{},{});assert.ok(imf.data.indicators.NGDP_RPCH);
const fusion=await runAdapter("splus_macro_fusion","compare",{metric:"gdp_growth",country:"CHN",year:"2025"},{});
assert.equal(fusion.records[0].value,5.0);assert.equal(fusion.records[1].value,5.1);assert.equal(fusion.comparison.agreement,"close");
const eia=await runAdapter("eia","data",{route:"electricity/retail-sales",frequency:"monthly",data:["price"],limit:5},{EIA_API_KEY:"SECRET-EIA"});
assert.equal(eia.data.request.params.api_key,"[redacted]");
assert.ok(calls.some(x=>x.u.includes("api_key=SECRET-EIA")),"EIA key was not sent upstream");
await assert.rejects(()=>runAdapter("eia","data",{route:"https://evil.example/x"},{EIA_API_KEY:"SECRET-EIA"}),/INVALID_EIA_ROUTE/);
const debt=await runAdapter("us_treasury_fiscaldata","debt_to_penny",{limit:1},{});assert.equal(debt.items.length,1);
const bis=await runAdapter("bis","structure",{structure_type:"dataflow"},{});assert.ok(bis.data.data);
const fred=await runAdapter("fred","search",{query:"GDP",limit:5},{FRED_API_KEY:"abcdefghijklmnopqrstuvwxyz123456"});assert.equal(fred.items[0].id,"GDP");

console.log(JSON.stringify({ok:true,suite:"live-macro-fusion",providers:7,fusion_metrics:3,legacy_ops_preserved:true,secret_redaction:true}));
