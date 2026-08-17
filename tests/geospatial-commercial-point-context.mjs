import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

assert.ok(OPERATIONS.geospatial_commercial.includes("capabilities"));
assert.ok(OPERATIONS.geospatial_commercial.includes("point_context"));

const originalFetch=globalThis.fetch;
try{
  const calls=[];
  globalThis.fetch=async (url,init={})=>{
    const u=new URL(String(url));
    calls.push({url:String(url),init});
    if(u.hostname==="api.map.baidu.com"&&u.pathname==="/traffic/v1/around"){
      return new Response(JSON.stringify({status:0,description:"轻微拥堵"}),{status:200,headers:{"content-type":"application/json"}});
    }
    if(u.hostname==="secure.geonames.org"&&u.pathname==="/findNearbyJSON"){
      return new Response(JSON.stringify({geonames:[{name:"Fuzhou"}]}),{status:200,headers:{"content-type":"application/json"}});
    }
    if(u.hostname==="api.mobilitydatabase.org"&&u.pathname==="/v1/gtfs_feeds"){
      return new Response(JSON.stringify({feeds:[{id:"gtfs-fz"}]}),{status:200,headers:{"content-type":"application/json"}});
    }
    throw new Error(`UNEXPECTED_URL:${u}`);
  };

  const env={BAIDU_MAP_AK:"b",GEONAMES_USERNAME:"g",MOBILITYDATABASE_ACCESS_TOKEN:"m"};
  const out=await runAdapter("geospatial_commercial","point_context",{
    location:"26.0647,119.2868",country_code:"CN",municipality:"Fuzhou",h3_resolution:9,traffic_radius_m:900
  },env);

  assert.equal(out.provider,"geospatial_commercial");
  assert.equal(out.operation,"point_context");
  assert.equal(out.free_only,true);
  assert.equal(out.observed_mobile_lbs,false);
  assert.equal(out.real_footfall,false);
  assert.equal(out.paid_fallback,false);
  assert.equal(out.arbitrary_url,false);
  assert.equal(out.fixed_upstreams_only,true);
  assert.equal(out.layer_count,5);
  assert.equal(out.successful_layers,5);
  assert.equal(out.source_receipts.length,5);
  for(const r of out.source_receipts)assert.match(r.digest_sha256,/^[a-f0-9]{64}$/);

  const h3=out.layers.find(x=>x.name==="h3");
  assert.equal(h3.data.cell,null);
  assert.equal(h3.data.status,"deferred-to-compute");
  assert.equal(h3.data.resolution,9);
  assert.equal(out.layers.find(x=>x.name==="esa_worldcover").data.tile,"N24E117");
  assert.equal(out.deferred_compute_layers.includes("h3"),true);
  assert.equal(out.deferred_on_demand_layers.includes("nasa_power_climatology"),true);
  assert.equal(out.normalization_required_for_compute,true);

  const baidu=calls.find(x=>new URL(x.url).hostname==="api.map.baidu.com"),bu=new URL(baidu.url);
  assert.equal(bu.searchParams.get("radius"),"900");
  assert.equal(bu.searchParams.get("coord_type_input"),"wgs84");
  const geonames=calls.find(x=>new URL(x.url).hostname==="secure.geonames.org"),gu=new URL(geonames.url);
  assert.equal(gu.searchParams.get("username"),"g");
  const mobility=calls.find(x=>new URL(x.url).hostname==="api.mobilitydatabase.org"),mu=new URL(mobility.url);
  assert.equal(mu.searchParams.get("country_code"),"CN");
  assert.equal(mobility.init.headers.authorization,"Bearer m");

  calls.length=0;
  const minimal=await runAdapter("geospatial_commercial","point_context",{location:"26.0647,119.2868"},{});
  assert.equal(minimal.layer_count,5);
  assert.equal(minimal.successful_layers,2);
  assert.equal(minimal.source_receipts.length,2);
  assert.deepEqual(minimal.layers.filter(x=>x.skipped).map(x=>x.name).sort(),["baidu_traffic","geonames","mobilitydatabase"]);
  assert.equal(calls.length,0);
} finally {globalThis.fetch=originalFetch;}

console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-point-context",free_only:true,unified_dispatch:true,worker_stable_path:true,h3_deferred_to_compute:true,heavy_layers_deferred:true,observed_mobile_lbs:false,paid_fallback:false}));
