import assert from "node:assert/strict";
import {runAdapter,__test} from "../src/adapters-extra21.js";
import {CATALOG,statusFor} from "../src/catalog.js";

for(const p of ["worldpop","overture_maps","night_lights","ghsl","copernicus_lcfm","foursquare_os_places","dlr_wsf"]){
  assert.ok(CATALOG[p],`missing ${p}`);
  assert.notEqual(CATALOG[p].adapter,"catalog-only",`${p} must be callable`);
  assert.equal(CATALOG[p].arbitrary_url,false,`${p} must deny arbitrary URLs`);
  assert.equal(statusFor({},p).configured,true,`${p} must work without a paid credential`);
}
assert.equal(CATALOG.foursquare_os_places.license,"Apache-2.0");
assert.match(CATALOG.night_lights.earth_engine_collection,/VNP46A2/);
assert.match(CATALOG.dlr_wsf.endpoint,/geoservice\.dlr\.de/);
assert.equal(__test.year(2026),2026);
assert.equal(__test.resolution("100m"),"100m");
assert.equal(__test.ageRange(undefined),undefined);
assert.throws(()=>__test.ageRange([18,35]),/AGE_RANGE_NOT_SUPPORTED_USE_FULL_PYRAMID/);
assert.throws(()=>__test.year(2031),/INVALID_YEAR/);
assert.throws(()=>__test.validateGeoJSON({type:"Point",coordinates:[119,26]}),/INVALID_GEOJSON/);

const oldFetch=globalThis.fetch;
const seen=[];
try{
  globalThis.fetch=async(url,init={})=>{
    seen.push({url:String(url),headers:init.headers||{},body:init.body||null});
    if(String(url).includes("/tasks/"))return new Response(JSON.stringify({status:"success",result:{total_population:12345,area_km2:1.2,agesex_pyramid:[{class:"20",female:500,male:520}]}}),{status:200,headers:{"content-type":"application/json"}});
    if(String(url).includes("/collections/"))return new Response(JSON.stringify({id:"WSF_2019",type:"Collection"}),{status:200,headers:{"content-type":"application/json"}});
    return new Response(JSON.stringify({task_id:"abc-def-123456",status:"created"}),{status:200,headers:{"content-type":"application/json"}});
  };
  const poly={type:"Polygon",coordinates:[[[119.25,26.05],[119.26,26.05],[119.26,26.06],[119.25,26.05]]]};
  const submit=await runAdapter("worldpop","population_submit",{geojson:poly,year:2026,resolution:"100m"},{WORLDPOP_API_KEY:"test-secret"});
  assert.equal(submit.authenticated,true);
  assert.equal(seen[0].url,"https://api.worldpop.org/v2/population");
  assert.equal(seen[0].headers["X-API-Key"],"test-secret");
  assert.equal(JSON.stringify(submit).includes("test-secret"),false);

  const agesex=await runAdapter("worldpop","agesex_submit",{geojson:poly,year:2026,resolution:"100m",sex:"both"},{});
  assert.equal(agesex.authenticated,false);
  assert.equal(seen[1].url,"https://api.worldpop.org/v2/agesex");
  const agesexBody=JSON.parse(seen[1].body);
  assert.equal("age_range" in agesexBody,false);
  assert.equal(agesexBody.sex,"both");
  await assert.rejects(()=>runAdapter("worldpop","agesex_submit",{geojson:poly,year:2026,resolution:"100m",age_range:[18,35]},{}),/AGE_RANGE_NOT_SUPPORTED_USE_FULL_PYRAMID/);

  const status=await runAdapter("worldpop","task_status",{task_id:"abc-def-123456"},{});
  assert.equal(status.result.status,"success");
  const wsf=await runAdapter("dlr_wsf","collection_get",{collection:"WSF_2019"},{});
  assert.equal(wsf.result.id,"WSF_2019");
  await assert.rejects(()=>runAdapter("dlr_wsf","collection_get",{collection:"https://evil.example"},{}),/INVALID_COLLECTION/);
  for(const p of ["ghsl","copernicus_lcfm","overture_maps","night_lights","foursquare_os_places"]){
    const info=await runAdapter(p,"source_info",{},{});assert.equal(info.arbitrary_url,false);assert.equal(info.coverage,"global");
  }
  console.log(JSON.stringify({ok:true,suite:"free-location-intelligence",worldpop_population_contract:true,worldpop_full_agesex_pyramid:true,custom_age_range_fail_closed:true,dlr_stac_fixed:true,bulk_sources_registered:true,secrets_not_echoed:true,arbitrary_url:false}));
}finally{globalThis.fetch=oldFetch}
