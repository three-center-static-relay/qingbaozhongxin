import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";let seq=0;
async function run(provider,operation,args={}){const task_id=`baolong-${Date.now()}-${++seq}`;const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:30,args})});return{status:r.status,body:await r.json().catch(()=>null)}}
async function ready(provider){const r=await fetch(`${BASE}/v1/provider/${provider}/readiness`);return{status:r.status,body:await r.json().catch(()=>null)}}
function pass(label,x){assert.equal(x.status,200,`${label} HTTP ${x.status}: ${JSON.stringify(x.body)}`);assert.equal(x.body?.ok,true,`${label}: ${JSON.stringify(x.body)}`);return x.body.result}
const caseArgs={place_name:"福州宝龙城市广场",city:"福州",province:"福建",country_code:"CN",municipality:"Fuzhou",location:"26.061551,119.291555",competitor_names:["福州苏宁广场","福州万象城"]};
const plan=pass("collaboration plan",await run("geospatial_commercial","combined_context",caseArgs));assert.equal(plan.mode,"serial-controller-plan");assert.equal(plan.observed_mobile_lbs,false);assert.equal(plan.real_footfall,false);
pass("GeoNames",await run("geonames","nearby",{lat:26.061551,lng:119.291555,radius:10,limit:20,lang:"zh"}));
pass("MobilityDatabase",await run("mobilitydatabase","gtfs_search",{country_code:"CN",municipality:"Fuzhou",limit:20}));
let webProvider=null,webResult=null;for(const p of ["tavily","exa","firecrawl"]){const q=await ready(p);if(q.status!==200||q.body?.configured!==true)continue;const x=await run(p,"search",{query:"福州宝龙广场",limit:3});if(x.status===200&&x.body?.ok===true&&Array.isArray(x.body?.result?.items)&&x.body.result.items.length){webProvider=p;webResult=x;break}}
assert.ok(webProvider,"no configured network intelligence provider returned a non-empty Baolong search");
for(const p of ["tencent_maps","baidu_maps"]){const q=await ready(p);assert.equal(q.status,200,`${p} readiness HTTP ${q.status}`);assert.equal(q.body?.configured,true,`${p} not configured`)}
let tencentAlias=null;for(const keyword of plan.place.aliases||[]){const x=await run("tencent_maps","place_text",{keyword,region:"福州",limit:8});const rows=x.body?.result?.data?.data;if(x.status===200&&x.body?.ok===true&&Array.isArray(rows)&&rows.length){tencentAlias={keyword,row_count:rows.length,title:rows[0]?.title||null};break}}
const traffic=await run("baidu_maps","traffic_around",{center:caseArgs.location,radius:500,coord_type_input:"wgs84",coord_type_output:"bd09ll"});
console.log(JSON.stringify({ok:true,suite:"fuzhou-baolong-collaboration-production-e2e",required_core_pass:true,web_provider:webProvider,web_items:webResult.body.result.items.length,tencent_alias_optional_pass:Boolean(tencentAlias),tencent_alias:tencentAlias,baidu_traffic_optional_pass:traffic.status===200&&traffic.body?.ok===true,observed_mobile_lbs:false,real_footfall:false,secrets_redacted:true}));
