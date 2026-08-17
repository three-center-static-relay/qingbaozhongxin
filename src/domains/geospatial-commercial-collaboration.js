// Diagnostic trigger: Tencent Baolong alias probe; no runtime semantic change.
const text=(v,n=160)=>String(v??"").trim().slice(0,n),arr=v=>(Array.isArray(v)?v:[]).map(x=>text(x,80)).filter(Boolean).slice(0,6);
function fail(m,s=400){throw Object.assign(new Error(m),{status:s})}
function point(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))fail("INVALID_COORDINATE");const[lat,lng]=s.split(",").map(Number);if(lat<-90||lat>90||lng<-180||lng>180)fail("INVALID_COORDINATE");return{lat,lng,s}}
export const OPERATIONS={geospatial_commercial:["combined_context"]};
export async function runAdapter(provider,operation,args={}){
  if(provider!=="geospatial_commercial"||operation!=="combined_context")fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  const place=text(args.place_name,120),city=text(args.city,80),province=text(args.province,80),municipality=text(args.municipality||city,100),country=text(args.country_code||"CN",2).toUpperCase(),p=point(args.location),competitors=arr(args.competitor_names);if(!place||!city)fail("ARG_REQUIRED:place_name_or_city");
  const geo=[province,city].filter(Boolean).join(" "),web=[
    {family:"tenant_brand_mix",query:`${geo} ${place} 品牌 商户 餐饮 零售 招商`},
    {family:"recent_operations",query:`${geo} ${place} 2025 2026 活动 开业 调整改造 招商`},
    {family:"access_transport",query:`${geo} ${place} 地铁 公交 停车 交通 可达性`},
    {family:"competition_context",query:`${geo} ${place} ${competitors.join(" ")} 商圈 竞争 商业体`}
  ];
  return{provider,operation,mode:"serial-controller-plan",collaboration:{network_intelligence_branch:"network-intelligence-collection",geospatial_branch:"geospatial-commercial",compute_center:"compute-center",fanout_inside_worker:false,compute_handoff:true},place:{name:place,city,province:province||null,country_code:country,municipality,location:p.s},plan:[
    {stage:1,provider:"tencent_maps",operation:"place_text",args:{keyword:place,region:city,limit:8},evidence_kind:"observed-map-poi"},
    {stage:2,provider:"tencent_maps",operation:"place_nearby",args:{keyword:"购物中心",location:p.s,radius:3000,limit:20},evidence_kind:"observed-map-poi"},
    {stage:3,provider:"tencent_maps",operation:"place_nearby",args:{keyword:"地铁站",location:p.s,radius:1500,limit:20},evidence_kind:"observed-map-poi"},
    {stage:4,provider:"tencent_maps",operation:"place_nearby",args:{keyword:"公交站",location:p.s,radius:1000,limit:20},evidence_kind:"observed-map-poi"},
    {stage:5,provider:"baidu_maps",operation:"traffic_around",args:{center:p.s,radius:500,coord_type_input:"wgs84",coord_type_output:"bd09ll"},evidence_kind:"observed-road-traffic"},
    {stage:6,provider:"geonames",operation:"nearby",args:{lat:p.lat,lng:p.lng,radius:10,limit:20,lang:"zh"},evidence_kind:"reference-place-admin"},
    {stage:7,provider:"mobilitydatabase",operation:"gtfs_search",args:{country_code:country,municipality,limit:20},evidence_kind:"transit-feed-metadata"},
    {stage:8,provider:"network-intelligence-collection",operation:"bounded_search",args:{preferred_providers:["tavily","exa","firecrawl"],queries:web,results_per_query:3},evidence_kind:"public-web-proxy"},
    {stage:9,provider:"compute-center",operation:"feature_fusion",args:{models:["location_intelligence.commercial_spatial_fusion","location_intelligence.site_ranking","location_intelligence.white_space","location_intelligence.competitor_diversion"],deferred_transforms:["h3","population-area-aggregation","bulk-poi-building-raster-features"]},evidence_kind:"modeled"}
  ],observed_mobile_lbs:false,real_footfall:false,dwell_time_observed:false,origin_destination_observed:false,cross_mall_audience_overlap_observed:false,payment_spend_observed:false,execution_policy:{serial:true,max_retries:0,arbitrary_url:false,network_search_is_proxy_only:true,compute_network:false,fail_closed:true},limitations:["map-poi-and-road-traffic-do-not-equal-person-footfall","public-web-signals-are-proxy-only","no-observed-phone-footfall","no-observed-dwell-time","no-observed-mobile-od","no-cross-mall-audience-overlap","no-private-consumer-profile-or-payment-spend"]};
}
