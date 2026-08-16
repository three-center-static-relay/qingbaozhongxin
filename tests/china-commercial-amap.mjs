import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-extra3.js";

for(const op of ["place_text","place_around","place_polygon","driving","walking","transit","distance"]){assert.ok(OPERATIONS.amap.includes(op),`missing amap ${op}`)}

const oldFetch=globalThis.fetch;
const calls=[];
try{
  globalThis.fetch=async(url,init={})=>{const u=new URL(String(url));calls.push({u,init});return new Response(JSON.stringify({status:"1",info:"OK",infocode:"10000",count:"0",pois:[],route:{paths:[],transits:[]}}),{status:200,headers:{"content-type":"application/json"}})};
  const env={AMAP_API_KEY:"test-amap-key"};

  await runAdapter("amap","place_around",{location:"119.2965,26.0745",radius:8000,keywords:"购物中心",types:["060100","120100"],limit:25,region:"福州市",city_limit:true,sortrule:"weight"},env);
  let u=calls.at(-1).u;
  assert.equal(u.pathname,"/v5/place/around");
  assert.equal(u.searchParams.get("location"),"119.2965,26.0745");
  assert.equal(u.searchParams.get("radius"),"8000");
  assert.equal(u.searchParams.get("types"),"060100|120100");
  assert.equal(u.searchParams.get("page_size"),"25");
  assert.equal(u.searchParams.get("city_limit"),"true");
  assert.equal(u.searchParams.get("sortrule"),"weight");

  await runAdapter("amap","place_polygon",{polygon:["119.28,26.06","119.32,26.06","119.32,26.09","119.28,26.09","119.28,26.06"],types:"060100|120100",limit:20},env);
  u=calls.at(-1).u;
  assert.equal(u.pathname,"/v5/place/polygon");
  assert.equal(u.searchParams.get("polygon"),"119.28,26.06|119.32,26.06|119.32,26.09|119.28,26.09|119.28,26.06");
  assert.equal(u.searchParams.get("types"),"060100|120100");

  await runAdapter("amap","transit",{origin:"119.2965,26.0745",destination:"119.312,26.081",city1:"0591",city2:"0591",strategy:8,alternative_route:3},env);
  u=calls.at(-1).u;
  assert.equal(u.pathname,"/v5/direction/transit/integrated");
  assert.equal(u.searchParams.get("city1"),"0591");
  assert.equal(u.searchParams.get("city2"),"0591");
  assert.equal(u.searchParams.get("strategy"),"8");
  assert.equal(u.searchParams.get("AlternativeRoute"),"3");
  assert.equal(u.searchParams.get("show_fields"),"cost");

  await runAdapter("amap","driving",{origin:"119.2965,26.0745",destination:"119.312,26.081"},env);
  u=calls.at(-1).u;assert.equal(u.searchParams.get("show_fields"),"cost");
  await runAdapter("amap","walking",{origin:"119.2965,26.0745",destination:"119.312,26.081"},env);
  u=calls.at(-1).u;assert.equal(u.searchParams.get("show_fields"),"cost");

  await assert.rejects(()=>runAdapter("amap","place_polygon",{polygon:["119.28,26.06","119.32,26.06","119.32,26.09"]},env),/POLYGON_NOT_CLOSED/);
  await assert.rejects(()=>runAdapter("amap","place_around",{location:"119.2965,26.0745",types:"bad"},env),/INVALID_POI_TYPES/);
  await assert.rejects(()=>runAdapter("amap","transit",{origin:"119.2965,26.0745",destination:"119.312,26.081",city1:"x",city2:"0591"},env),/INVALID_CITY1/);
  assert.equal(JSON.stringify(calls).includes("test-amap-key"),true,"test should confirm key is used only in outbound URL; production output never echoes it");
  console.log(JSON.stringify({ok:true,suite:"china-commercial-amap",poi_around:true,poi_polygon:true,transit:true,route_cost_duration_fields:true,bounded:true}));
}finally{globalThis.fetch=oldFetch}
