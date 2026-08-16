import assert from "node:assert/strict";
import {FREE_COMMERCIAL_SPATIAL_CATALOG} from "../src/catalog-free-commercial-spatial.js";
import {GEOSPATIAL_COMMERCIAL_DOMAIN} from "../src/domains/geospatial-commercial.js";
import {OPERATIONS,runAdapter} from "../src/adapters-extra4.js";
import {OPERATIONS as OPEN_DATA_OPERATIONS,runAdapter as runOpenData} from "../src/domains/geospatial-commercial-open-data.js";

assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.id,"geospatial-commercial");
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.free_only,true);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.paid_fallback,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.mobile_lbs_observed,false);
for(const p of ["worldpop","ghsl","overture_maps","foursquare_os_places","dlr_wsf","night_lights","worldmove","h3","baidu_maps","tencent_maps","amap","geonames","mobilitydatabase","esa_worldcover","cmab_china","cbra_china","microsoft_building_density_height","earthengine","commercial_web_research","exa","tavily","firecrawl"]){
  assert.ok(JSON.stringify(GEOSPATIAL_COMMERCIAL_DOMAIN.provider_groups).includes(p),`domain missing ${p}`);
}
for(const banned of ["openaq","air_quality_exposure","tianditu","osm_overpass","tencent_location_big_data"]){assert.equal(JSON.stringify(GEOSPATIAL_COMMERCIAL_DOMAIN).includes(banned),false)}
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.openaq,undefined);
assert.equal(OPEN_DATA_OPERATIONS.openaq,undefined);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.geonames.billing_policy.includes("no premium"),true);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.mobilitydatabase.billing_policy.includes("no paid"),true);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.esa_worldcover.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.cmab_china.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.cbra_china.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.microsoft_building_density_height.license,"CDLA-Permissive-2.0");
assert.ok(FREE_COMMERCIAL_SPATIAL_CATALOG.commercial_web_research);
assert.deepEqual(OPERATIONS.geospatial_commercial,["capabilities"]);
assert.ok(OPERATIONS.geonames.includes("search"));
assert.ok(OPERATIONS.mobilitydatabase.includes("gtfs_search"));
assert.equal(OPERATIONS.mobilitydatabase.includes("download"),false);
assert.equal(OPERATIONS.mobilitydatabase.includes("feed_get"),false);
assert.deepEqual(OPEN_DATA_OPERATIONS.esa_worldcover,["tile_info","tile_probe"]);

const originalFetch=globalThis.fetch;
try{
  let calls=[];
  globalThis.fetch=async (url,init={})=>{
    calls.push({url:String(url),init});
    const u=new URL(String(url));
    if(u.hostname==="secure.geonames.org")return new Response(JSON.stringify({geonames:[{name:"Fuzhou",lat:"26.0745",lng:"119.2965"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="api.mobilitydatabase.org"&&u.pathname==="/v1/tokens")return new Response(JSON.stringify({access_token:"ACCESS_FROM_REFRESH"}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="api.mobilitydatabase.org")return new Response(JSON.stringify({feeds:[],metadata:{ok:true}}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="esa-worldcover.s3.eu-central-1.amazonaws.com")return new Response(new Uint8Array(32),{status:206,headers:{"content-type":"image/tiff","content-range":"bytes 0-31/123456","etag":"test-etag"}});
    throw new Error(`UNEXPECTED_URL:${u}`);
  };

  const manifest=await runAdapter("geospatial_commercial","capabilities",{},{});
  assert.equal(manifest.data.id,"geospatial-commercial");
  assert.equal(JSON.stringify(manifest.data).includes("openaq"),false);
  assert.equal(JSON.stringify(manifest.data).includes("cmab_china"),true);
  assert.equal(JSON.stringify(manifest.data).includes("cbra_china"),true);
  assert.equal(JSON.stringify(manifest.data).includes("microsoft_building_density_height"),true);
  assert.equal(JSON.stringify(manifest.data).includes("google_dynamic_world"),true);

  const g=await runAdapter("geonames","search",{q:"Fuzhou",country:"CN",limit:100},{GEONAMES_USERNAME:"free-user"});
  assert.equal(g.free_tier_only,true);
  const gu=new URL(calls.at(-1).url);
  assert.equal(gu.hostname,"secure.geonames.org");
  assert.equal(gu.pathname,"/searchJSON");
  assert.equal(gu.searchParams.get("username"),"free-user");
  assert.equal(gu.searchParams.get("maxRows"),"50");

  calls=[];
  const m=await runAdapter("mobilitydatabase","gtfs_search",{country_code:"cn",municipality:"Fuzhou",limit:999},{MOBILITYDATABASE_ACCESS_TOKEN:"FREE_ACCESS"});
  assert.equal(m.free_account_only,true);
  const mc=calls.at(-1),mu=new URL(mc.url);
  assert.equal(mu.hostname,"api.mobilitydatabase.org");
  assert.equal(mu.pathname,"/v1/gtfs_feeds");
  assert.equal(mu.searchParams.get("country_code"),"CN");
  assert.equal(mu.searchParams.get("limit"),"50");
  assert.equal(mc.init.headers.authorization,"Bearer FREE_ACCESS");

  calls=[];
  await runAdapter("mobilitydatabase","metadata",{},{MOBILITYDATABASE_REFRESH_TOKEN:"FREE_REFRESH"});
  assert.equal(new URL(calls[0].url).pathname,"/v1/tokens");
  assert.equal(calls[0].init.method,"POST");
  assert.equal(new URL(calls[1].url).pathname,"/v1/metadata");
  assert.equal(calls[1].init.headers.authorization,"Bearer ACCESS_FROM_REFRESH");

  calls=[];
  const wc=await runOpenData("esa_worldcover","tile_info",{location:"26.0647,119.2868",year:2021},{});
  assert.equal(wc.public_open_data,true);
  assert.equal(wc.data.tile,"N24E117");
  assert.equal(wc.data.url,"https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N24E117_Map.tif");
  assert.equal(wc.data.change_warning.includes("not pure"),true);
  const probe=await runOpenData("esa_worldcover","tile_probe",{location:"26.0647,119.2868",year:2021},{});
  assert.equal(probe.data.reachable,true);
  assert.equal(probe.data.http_status,206);
  assert.equal(probe.data.bytes_requested,32);
  assert.equal(calls.at(-1).init.headers.range,"bytes=0-31");

  await assert.rejects(()=>runAdapter("geonames","search",{q:"Fuzhou"},{}),e=>e?.status===503&&e?.message==="UPSTREAM_AUTH_FAILED");
  await assert.rejects(()=>runAdapter("mobilitydatabase","metadata",{},{}),e=>e?.status===503&&e?.message==="UPSTREAM_AUTH_FAILED");
} finally {globalThis.fetch=originalFetch;}

console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-domain",domain:GEOSPATIAL_COMMERCIAL_DOMAIN.version,free_only:true,new_free_sources:["geonames","mobilitydatabase","esa_worldcover","cmab_china","cbra_china","microsoft_building_density_height"],earthengine_dataset_plan:["GOOGLE/DYNAMICWORLD/V1"],web_research:["exa","tavily","firecrawl"],air_quality_in_domain:false,raw_feed_proxy:false,arbitrary_url:false}));
