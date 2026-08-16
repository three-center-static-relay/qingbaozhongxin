import assert from "node:assert/strict";
import {runAdapter as runSpatial} from "../src/adapters-extra44.js";
import {runAdapter as runMap} from "../src/adapters-extra4.js";
import {CATALOG,statusFor} from "../src/catalog.js";

for(const p of ["h3","openrouteservice","worldmove","baidu_maps","tencent_maps"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(CATALOG[p].arbitrary_url,false)}
assert.equal(CATALOG.osm_overpass,undefined);
assert.equal(statusFor({},"h3").configured,true);
assert.equal(statusFor({},"worldmove").configured,true);
assert.equal(statusFor({},"openrouteservice").configured,false);
assert.equal(statusFor({ORS_API_KEY:"free-key"},"openrouteservice").configured,true);
assert.match(CATALOG.baidu_maps.billing_policy,/free-default-quota-only/);
assert.match(CATALOG.openrouteservice.billing_policy,/no automatic paid upgrade/);
assert.equal(CATALOG.worldmove.endpoint,"https://api.figshare.com/v2/articles/30023491");

const h=await runSpatial("h3","latlng_to_cell",{location:[119.2965,26.0745],resolution:9},{});
assert.match(h.cell,/^[0-9a-f]+$/i);
const boundary=await runSpatial("h3","cell_to_boundary",{cell:h.cell},{});
assert.ok(boundary.boundary.length>=6);
const disk=await runSpatial("h3","grid_disk",{cell:h.cell,k:1},{});
assert.ok(disk.cells.length>=7);
await assert.rejects(()=>runSpatial("openrouteservice","matrix",{locations:[[119.29,26.07],[119.30,26.08]]},{}),/UPSTREAM_AUTH_FAILED/);
await assert.rejects(()=>runSpatial("osm_overpass","nearby_features",{location:[119.29,26.07],radius:500,category:"retail"},{}),/ADAPTER_OPERATION_NOT_APPROVED/);

const oldFetch=globalThis.fetch,seen=[];
try{
  globalThis.fetch=async(url,init={})=>{
    seen.push({url:String(url),headers:init.headers||{},body:init.body||null});
    const s=String(url);
    if(s.includes("api.openrouteservice.org"))return new Response(JSON.stringify({durations:[[0,60],[60,0]],distances:[[0,1000],[1000,0]]}),{status:200,headers:{"content-type":"application/json"}});
    if(s==="https://api.figshare.com/v2/articles/30023491")return new Response(JSON.stringify({id:30023491,figshare_url:"https://figshare.com/articles/dataset/WorldMove_Dataset/30023491",files:[{id:57561772,name:"data.zip",size:3088383990,mimetype:"application/zip",computed_md5:"63f64cbb68d754cc04069eb8dbeca3ad",download_url:"https://ndownloader.figshare.com/files/57561772"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(s.includes("api.map.baidu.com/traffic/v1/around"))return new Response(JSON.stringify({status:0,message:"ok",description:"畅通",road_traffic:[{road_name:"测试路",traffic_detail:[{speed:30}],congestion_sections:[]}]}),{status:200,headers:{"content-type":"application/json"}});
    if(s.includes("apis.map.qq.com/ws/place/v1/search")){
      const u=new URL(s),keyword=u.searchParams.get("keyword")||"";
      const data=keyword.includes("宝龙")?[
        {id:"mixc",title:"万象九宜城",address:"福州市台江区西环中路",category:"购物:综合商场:购物中心",location:{lat:26.064439,lng:119.290673},_distance:333.52},
        {id:"baolong",title:"福州台江宝龙广场",address:"福州市台江区工业路193号",category:"购物:综合商场:购物中心",location:{lat:26.061452,lng:119.291711},_distance:18.86}
      ]:[
        {id:"other",title:"普通地点",address:"福州市台江区",category:"生活服务",location:{lat:26.06,lng:119.29},_distance:100},
        {id:"ninghua",title:"宁化地铁站",address:"地铁2号线",category:"基础设施:交通设施:地铁站",location:{lat:26.06265,lng:119.293343},_distance:210}
      ];
      return new Response(JSON.stringify({status:0,message:"Success",count:data.length,data}),{status:200,headers:{"content-type":"application/json"}});
    }
    throw new Error(`UNEXPECTED_FETCH:${s}`);
  };
  const matrix=await runSpatial("openrouteservice","matrix",{profile:"driving-car",locations:[[119.29,26.07],[119.30,26.08]]},{ORS_API_KEY:"FREE_ONLY_KEY"});
  assert.equal(matrix.locations,2);
  assert.equal(seen[0].url,"https://api.openrouteservice.org/v2/matrix/driving-car");
  assert.equal(seen[0].headers.authorization,"FREE_ONLY_KEY");

  const wm=await runSpatial("worldmove","download_index",{},{});
  assert.equal(wm.reachable,true);
  assert.equal(wm.article_id,30023491);
  assert.equal(wm.files[0].name,"data.zip");
  assert.equal(wm.files[0].download_url,"https://ndownloader.figshare.com/files/57561772");
  assert.equal(seen[1].url,"https://api.figshare.com/v2/articles/30023491");

  const traffic=await runMap("baidu_maps","traffic_around",{center:"26.0745,119.2965",radius:300,coord_type_input:"wgs84"},{BAIDU_MAP_AK:"FREE_BAIDU_KEY"});
  assert.equal(traffic.free_tier_only,true);
  assert.equal(traffic.data.road_traffic[0].traffic_detail,undefined);
  assert.match(seen[2].url,/^https:\/\/api\.map\.baidu\.com\/traffic\/v1\/around\?/);
  assert.match(seen[2].url,/radius=300/);

  const place=await runMap("tencent_maps","place_text",{keyword:"福州台江宝龙广场",region:"福州市",limit:10},{TENCENT_LBS_API_KEY:"FREE_TENCENT_KEY"});
  assert.equal(place.data.relevance_ranked,true);
  assert.equal(place.data.data[0].title,"福州台江宝龙广场");
  assert.ok(place.data.data[0]._relevance_score>place.data.data[1]._relevance_score);
  const textUrl=new URL(seen[3].url);
  assert.equal(textUrl.searchParams.get("boundary"),"region(福州市,0)");
  assert.equal(textUrl.searchParams.get("keyword"),"福州台江宝龙广场");

  const nearby=await runMap("tencent_maps","place_nearby",{keyword:"宁化地铁站",location:"26.061551,119.291555",radius:1500,limit:10},{TENCENT_LBS_API_KEY:"FREE_TENCENT_KEY"});
  assert.equal(nearby.data.data[0].title,"宁化地铁站");
  const nearUrl=new URL(seen[4].url);
  assert.equal(nearUrl.searchParams.get("boundary"),"nearby(26.061551,119.291555,1500)");
  assert.equal(nearUrl.searchParams.get("keyword"),"宁化地铁站");
}finally{globalThis.fetch=oldFetch}

console.log(JSON.stringify({ok:true,suite:"free-commercial-spatial-stack",h3_local:true,ors_free_key_fail_closed:true,overpass_removed_after_cloudflare_e2e_failure:true,worldmove_figshare_official_archive:true,baidu_free_traffic_only:true,tencent_text_place_resolution:true,tencent_keyword_relevance_ranked:true,no_paid_autoupgrade:true}));
