import assert from "node:assert/strict";
import {runAdapter as runSpatial} from "../src/adapters-extra44.js";
import {runAdapter as runMap} from "../src/adapters-extra4.js";
import {CATALOG,statusFor} from "../src/catalog.js";

for(const p of ["h3","openrouteservice","osm_overpass","worldmove","baidu_maps"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(CATALOG[p].arbitrary_url,false)}
assert.equal(statusFor({},"h3").configured,true);
assert.equal(statusFor({},"osm_overpass").configured,true);
assert.equal(statusFor({},"worldmove").configured,true);
assert.equal(statusFor({},"openrouteservice").configured,false);
assert.equal(statusFor({ORS_API_KEY:"free-key"},"openrouteservice").configured,true);
assert.match(CATALOG.baidu_maps.billing_policy,/free-default-quota-only/);
assert.match(CATALOG.openrouteservice.billing_policy,/no automatic paid upgrade/);
assert.equal(CATALOG.osm_overpass.endpoint,"https://overpass.private.coffee/api/interpreter");
assert.equal(CATALOG.worldmove.endpoint,"https://api.figshare.com/v2/articles/30023491");

const h=await runSpatial("h3","latlng_to_cell",{location:[119.2965,26.0745],resolution:9},{});
assert.match(h.cell,/^[0-9a-f]+$/i);
const boundary=await runSpatial("h3","cell_to_boundary",{cell:h.cell},{});
assert.ok(boundary.boundary.length>=6);
const disk=await runSpatial("h3","grid_disk",{cell:h.cell,k:1},{});
assert.ok(disk.cells.length>=7);
await assert.rejects(()=>runSpatial("openrouteservice","matrix",{locations:[[119.29,26.07],[119.30,26.08]]},{}),/UPSTREAM_AUTH_FAILED/);

const oldFetch=globalThis.fetch,seen=[];
try{
  globalThis.fetch=async(url,init={})=>{
    seen.push({url:String(url),headers:init.headers||{},body:init.body||null});
    const s=String(url);
    if(s.includes("api.openrouteservice.org"))return new Response(JSON.stringify({durations:[[0,60],[60,0]],distances:[[0,1000],[1000,0]]}),{status:200,headers:{"content-type":"application/json"}});
    if(s.includes("overpass.private.coffee"))return new Response(JSON.stringify({version:0.6,osm3s:{timestamp_osm_base:"2026-08-16T00:00:00Z"},elements:[{type:"node",id:1,lat:26.07,lon:119.29,tags:{shop:"supermarket"}}]}),{status:200,headers:{"content-type":"application/json"}});
    if(s==="https://api.figshare.com/v2/articles/30023491")return new Response(JSON.stringify({id:30023491,figshare_url:"https://figshare.com/articles/dataset/WorldMove_Dataset/30023491",files:[{id:57561772,name:"data.zip",size:3088383990,mimetype:"application/zip",computed_md5:"63f64cbb68d754cc04069eb8dbeca3ad",download_url:"https://ndownloader.figshare.com/files/57561772"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(s.includes("api.map.baidu.com/traffic/v1/around"))return new Response(JSON.stringify({status:0,message:"ok",description:"畅通",road_traffic:[{road_name:"测试路",traffic_detail:[{speed:30}],congestion_sections:[]}]}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`UNEXPECTED_FETCH:${s}`);
  };
  const matrix=await runSpatial("openrouteservice","matrix",{profile:"driving-car",locations:[[119.29,26.07],[119.30,26.08]]},{ORS_API_KEY:"FREE_ONLY_KEY"});
  assert.equal(matrix.locations,2);
  assert.equal(seen[0].url,"https://api.openrouteservice.org/v2/matrix/driving-car");
  assert.equal(seen[0].headers.authorization,"FREE_ONLY_KEY");

  const osm=await runSpatial("osm_overpass","nearby_features",{location:[119.29,26.07],radius:500,category:"retail",query:"[out:xml];evil"},{});
  assert.equal(osm.count,1);
  assert.equal(seen[1].url,"https://overpass.private.coffee/api/interpreter");
  assert.match(String(seen[1].body),/shop/);
  assert.doesNotMatch(String(seen[1].body),/evil/);
  await assert.rejects(()=>runSpatial("osm_overpass","nearby_features",{location:[119.29,26.07],category:"arbitrary"},{}),/INVALID_CATEGORY/);

  const wm=await runSpatial("worldmove","download_index",{},{});
  assert.equal(wm.reachable,true);
  assert.equal(wm.article_id,30023491);
  assert.equal(wm.files[0].name,"data.zip");
  assert.equal(wm.files[0].download_url,"https://ndownloader.figshare.com/files/57561772");
  assert.equal(seen[2].url,"https://api.figshare.com/v2/articles/30023491");

  const traffic=await runMap("baidu_maps","traffic_around",{center:"26.0745,119.2965",radius:300,coord_type_input:"wgs84"},{BAIDU_MAP_AK:"FREE_BAIDU_KEY"});
  assert.equal(traffic.free_tier_only,true);
  assert.equal(traffic.data.road_traffic[0].traffic_detail,undefined);
  assert.match(seen[3].url,/^https:\/\/api\.map\.baidu\.com\/traffic\/v1\/around\?/);
  assert.match(seen[3].url,/radius=300/);
}finally{globalThis.fetch=oldFetch}

console.log(JSON.stringify({ok:true,suite:"free-commercial-spatial-stack",h3_local:true,ors_free_key_fail_closed:true,overpass_fixed_query:true,overpass_private_coffee:true,worldmove_figshare_official_archive:true,baidu_free_traffic_only:true,no_paid_autoupgrade:true}));
