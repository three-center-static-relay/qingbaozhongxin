import assert from "node:assert/strict";
import {createTestHarness} from "wrangler";
import {http,HttpResponse} from "msw";
import {setupServer} from "msw/node";

const ITEM_ID="S2B_MSIL2A_20260815T023529_N0512_R089_T50RQQ_20260815T044636";
const feature={
  type:"Feature",id:ITEM_ID,collection:"sentinel-2-l2a",bbox:[118.999,26.09,120.12,27.10],
  properties:{datetime:"2026-08-15T02:35:29.024000Z",platform:"sentinel-2b",constellation:"sentinel-2",instruments:["msi"],gsd:10,"eo:cloud_cover":41.03,"product:type":"S2MSI2A","processing:level":"L2","sat:orbit_state":"descending","sat:absolute_orbit":49307,"sat:relative_orbit":89,"grid:code":"MGRS-50RQQ"},
  assets:{
    B04_10m:{title:"Red band - 10m",type:"image/jp2",roles:["data","gsd:10m"],gsd:10,"file:size":123456,"file:checksum":"abc123",href:`s3://eodata/Sentinel-2/${ITEM_ID}/B04_10m.jp2`,alternate:{https:{href:`https://download.dataspace.copernicus.eu/odata/v1/Products(test)/Nodes(B04_10m.jp2)/$value`}},"auth:refs":["s3"],"storage:refs":["cdse-s3"]}
  }
};
const seen={search:null};
const network=setupServer(
  http.get("https://stac.dataspace.copernicus.eu/v1/collections",()=>HttpResponse.json({collections:[{id:"sentinel-2-l2a",title:"Sentinel-2 Level-2A",description:"Surface reflectance",license:"proprietary",extent:{spatial:{bbox:[[-180,-90,180,90]]},temporal:{interval:[["2015-01-01T00:00:00Z",null]]}}}]})),
  http.get("https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a",()=>HttpResponse.json({id:"sentinel-2-l2a",title:"Sentinel-2 Level-2A",description:"Surface reflectance",license:"proprietary",extent:{spatial:{bbox:[[-180,-90,180,90]]},temporal:{interval:[["2015-01-01T00:00:00Z",null]]}}})),
  http.post("https://stac.dataspace.copernicus.eu/v1/search",async({request})=>{seen.search=await request.json();return HttpResponse.json({type:"FeatureCollection",features:[feature],numberMatched:1,numberReturned:1})}),
  http.get(`https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items/${ITEM_ID}`,()=>HttpResponse.json(feature))
);
network.listen({onUnhandledRequest:"error"});
const server=createTestHarness({workers:[{configPath:"./wrangler.test.jsonc"}]});
async function post(id,operation,args={}){const r=await server.fetch("/v1/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:id,provider:"copernicus_cdse_stac",operation,args})});return{status:r.status,body:await r.json()}}
let code=0;
try{
  await server.listen();
  let r=await server.fetch("/v1/provider/copernicus_cdse_stac/readiness");let b=await r.json();assert.equal(r.status,200);assert.equal(b.configured,true);assert.ok(b.operations.includes("search"));assert.ok(b.operations.includes("asset_refs"));
  let out=await post("cdse-stac-collections","collections",{limit:5});assert.equal(out.status,200);assert.equal(out.body.result.items[0].id,"sentinel-2-l2a");
  out=await post("cdse-stac-search","search",{collection:"sentinel-2-l2a",bbox:[119.1,25.9,119.5,26.3],datetime:"2026-08-15/2026-08-16",cloud_cover_lte:60,limit:3});assert.equal(out.status,200);assert.deepEqual(seen.search.collections,["sentinel-2-l2a"]);assert.deepEqual(seen.search.bbox,[119.1,25.9,119.5,26.3]);assert.equal(seen.search.datetime,"2026-08-15T00:00:00Z/2026-08-16T23:59:59.999Z");assert.equal(seen.search.query["eo:cloud_cover"].lte,60);assert.equal(out.body.result.items[0].id,ITEM_ID);assert.equal(out.body.result.items[0].properties.platform,"sentinel-2b");assert.equal(out.body.result.items[0].compute_handoff.recommended_process,"load_stac");assert.equal(out.body.result.binary_proxy,false);
  out=await post("cdse-stac-single-date","search",{collection:"sentinel-2-l2a",datetime:"2026-08-15",limit:1});assert.equal(out.status,200);assert.equal(seen.search.datetime,"2026-08-15T00:00:00Z/2026-08-15T23:59:59.999Z");
  out=await post("cdse-stac-item","item_get",{collection:"sentinel-2-l2a",item_id:ITEM_ID});assert.equal(out.status,200);assert.equal(out.body.result.item.asset_count,1);assert.equal(out.body.result.item.assets[0].type,"image/jp2");
  out=await post("cdse-stac-assets","asset_refs",{collection:"sentinel-2-l2a",item_id:ITEM_ID});assert.equal(out.status,200);assert.equal(out.body.result.assets[0].gsd,10);assert.match(out.body.result.assets[0].href,/^s3:\/\/eodata\//);assert.match(out.body.result.assets[0].https_href,/^https:\/\/download\.dataspace\.copernicus\.eu\//);assert.equal(out.body.result.compute_handoff.compute_target,"copernicus-openeo");assert.equal(out.body.result.binary_proxy,false);
  out=await post("cdse-stac-bad-bbox","search",{collection:"sentinel-2-l2a",bbox:[119.5,25.9,119.1,26.3]});assert.equal(out.status,400);assert.equal(out.body.error,"INVALID_BBOX");
  console.log(JSON.stringify({ok:true,suite:"copernicus-cdse-stac",public_catalog:true,operations:6,sentinel_item:true,asset_refs:true,datetime_normalization:true,openeo_handoff:true,binary_proxy:false,guards:["fixed-CDSE-host","safe-ids","bounded-bbox","bounded-results","no-binary-proxy"]}));
}catch(e){code=1;console.error(e)}
try{await server.close()}catch{}
network.close();
process.exit(code);
