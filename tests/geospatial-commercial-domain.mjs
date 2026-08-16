import assert from "node:assert/strict";
import {FREE_COMMERCIAL_SPATIAL_CATALOG} from "../src/catalog-free-commercial-spatial.js";
import {GEOSPATIAL_COMMERCIAL_DOMAIN} from "../src/domains/geospatial-commercial.js";
import {OPERATIONS,runAdapter} from "../src/adapters-extra4.js";
import {OPERATIONS as OPEN_DATA_OPERATIONS,runAdapter as runOpenData} from "../src/domains/geospatial-commercial-open-data.js";

assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.id,"geospatial-commercial");
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.free_only,true);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.paid_fallback,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.mobile_lbs_observed,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.admission_policy.free_or_open_only,true);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.admission_policy.free_trial_only_is_core,false);
for(const p of ["worldpop","ghsl","overture_maps","foursquare_os_places","dlr_wsf","night_lights","worldmove","h3","baidu_maps","tencent_maps","amap","geonames","mobilitydatabase","esa_worldcover","cmab_china","cbra_china","microsoft_building_density_height","earthengine","sinolc1_china","cmtbh30_china","glo3d_building_footprints","geolink_uv_china","planetary_computer","copernicus_dataspace_stac","geofabrik_osm_china","kontur_population","transitland_free","valhalla_local","osrm_local"]){
  assert.ok(JSON.stringify(GEOSPATIAL_COMMERCIAL_DOMAIN.provider_groups).includes(p),`domain missing ${p}`);
}
for(const tool of ["geoboundaries_gbOpen_CC_BY_4_0","element84_earth_search_free_public_STAC","opentripplanner_local_LGPL"]){assert.ok(JSON.stringify(GEOSPATIAL_COMMERCIAL_DOMAIN.shared_free_tools).includes(tool),`domain missing shared tool ${tool}`)}
for(const discovery of ["exa","tavily","firecrawl","jina"])assert.ok(GEOSPATIAL_COMMERCIAL_DOMAIN.discovery_policy.discovery_search_tools.includes(discovery));
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.discovery_policy.professional_web_branch,"professional-web-intelligence");
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.discovery_policy.production_dependency,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.discovery_policy.production_feature_source,false);
for(const banned of ["openaq","air_quality_exposure","tianditu","osm_overpass","tencent_location_big_data","commercial_web_research"]){assert.equal(JSON.stringify(GEOSPATIAL_COMMERCIAL_DOMAIN.provider_groups).includes(banned),false)}
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.openaq,undefined);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.commercial_web_research,undefined);
assert.equal(OPEN_DATA_OPERATIONS.openaq,undefined);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.geonames.billing_policy.includes("no premium"),true);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.mobilitydatabase.billing_policy.includes("no paid"),true);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.esa_worldcover.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.cmab_china.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.cbra_china.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.microsoft_building_density_height.license,"CDLA-Permissive-2.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.sinolc1_china.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.cmtbh30_china.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.glo3d_building_footprints.license,"CC-BY-4.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.geofabrik_osm_china.license,"ODbL-1.0");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.kontur_population.license,"CC-BY");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.valhalla_local.license,"MIT");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.osrm_local.license,"BSD-2-Clause");
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.transitland_free.billing_policy.includes("paid-upgrades-disabled"),true);
assert.deepEqual(OPERATIONS.geospatial_commercial,["capabilities"]);
assert.ok(OPERATIONS.geonames.includes("search"));
assert.ok(OPERATIONS.mobilitydatabase.includes("gtfs_search"));
assert.equal(OPERATIONS.mobilitydatabase.includes("download"),false);
assert.equal(OPERATIONS.mobilitydatabase.includes("feed_get"),false);
assert.deepEqual(OPEN_DATA_OPERATIONS.esa_worldcover,["tile_info","tile_probe"]);
for(const p of ["sinolc1_china","cmtbh30_china","glo3d_building_footprints","geolink_uv_china","planetary_computer","copernicus_dataspace_stac","geofabrik_osm_china","kontur_population","transitland_free"])assert.ok(OPEN_DATA_OPERATIONS[p]?.includes("source_info"),`missing source_info ${p}`);
for(const op of ["geoboundaries_metadata","earth_search_stac_search","opentripplanner_source_info"])assert.ok(OPEN_DATA_OPERATIONS.geospatial_commercial.includes(op),`missing shared geospatial operation ${op}`);
assert.ok(OPEN_DATA_OPERATIONS.planetary_computer.includes("stac_search"));
assert.ok(OPEN_DATA_OPERATIONS.copernicus_dataspace_stac.includes("stac_search"));
assert.ok(OPEN_DATA_OPERATIONS.transitland_free.includes("feeds"));
assert.ok(OPEN_DATA_OPERATIONS.transitland_free.includes("stops"));

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
    if(u.hostname==="api.figshare.com"&&u.pathname==="/v2/articles/26840626")return new Response(JSON.stringify({id:26840626,title:"CMTBH-30",license:{name:"CC BY 4.0"}}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="zenodo.org"&&u.pathname==="/api/records/18688062")return new Response(JSON.stringify({id:18688062,metadata:{title:"GeoLink-UV",license:{id:"cc-by-4.0"}}}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="planetarycomputer.microsoft.com")return new Response(JSON.stringify(init.method==="POST"?{type:"FeatureCollection",features:[{id:"pc-item"}]}:{collections:[{id:"sentinel-2-l2a"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="stac.dataspace.copernicus.eu")return new Response(JSON.stringify(init.method==="POST"?{type:"FeatureCollection",features:[{id:"cdse-item"}]}:{collections:[{id:"sentinel-2-l2a"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="earth-search.aws.element84.com")return new Response(JSON.stringify({type:"FeatureCollection",features:[{id:"earth-search-item"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="www.geoboundaries.org")return new Response(JSON.stringify({boundaryID:"CHN-ADM2-test",boundaryISO:"CHN",boundaryType:"ADM2",boundaryLicense:"CC BY 4.0",gjDownloadURL:"https://example.invalid/CHN_ADM2.geojson"}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="download.geofabrik.de")return new Response(new Uint8Array(32),{status:206,headers:{"content-type":"application/octet-stream","content-range":"bytes 0-31/1500000000","last-modified":"Sun, 16 Aug 2026 00:00:00 GMT"}});
    if(u.hostname==="transit.land")return new Response(JSON.stringify({feeds:[],stops:[],meta:{after:0}}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`UNEXPECTED_URL:${u}`);
  };

  const manifest=await runAdapter("geospatial_commercial","capabilities",{},{});
  assert.equal(manifest.data.id,"geospatial-commercial");
  assert.equal(JSON.stringify(manifest.data.provider_groups).includes("commercial_web_research"),false);
  for(const p of ["sinolc1_china","cmtbh30_china","glo3d_building_footprints","geolink_uv_china","planetary_computer","copernicus_dataspace_stac","geofabrik_osm_china","kontur_population"])assert.equal(JSON.stringify(manifest.data).includes(p),true,`manifest missing ${p}`);
  assert.ok(JSON.stringify(manifest.data).includes("opentripplanner_local_LGPL"));

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
  const probe=await runOpenData("esa_worldcover","tile_probe",{location:"26.0647,119.2868",year:2021},{});
  assert.equal(probe.data.reachable,true);
  assert.equal(probe.data.http_status,206);
  assert.equal(calls.at(-1).init.headers.range,"bytes=0-31");

  calls=[];
  const cmt=await runOpenData("cmtbh30_china","metadata_probe",{},{});
  assert.equal(cmt.data.metadata.id,26840626);
  const uv=await runOpenData("geolink_uv_china","metadata_probe",{},{});
  assert.equal(uv.data.metadata.id,18688062);
  const pc=await runOpenData("planetary_computer","stac_probe",{},{});
  assert.equal(pc.data.metadata.collections[0].id,"sentinel-2-l2a");
  const cdse=await runOpenData("copernicus_dataspace_stac","stac_probe",{},{});
  assert.equal(cdse.data.metadata.collections[0].id,"sentinel-2-l2a");
  const osm=await runOpenData("geofabrik_osm_china","range_probe",{},{});
  assert.equal(osm.data.probe.reachable,true);
  assert.equal(osm.data.probe.bytes_requested,32);

  calls=[];
  const gb=await runOpenData("geospatial_commercial","geoboundaries_metadata",{country:"CHN",adm:"ADM2"},{});
  assert.equal(gb.data.license,"CC-BY-4.0");
  assert.equal(new URL(calls.at(-1).url).pathname,"/api/current/gbOpen/CHN/ADM2/");
  const otp=await runOpenData("geospatial_commercial","opentripplanner_source_info",{},{});
  assert.equal(otp.data.license,"LGPL");
  assert.ok(otp.data.capabilities.includes("GTFS-RT"));

  calls=[];
  const es=await runOpenData("geospatial_commercial","earth_search_stac_search",{bbox:[119.1,25.9,119.6,26.3],datetime:"2026-08-01/2026-08-16",collections:["sentinel-2-l2a"],limit:99},{});
  assert.equal(es.data.bounded,true);
  assert.equal(es.data.query.limit,20);
  assert.equal(new URL(calls.at(-1).url).pathname,"/v1/search");
  const esBody=JSON.parse(calls.at(-1).init.body);assert.deepEqual(esBody.bbox,[119.1,25.9,119.6,26.3]);

  calls=[];
  const pcs=await runOpenData("planetary_computer","stac_search",{bbox:[119.1,25.9,119.6,26.3],collections:["sentinel-2-l2a"],limit:5},{});
  assert.equal(pcs.data.result.features[0].id,"pc-item");
  const cds=await runOpenData("copernicus_dataspace_stac","stac_search",{bbox:[119.1,25.9,119.6,26.3],collections:["sentinel-2-l2a"],limit:5},{});
  assert.equal(cds.data.result.features[0].id,"cdse-item");

  calls=[];
  const tf=await runOpenData("transitland_free","feeds",{search:"Fuzhou",bbox:[119.1,25.9,119.6,26.3],limit:999},{TRANSITLAND_API_KEY:"FREE_TRANSITLAND"});
  assert.equal(tf.free_tier_only,true);
  const tfu=new URL(calls.at(-1).url);
  assert.equal(tfu.pathname,"/api/v2/rest/feeds");
  assert.equal(tfu.searchParams.get("limit"),"50");
  assert.equal(tfu.searchParams.get("license_commercial_use_allowed"),"exclude_no");
  assert.equal(calls.at(-1).init.headers.apikey,"FREE_TRANSITLAND");
  calls=[];
  await runOpenData("transitland_free","stops",{location:"26.0647,119.2868",radius_m:50000,limit:10},{TRANSITLAND_API_KEY:"FREE_TRANSITLAND"});
  const tsu=new URL(calls.at(-1).url);
  assert.equal(tsu.searchParams.get("radius"),"10000");

  await assert.rejects(()=>runAdapter("geonames","search",{q:"Fuzhou"},{}),e=>e?.status===503&&e?.message==="UPSTREAM_AUTH_FAILED");
  await assert.rejects(()=>runAdapter("mobilitydatabase","metadata",{},{}),e=>e?.status===503&&e?.message==="UPSTREAM_AUTH_FAILED");
  await assert.rejects(()=>runOpenData("transitland_free","feeds",{},{}),e=>e?.status===503&&e?.message==="UPSTREAM_AUTH_FAILED");
  await assert.rejects(()=>runOpenData("geospatial_commercial","geoboundaries_metadata",{country:"CN",adm:"ADM2"},{}),/INVALID_ISO3/);
  await assert.rejects(()=>runOpenData("geospatial_commercial","earth_search_stac_search",{},{}),/ARG_REQUIRED:stac_filter/);
} finally {globalThis.fetch=originalFetch;}

console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-domain",domain:GEOSPATIAL_COMMERCIAL_DOMAIN.version,free_only:true,new_free_sources:["geonames","mobilitydatabase","esa_worldcover","cmab_china","cbra_china","microsoft_building_density_height","sinolc1_china","cmtbh30_china","glo3d_building_footprints","geolink_uv_china","planetary_computer","copernicus_dataspace_stac","earth_search_stac","geoboundaries_gbopen","kontur_population","transitland_free","geofabrik_osm_china","opentripplanner_local","valhalla_local","osrm_local"],earthengine_dataset_plan:["GOOGLE/DYNAMICWORLD/V1"],discovery_only_tools:["exa","tavily","firecrawl","jina"],air_quality_in_domain:false,raw_feed_proxy:false,arbitrary_url:false}));
