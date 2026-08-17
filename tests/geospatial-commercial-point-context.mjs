import assert from "node:assert/strict";
import {buildPointContext,OPERATIONS as BUNDLE_OPERATIONS} from "../src/domains/geospatial-commercial-bundle.js";
import {OPERATIONS,runAdapter as runUnifiedAdapter} from "../src/adapters.js";

assert.deepEqual(BUNDLE_OPERATIONS.geospatial_commercial,["point_context"]);
assert.ok(OPERATIONS.geospatial_commercial.includes("capabilities"));
assert.ok(OPERATIONS.geospatial_commercial.includes("point_context"));
assert.ok(OPERATIONS.esa_worldcover.includes("tile_info"));
assert.ok(OPERATIONS.openaq.includes("locations_nearby"));
assert.ok(OPERATIONS.h3.includes("latlng_to_cell"));
assert.ok(OPERATIONS.openrouteservice.includes("isochrones"));
assert.ok(OPERATIONS.worldmove.includes("source_info"));

const originalFetch=globalThis.fetch;
try{
  globalThis.fetch=async url=>{
    const u=new URL(String(url));
    assert.equal(u.hostname,"power.larc.nasa.gov");
    assert.equal(u.pathname,"/api/temporal/climatology/point");
    assert.equal(u.searchParams.get("parameters"),"T2M,PRECTOTCORR,RH2M,WS10M");
    return new Response(JSON.stringify({
      properties:{parameter:{T2M:{ANN:19.16},PRECTOTCORR:{ANN:4.17},RH2M:{ANN:84.11},WS10M:{ANN:3.73}}},
      parameters:{T2M:{units:"C"},PRECTOTCORR:{units:"mm/day"},RH2M:{units:"%"},WS10M:{units:"m/s"}},
      header:{range:"2001-2020 climatology",sources:["MERRA2","POWER"],api:{version:"test"}}
    }),{status:200,headers:{"content-type":"application/json"}});
  };

  const seen=[];
  const dispatch=async(provider,operation,args)=>{
    seen.push({provider,operation,args});
    if(provider==="esa_worldcover")return{provider,operation,data:{tile:"N24E117",year:2021}};
    if(provider==="baidu_maps")return{provider,operation,free_tier_only:true,data:{status:0,description:"轻微拥堵"}};
    if(provider==="openaq")return{provider,operation,free_tier_only:true,data:{results:[{id:1}]}};
    if(provider==="geonames")return{provider,operation,free_tier_only:true,data:{geonames:[{name:"Fuzhou"}]}};
    if(provider==="mobilitydatabase")return{provider,operation,free_account_only:true,data:{feeds:[{id:"gtfs-fz"}]}};
    throw new Error(`UNEXPECTED_DISPATCH:${provider}:${operation}`);
  };

  const env={BAIDU_MAP_AK:"b",OPENAQ_API_KEY:"o",GEONAMES_USERNAME:"g",MOBILITYDATABASE_ACCESS_TOKEN:"m"};
  const out=await buildPointContext({location:"26.0647,119.2868",country_code:"CN",municipality:"Fuzhou",h3_resolution:9,traffic_radius_m:900,air_radius_m:99999},env,dispatch);
  assert.equal(out.provider,"geospatial_commercial");
  assert.equal(out.operation,"point_context");
  assert.equal(out.free_only,true);
  assert.equal(out.observed_mobile_lbs,false);
  assert.equal(out.real_footfall,false);
  assert.equal(out.paid_fallback,false);
  assert.equal(out.arbitrary_url,false);
  assert.equal(out.layer_count,7);
  assert.equal(out.successful_layers,7);
  assert.equal(out.source_receipts.length,7);
  for(const r of out.source_receipts)assert.match(r.digest_sha256,/^[a-f0-9]{64}$/);
  assert.equal(out.layers.find(x=>x.name==="nasa_power_climatology").data.annual.T2M,19.16);
  assert.equal(out.layers.find(x=>x.name==="nasa_power_climatology").data.annual.PRECTOTCORR,4.17);
  assert.equal(out.layers.find(x=>x.name==="h3").data.cell,"8941b530807ffff");
  assert.equal(out.deferred_bulk_layers.includes("overture_maps"),true);
  assert.equal(out.deferred_bulk_layers.includes("ghsl"),true);
  assert.equal(out.deferred_bulk_layers.includes("night_lights"),true);
  assert.equal(out.async_area_layers.includes("worldpop_population"),true);
  assert.equal(out.normalization_required_for_compute,true);
  assert.equal(seen.find(x=>x.provider==="baidu_maps").args.radius,900);
  assert.equal(seen.find(x=>x.provider==="baidu_maps").args.coord_type_input,"wgs84");
  assert.equal(seen.find(x=>x.provider==="openaq").args.radius_m,25000);
  assert.equal(seen.find(x=>x.provider==="mobilitydatabase").args.country_code,"CN");

  seen.length=0;
  const minimal=await buildPointContext({location:"26.0647,119.2868"},{},dispatch);
  assert.equal(minimal.successful_layers,3);
  assert.deepEqual(minimal.layers.filter(x=>x.skipped).map(x=>x.name).sort(),["baidu_traffic","geonames","mobilitydatabase","openaq"]);
  assert.equal(minimal.source_receipts.length,3);
  assert.equal(seen.length,1); // only the always-public WorldCover tile_info dispatcher; NASA+H3 are local/fixed direct layers
  assert.equal(seen[0].provider,"esa_worldcover");

  const unifiedMinimal=await runUnifiedAdapter("geospatial_commercial","point_context",{location:"26.0647,119.2868"},{});
  assert.equal(unifiedMinimal.successful_layers,3);
  assert.equal(unifiedMinimal.layers.find(x=>x.name==="esa_worldcover").data.data.tile,"N24E117");
  assert.equal(unifiedMinimal.layers.find(x=>x.name==="h3").data.cell,"8941b530807ffff");

  const h3=await runUnifiedAdapter("h3","latlng_to_cell",{location:[119.2868,26.0647],resolution:9},{});
  assert.equal(h3.cell,"8941b530807ffff");
} finally {globalThis.fetch=originalFetch;}

console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-point-context",free_only:true,unified_dispatch:true,extra44_wired:true,mandatory_public_layers:["h3","esa_worldcover","nasa_power_climatology"],optional_free_layers:["baidu_traffic","openaq","geonames","mobilitydatabase"],observed_mobile_lbs:false,paid_fallback:false}));
