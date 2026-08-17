import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import registry from "../data-assets/intelligence-branch-registry.json" with {type:"json"};

assert.ok(OPERATIONS.geospatial_commercial.includes("combined_context"));
assert.ok(registry.branches.some(x=>x.id==="network-intelligence-collection"));
assert.ok(registry.collaboration_contracts.some(x=>x.operation==="geospatial_commercial.combined_context"));

const oldFetch=globalThis.fetch;let fetchCalled=false;
try{
  globalThis.fetch=async()=>{fetchCalled=true;throw new Error("FETCH_NOT_ALLOWED_IN_COLLAB_PLAN")};
  const out=await runAdapter("geospatial_commercial","combined_context",{
    place_name:"福州宝龙城市广场",city:"福州",province:"福建",country_code:"CN",municipality:"Fuzhou",location:"26.061551,119.291555",
    competitor_names:["福州苏宁广场","福州万象城"]
  },{});
  assert.equal(fetchCalled,false,"collaboration plan must not fan out inside Intelligence Worker");
  assert.equal(out.mode,"serial-controller-plan");
  assert.equal(out.collaboration.network_intelligence_branch,"network-intelligence-collection");
  assert.equal(out.collaboration.compute_center,"compute-center");
  assert.equal(out.collaboration.fanout_inside_worker,false);
  assert.equal(out.collaboration.compute_handoff,true);
  assert.ok(Array.isArray(out.place.aliases)&&out.place.aliases.includes("福州宝龙广场"));
  assert.ok(Array.isArray(out.plan)&&out.plan.length>=9);
  const providers=new Set(out.plan.map(x=>x.provider));
  for(const p of ["tencent_maps","baidu_maps","geonames","mobilitydatabase","network-intelligence-collection","compute-center"])assert.ok(providers.has(p),`missing collaboration provider ${p}`);
  const tencent=out.plan.find(x=>x.provider==="tencent_maps"&&x.operation==="place_text");
  assert.equal(tencent.required,false);assert.match(tencent.controller_policy,/aliases-serially/);assert.ok(Array.isArray(tencent.args.keywords));
  const baidu=out.plan.find(x=>x.provider==="baidu_maps"&&x.operation==="traffic_around");assert.equal(baidu.required,false);
  const network=out.plan.find(x=>x.provider==="network-intelligence-collection");assert.equal(network.required,true);assert.equal(network.evidence_kind,"public-web-proxy");assert.equal(network.args.queries.length,4);
  const compute=out.plan.find(x=>x.provider==="compute-center");assert.equal(compute.required,true);assert.ok(compute.args.models.includes("location_intelligence.commercial_spatial_fusion"));assert.ok(compute.args.models.includes("location_intelligence.synthetic_od_gravity"));assert.ok(compute.args.models.includes("location_intelligence.footfall_proxy_nowcast"));
  assert.equal(out.observed_mobile_lbs,false);assert.equal(out.real_footfall,false);assert.equal(out.dwell_time_observed,false);assert.equal(out.origin_destination_observed,false);assert.equal(out.cross_mall_audience_overlap_observed,false);assert.equal(out.payment_spend_observed,false);
  assert.equal(out.execution_policy.serial,true);assert.equal(out.execution_policy.compute_network,false);assert.equal(out.execution_policy.fail_closed,true);
  console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-network-collaboration",case:"fuzhou-baolong-city-plaza",mode:out.mode,plan_stages:out.plan.length,network_assisted:true,compute_handoff:true,observed_lbs:false}));
}finally{globalThis.fetch=oldFetch}
