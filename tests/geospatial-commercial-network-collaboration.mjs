import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {NETWORK_COMMERCIAL_QUERY_FAMILIES} from "../src/domains/network-intelligence-commercial.js";
import registry from "../data-assets/intelligence-branch-registry.json" with {type:"json"};

assert.ok(OPERATIONS.geospatial_commercial.includes("combined_context"));
assert.deepEqual(NETWORK_COMMERCIAL_QUERY_FAMILIES,["tenant_brand_mix","recent_operations","access_transport","competition_context"]);
assert.ok(registry.branches.some(x=>x.id==="network-intelligence-collection"));
assert.ok(registry.collaboration_contracts.some(x=>x.operation==="geospatial_commercial.combined_context"));

const oldFetch=globalThis.fetch,calls=[];
try{
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(String(url));calls.push({u,init});
    if(u.hostname==="api.map.baidu.com")return new Response(JSON.stringify({status:0,message:"ok",description:"缓行",road_traffic:[{road_name:"工业路",traffic_detail:[{speed:22}],congestion_sections:[]}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="apis.map.qq.com"){
      const keyword=u.searchParams.get("keyword")||"";
      let data=[];
      if(keyword.includes("福州宝龙"))data=[{id:"baolong",title:"福州宝龙城市广场",address:"福州市台江区工业路193号",category:"购物:综合商场:购物中心",location:{lat:26.061452,lng:119.291711},_distance:20}];
      else if(keyword==="购物中心")data=[{id:"baolong",title:"福州宝龙城市广场",address:"工业路193号",location:{lat:26.061452,lng:119.291711},_distance:20},{id:"suning",title:"福州苏宁广场",address:"工业路233号",location:{lat:26.062,lng:119.294},_distance:360},{id:"mixc",title:"福州万象城",address:"工业路378号",location:{lat:26.0644,lng:119.2907},_distance:520}];
      else if(keyword==="地铁站")data=[{id:"ninghua",title:"宁化地铁站",address:"地铁2号线",location:{lat:26.06265,lng:119.293343},_distance:210}];
      else if(keyword==="公交站")data=[{id:"bus1",title:"宝龙城市广场公交站",address:"工业路",location:{lat:26.0617,lng:119.2918},_distance:80},{id:"bus2",title:"祥坂路口公交站",address:"工业路",location:{lat:26.0609,lng:119.2928},_distance:180}];
      return new Response(JSON.stringify({status:0,message:"Success",count:data.length,data}),{status:200,headers:{"content-type":"application/json"}});
    }
    if(u.hostname==="api.geonames.org")return new Response(JSON.stringify({geonames:[{name:"Fuzhou",countryCode:"CN",adminName1:"Fujian",lat:"26.0745",lng:"119.2965"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="api.mobilitydatabase.org")return new Response(JSON.stringify({feeds:[{id:"cn-fuzhou-test",provider:"Fuzhou Transit"}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="api.tavily.com")return new Response(JSON.stringify({request_id:"tv",results:[{title:"宝龙品牌调整",url:"https://example.com/baolong-brand",content:"福州宝龙城市广场品牌与餐饮调整",score:0.9},{title:"宝龙交通",url:"https://example.com/baolong-transit",content:"宁化地铁站及公交可达",score:0.8}]}),{status:200,headers:{"content-type":"application/json"}});
    if(u.hostname==="api.exa.ai")return new Response(JSON.stringify({requestId:"exa",results:[{title:"福州宝龙商业动态",url:"https://example.org/baolong",publishedDate:"2026-08-01",highlights:["活动与招商动态"]}]}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`UNEXPECTED_URL:${u.href}`);
  };
  const env={BAIDU_MAP_AK:"baidu",TENCENT_LBS_API_KEY:"tencent",GEONAMES_USERNAME:"geo",MOBILITYDATABASE_ACCESS_TOKEN:"mobility",TAVILY_API_KEY:"tv",EXA_API_KEY:"exa"};
  const out=await runAdapter("geospatial_commercial","combined_context",{
    place_name:"福州宝龙城市广场",city:"福州",province:"福建",country_code:"CN",municipality:"Fuzhou",location:"26.061551,119.291555",
    competitor_names:["福州苏宁广场","福州万象城"],max_web_providers:2,web_results_per_query:3
  },env);
  assert.equal(out.provider,"geospatial_commercial");assert.equal(out.operation,"combined_context");
  assert.equal(out.collaboration.network_intelligence_branch,"network-intelligence-collection");assert.equal(out.collaboration.compute_handoff,true);
  assert.equal(out.observed_mobile_lbs,false);assert.equal(out.real_footfall,false);assert.equal(out.dwell_time_observed,false);assert.equal(out.origin_destination_observed,false);
  assert.equal(out.network_assisted,true);assert.ok(out.successful_layers>=8);assert.ok(out.source_receipts.length>=8);
  assert.ok(out.spatial_signals.nearby_mall_count>=3);assert.equal(out.spatial_signals.nearest_metro.title,"宁化地铁站");assert.ok(out.spatial_signals.nearby_bus_count>=2);
  assert.ok(out.web_signals.unique_item_count>=3);assert.equal(out.web_signals.configured_providers.length,2);assert.ok(out.web_signals.domain_diversity>=2);
  assert.ok(out.compute_handoff.recommended_models.includes("location_intelligence.commercial_spatial_fusion"));
  assert.equal(out.compute_handoff.network_used_by_compute,false);assert.match(out.limitations.join(" "),/no-observed-phone-footfall/);
  const baiduCall=calls.find(x=>x.u.hostname==="api.map.baidu.com");assert.ok(baiduCall);const webCalls=calls.filter(x=>["api.tavily.com","api.exa.ai"].includes(x.u.hostname));assert.equal(webCalls.length,8);
  console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-network-collaboration",case:"fuzhou-baolong-city-plaza",network_assisted:true,spatial_layers:true,compute_handoff:true,observed_lbs:false,source_receipts:out.source_receipts.length}));
}finally{globalThis.fetch=oldFetch}
