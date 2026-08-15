import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {CATALOG,CATALOG_VERSION,statusFor} from "../src/catalog.js";

assert.equal(CATALOG_VERSION,"2026-08-15.32");
for(const p of ["un_comtrade","reliefweb","gdacs","cdc_open_data","splus_global_events_trade_health"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`)}
assert.equal(statusFor({},"un_comtrade")?.configured,true);
assert.equal(statusFor({},"reliefweb")?.configured,false);
assert.equal(statusFor({RELIEFWEB_APPNAME:"three-center-test"},"reliefweb")?.configured,true);
assert.ok(OPERATIONS.un_comtrade.includes("preview")&&OPERATIONS.un_comtrade.includes("data"));
assert.ok(OPERATIONS.reliefweb.includes("reports"));assert.ok(OPERATIONS.gdacs.includes("latest"));assert.ok(OPERATIONS.cdc_open_data.includes("rows"));

const calls=[];
globalThis.fetch=async(url,init={})=>{const u=String(url);calls.push({u,init});let body={};
 if(u.includes("comtradeapi.un.org"))body={count:1,data:[{reporterCode:156,cmdCode:"85",primaryValue:123}]};
 else if(u.includes("api.reliefweb.int"))body={totalCount:1,data:[{id:1,fields:{title:"Flood report"}}]};
 else if(u.includes("homepage_datatable.json"))body={features:[{eventtype:"FL",country:"China"}]};
 else if(u.includes("api/views/"))body={id:"g653-rqe2",name:"Wastewater"};
 else if(u.includes("data.cdc.gov/resource/"))body=[{jurisdiction:"US",value:"1"}];
 const raw=JSON.stringify(body);return new Response(raw,{status:200,headers:{"content-type":"application/json","content-length":String(raw.length)}})};

const preview=await runAdapter("un_comtrade","preview",{type_code:"C",freq_code:"A",cl_code:"HS",period:"2025",reporter_code:"156",cmd_code:"85",flow_code:"X",limit:50},{});
assert.equal(preview.items.length,1);assert.ok(calls.at(-1).u.includes("public/v1/preview/C/A/HS"));assert.ok(!calls.at(-1).u.includes("subscription-key="));
const full=await runAdapter("un_comtrade","data",{type_code:"C",freq_code:"M",cl_code:"HS",period:"202501",reporter_code:"156",cmd_code:"85",flow_code:"X",limit:500},{UN_COMTRADE_API_KEY:"COMTRADE-SECRET"});
assert.equal(full.items.length,1);assert.ok(calls.at(-1).u.includes("data/v1/get/C/M/HS"));assert.ok(calls.at(-1).u.includes("subscription-key=COMTRADE-SECRET"));assert.equal(JSON.stringify(full).includes("COMTRADE-SECRET"),false);
await assert.rejects(()=>runAdapter("un_comtrade","data",{period:"2025",reporter_code:"156"},{}),/UPSTREAM_AUTH_FAILED/);
await assert.rejects(()=>runAdapter("un_comtrade","preview",{freq_code:"A",period:"202501",reporter_code:"156"},{}),/INVALID_COMTRADE_PERIOD/);

await assert.rejects(()=>runAdapter("reliefweb","reports",{query:"flood"},{}),/UPSTREAM_AUTH_FAILED/);
const rw=await runAdapter("reliefweb","reports",{query:"flood",limit:10},{RELIEFWEB_APPNAME:"three-center-test"});assert.equal(rw.items.length,1);assert.ok(calls.at(-1).u.includes("api.reliefweb.int/v2/reports?appname=three-center-test"));
const gd=await runAdapter("gdacs","latest",{},{});assert.ok(gd.data.features);assert.equal(calls.at(-1).u,"https://www.gdacs.org/contentdata/xml/homepage_datatable.json");

const meta=await runAdapter("cdc_open_data","metadata",{dataset_id:"g653-rqe2"},{});assert.equal(meta.data.name,"Wastewater");
const rows=await runAdapter("cdc_open_data","rows",{dataset_id:"g653-rqe2",fields:["jurisdiction","value"],filters:{jurisdiction:"US"},limit:20},{CDC_APP_TOKEN:"CDC-TOKEN"});assert.equal(rows.items.length,1);assert.equal(calls.at(-1).init.headers["X-App-Token"],"CDC-TOKEN");
await assert.rejects(()=>runAdapter("cdc_open_data","rows",{dataset_id:"https://evil.example",limit:1},{}),/INVALID_DATASET_ID/);
await assert.rejects(()=>runAdapter("cdc_open_data","rows",{dataset_id:"g653-rqe2",filters:{"$where":"1=1"}},{}),/INVALID_CDC_FILTER_FIELD/);
const umbrella=await runAdapter("splus_global_events_trade_health","catalog",{},{});assert.equal(umbrella.items.length,4);
console.log(JSON.stringify({ok:true,suite:"live-global-events-trade-health",providers:5,comtrade_preview_and_keyed:true,reliefweb_fail_closed:true,cdc_no_raw_soql:true,gdacs_fixed_feed:true}));
