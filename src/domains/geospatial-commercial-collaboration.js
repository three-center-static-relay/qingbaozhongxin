import {runAdapter as runMap} from "../adapters-extra4.js";
import {runAdapter as runGM} from "../adapters-geonames-mobility.js";
import {runAdapter as runWeb} from "../adapters-extra39.js";
const text=(v,n=200)=>String(v??"").trim().slice(0,n),clamp=(v,a,b,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const has=(e,...n)=>n.some(k=>Boolean(text(e?.[k],4096)));
function fail(m,s=400){throw Object.assign(new Error(m),{status:s})}
function point(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))fail("INVALID_COORDINATE");const[lat,lng]=s.split(",").map(Number);if(lat<-90||lat>90||lng<-180||lng>180)fail("INVALID_COORDINATE");return{lat,lng,s}}
async function digest(v){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(v)));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function layer(name,kind,fn){try{const data=await fn();return{name,ok:true,evidence_kind:kind,digest_sha256:await digest(data),data}}catch(e){return{name,ok:false,evidence_kind:kind,error:String(e?.message||"LAYER_FAILED").slice(0,120),http_status:e?.status||null}}
const items=x=>Array.isArray(x?.data?.data)?x.data.data:[];
async function webEvidence(place,city,competitors,env,maxProviders=2){
  const providers=[["tavily","TAVILY_API_KEY"],["exa","EXA_API_KEY"],["firecrawl","FIRECRAWL_API_KEY"]].filter(([,k])=>has(env,k)).slice(0,maxProviders),queries=[
    ["tenant_brand_mix",`${city} ${place} 品牌 商户 餐饮 零售 招商`],
    ["recent_operations",`${city} ${place} 2025 2026 活动 开业 调整改造 招商`],
    ["competition_context",`${city} ${place} ${competitors.join(" ")} 商圈 竞争 商业体`]
  ],out=[],receipts=[];
  for(const[p]of providers)for(const[family,query]of queries)try{const r=await runWeb(p,"search",{query,limit:3,country:"CN"},env),data={provider:p,family,items:Array.isArray(r?.items)?r.items.slice(0,3):[]},d=await digest(data);out.push(data);receipts.push({source:`web_${p}_${family}`,digest_sha256:d,evidence_kind:"public-web-proxy"})}catch(e){out.push({provider:p,family,error:String(e?.message||"WEB_SEARCH_FAILED").slice(0,100)})}
  return{providers:providers.map(x=>x[0]),queries:out,source_receipts:receipts,item_count:out.reduce((n,x)=>n+(x.items?.length||0),0),evidence_kind:"public-web-proxy"};
}
export const OPERATIONS={geospatial_commercial:["combined_context"]};
export async function runAdapter(provider,operation,args={},env={}){
  if(provider!=="geospatial_commercial"||operation!=="combined_context")fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  const place=text(args.place_name,120),city=text(args.city,80),p=point(args.location),municipality=text(args.municipality||city,100),country=text(args.country_code||"CN",2).toUpperCase(),competitors=(Array.isArray(args.competitor_names)?args.competitor_names:[]).map(x=>text(x,80)).filter(Boolean).slice(0,6);if(!place||!city)fail("ARG_REQUIRED:place_name_or_city");
  const layers=[await layer("spatial_index","derived-deferred-to-compute",async()=>({location:p.s,h3_resolution:clamp(args.h3_resolution,6,12,9),status:"deferred-to-compute-center"}))];
  if(has(env,"BAIDU_MAP_AK","BAIDU_MAP_API_KEY"))layers.push(await layer("baidu_traffic","observed-road-traffic",()=>runMap("baidu_maps","traffic_around",{center:p.s,radius:clamp(args.traffic_radius_m,100,1000,500),coord_type_input:"wgs84",coord_type_output:"bd09ll"},env)));
  if(has(env,"TENCENT_LBS_API_KEY","TENCENT_MAP_API_KEY"))for(const[n,k,r]of [["target","购物中心",500],["malls","购物中心",3000],["metro","地铁站",1500],["bus","公交站",1000]])layers.push(await layer(`tencent_${n}`,"observed-map-poi",()=>n==="target"?runMap("tencent_maps","place_text",{keyword:place,region:city,limit:8},env):runMap("tencent_maps","place_nearby",{keyword:k,location:p.s,radius:r,limit:20},env)));
  if(has(env,"GEONAMES_USERNAME"))layers.push(await layer("geonames","reference-place-admin",()=>runGM("geonames","nearby",{lat:p.lat,lng:p.lng,radius:10,limit:20,lang:"zh"},env)));
  if(has(env,"MOBILITYDATABASE_REFRESH_TOKEN","MOBILITYDATABASE_ACCESS_TOKEN","MOBILITYDATABASE_API_TOKEN")&&country&&municipality)layers.push(await layer("mobilitydatabase","transit-feed-metadata",()=>runGM("mobilitydatabase","gtfs_search",{country_code:country,municipality,limit:20},env)));
  let web=null;if(has(env,"TAVILY_API_KEY","EXA_API_KEY","FIRECRAWL_API_KEY")){web=await webEvidence(place,city,competitors,env,clamp(args.max_web_providers,1,3,2));layers.push({name:"network_intelligence",ok:true,evidence_kind:"public-web-proxy",digest_sha256:await digest(web),data:web})}
  const good=layers.filter(x=>x.ok),receipts=good.map(x=>({source:x.name,digest_sha256:x.digest_sha256,evidence_kind:x.evidence_kind}));if(web)receipts.push(...web.source_receipts);
  const mall=items(layers.find(x=>x.name==="tencent_malls")?.data),metro=items(layers.find(x=>x.name==="tencent_metro")?.data),bus=items(layers.find(x=>x.name==="tencent_bus")?.data),near=a=>a.filter(x=>Number.isFinite(Number(x?._distance))).sort((x,y)=>Number(x._distance)-Number(y._distance))[0]||null;
  return{provider,operation,collaboration:{network_intelligence_branch:"network-intelligence-collection",geospatial_branch:"geospatial-commercial",compute_handoff:true},place:{name:place,city,location:p.s},network_assisted:Boolean(web),observed_mobile_lbs:false,real_footfall:false,dwell_time_observed:false,origin_destination_observed:false,cross_mall_audience_overlap_observed:false,payment_spend_observed:false,successful_layers:good.length,layer_count:layers.length,layers,source_receipts:receipts,spatial_signals:{nearby_mall_count:mall.length,nearest_metro:near(metro),nearby_bus_count:bus.length,nearest_bus:near(bus)},web_signals:web?{providers:web.providers,item_count:web.item_count}:null,compute_handoff:{recommended_models:["location_intelligence.commercial_spatial_fusion","location_intelligence.site_ranking","location_intelligence.white_space","location_intelligence.competitor_diversion"],deferred_transforms:["h3","population-area-aggregation","bulk-poi-building-raster-features"],network_used_by_compute:false},limitations:["public-web-signals-are-proxy-only","map-poi-and-road-traffic-do-not-equal-person-footfall","no-observed-phone-footfall","no-observed-dwell-time","no-observed-mobile-od","no-cross-mall-audience-overlap","no-private-consumer-profile-or-payment-spend"]};
}
