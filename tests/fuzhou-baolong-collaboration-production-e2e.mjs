import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
let seq=0;
async function run(provider,operation,args={}){
  const task_id=`baolong-${provider.replace(/[^a-z0-9]/gi,"-")}-${Date.now()}-${++seq}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:30,args})});
  const body=await r.json().catch(()=>null);return{status:r.status,body};
}
async function readiness(provider){const r=await fetch(`${BASE}/v1/provider/${provider}/readiness`);return{status:r.status,body:await r.json().catch(()=>null)}}
function requirePass(label,x){assert.equal(x.status,200,`${label} HTTP ${x.status}: ${JSON.stringify(x.body)}`);assert.equal(x.body?.ok,true,`${label}: ${JSON.stringify(x.body)}`);return x.body?.result}
function tencentRows(result){const d=result?.data?.data;return Array.isArray(d)?d:[]}

const args={place_name:"福州宝龙城市广场",city:"福州",province:"福建",country_code:"CN",municipality:"Fuzhou",location:"26.061551,119.291555",competitor_names:["福州苏宁广场","福州万象城"]};
const plan=requirePass("collaboration plan",await run("geospatial_commercial","combined_context",args));
assert.equal(plan?.mode,"serial-controller-plan");assert.equal(plan?.collaboration?.network_intelligence_branch,"network-intelligence-collection");assert.equal(plan?.observed_mobile_lbs,false);assert.equal(plan?.real_footfall,false);assert.ok(Array.isArray(plan?.plan)&&plan.plan.length>=9);

const target=requirePass("Tencent target",await run("tencent_maps","place_text",{keyword:"福州宝龙城市广场",region:"福州",limit:8}));
const targetRows=tencentRows(target);assert.ok(targetRows.length>0,`Tencent target empty: ${JSON.stringify(target)}`);
const malls=requirePass("Tencent nearby malls",await run("tencent_maps","place_nearby",{keyword:"购物中心",location:args.location,radius:3000,limit:20}));
const metro=requirePass("Tencent nearby metro",await run("tencent_maps","place_nearby",{keyword:"地铁站",location:args.location,radius:1500,limit:20}));
const bus=requirePass("Tencent nearby bus",await run("tencent_maps","place_nearby",{keyword:"公交站",location:args.location,radius:1000,limit:20}));
const traffic=requirePass("Baidu traffic",await run("baidu_maps","traffic_around",{center:args.location,radius:500,coord_type_input:"wgs84",coord_type_output:"bd09ll"}));
const geo=requirePass("GeoNames nearby",await run("geonames","nearby",{lat:26.061551,lng:119.291555,radius:10,limit:20,lang:"zh"}));
const mobility=requirePass("MobilityDatabase Fuzhou",await run("mobilitydatabase","gtfs_search",{country_code:"CN",municipality:"Fuzhou",limit:20}));

let web=null,webProvider=null;for(const p of ["tavily","exa","firecrawl"]){const rd=await readiness(p);if(rd.status===200&&rd.body?.configured===true){webProvider=p;break}}
assert.ok(webProvider,"No configured web intelligence provider among tavily/exa/firecrawl");
web=requirePass(`Web intelligence ${webProvider}`,await run(webProvider,"search",{query:"福建 福州 福州宝龙城市广场 品牌 商户 招商 2025 2026",limit:3,country:"CN"}));
assert.ok(Array.isArray(web?.items)&&web.items.length>0,`Web intelligence empty: ${JSON.stringify(web)}`);

console.log(JSON.stringify({ok:true,suite:"fuzhou-baolong-collaboration-production-e2e",case:"福州宝龙城市广场",collaboration_plan:true,tencent_target_count:targetRows.length,tencent_nearby_mall_count:tencentRows(malls).length,tencent_nearby_metro_count:tencentRows(metro).length,tencent_nearby_bus_count:tencentRows(bus).length,baidu_traffic:true,geonames:true,mobilitydatabase:true,web_provider:webProvider,web_items:web.items.length,observed_mobile_lbs:false,real_footfall:false,secrets_redacted:true}));
