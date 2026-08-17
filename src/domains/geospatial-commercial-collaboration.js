// Cloudflare diagnostic trigger: isolated collaboration build gate; no runtime semantic change.
import {latLngToCell} from "h3-js";
import {runAdapter as runMap} from "../adapters-extra4.js";
import {runAdapter as runGM} from "../adapters-geonames-mobility.js";
import {runAdapter as runOpenData} from "./geospatial-commercial-open-data.js";
import {buildCommercialWebEvidence} from "./network-intelligence-commercial.js";
import {GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION} from "./geospatial-commercial.js";

const text=(v,n=200)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function fail(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function point(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))fail("INVALID_COORDINATE");const [lat,lng]=s.split(",").map(Number);if(lat<-90||lat>90||lng<-180||lng>180)fail("INVALID_COORDINATE");return{lat,lng,s:`${lat},${lng}`}}
function country(v){const s=text(v,2).toUpperCase();if(!s)return"";if(!/^[A-Z]{2}$/.test(s))fail("INVALID_COUNTRY_CODE");return s}
function has(env,...names){return names.some(n=>Boolean(text(env?.[n],4096)))}
async function sha256(v){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(v)));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function layer(name,kind,fn){const started=Date.now();try{const data=await fn(),digest_sha256=await sha256(data);return{name,ok:true,evidence_kind:kind,digest_sha256,elapsed_ms:Date.now()-started,data}}catch(e){return{name,ok:false,evidence_kind:kind,error:String(e?.message||"LAYER_FAILED").slice(0,160),http_status:e?.status||null,elapsed_ms:Date.now()-started}}
function tencentItems(result){const d=result?.data?.data;return Array.isArray(d)?d:[]}
function sourceReceipt(x){return x?.ok&&x?.digest_sha256?{source:x.name,digest_sha256:x.digest_sha256,evidence_kind:x.evidence_kind}:null}
export const OPERATIONS={geospatial_commercial:["combined_context"]};

export async function runAdapter(provider,operation,args={},env={}){
  if(provider!=="geospatial_commercial"||operation!=="combined_context")fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  const placeName=text(args.place_name,120),city=text(args.city,80),province=text(args.province,80),municipality=text(args.municipality||args.city,100),cc=country(args.country_code||"CN"),p=point(args.location),h3Resolution=clamp(args.h3_resolution,6,12,9);
  if(!placeName)fail("ARG_REQUIRED:place_name");if(!city)fail("ARG_REQUIRED:city");
  const layers=[];
  layers.push(await layer("h3","derived-spatial-index",async()=>({cell:latLngToCell(p.lat,p.lng,h3Resolution),resolution:h3Resolution,location:p.s})));
  layers.push(await layer("esa_worldcover","observed-open-raster-index",async()=>runOpenData("esa_worldcover","tile_info",{location:p.s,year:2021},env)));
  if(has(env,"BAIDU_MAP_AK","BAIDU_MAP_API_KEY"))layers.push(await layer("baidu_traffic","observed-road-traffic",async()=>runMap("baidu_maps","traffic_around",{center:p.s,radius:clamp(args.traffic_radius_m,100,1000,500),coord_type_input:"wgs84",coord_type_output:"bd09ll"},env)));else layers.push({name:"baidu_traffic",ok:false,skipped:true,evidence_kind:"observed-road-traffic",error:"NOT_CONFIGURED"});
  if(has(env,"TENCENT_LBS_API_KEY","TENCENT_MAP_API_KEY")){
    layers.push(await layer("tencent_target_place","observed-map-poi",async()=>runMap("tencent_maps","place_text",{keyword:placeName,region:city,limit:8},env)));
    layers.push(await layer("tencent_nearby_malls","observed-map-poi",async()=>runMap("tencent_maps","place_nearby",{keyword:"购物中心",location:p.s,radius:clamp(args.competition_radius_m,500,5000,3000),limit:20},env)));
    layers.push(await layer("tencent_nearby_metro","observed-map-poi",async()=>runMap("tencent_maps","place_nearby",{keyword:"地铁站",location:p.s,radius:clamp(args.transit_radius_m,300,3000,1500),limit:20},env)));
    layers.push(await layer("tencent_nearby_bus","observed-map-poi",async()=>runMap("tencent_maps","place_nearby",{keyword:"公交站",location:p.s,radius:clamp(args.bus_radius_m,200,2000,1000),limit:20},env)));
  }else layers.push({name:"tencent_map_context",ok:false,skipped:true,evidence_kind:"observed-map-poi",error:"NOT_CONFIGURED"});
  if(has(env,"GEONAMES_USERNAME"))layers.push(await layer("geonames","reference-place-admin",async()=>runGM("geonames","nearby",{lat:p.lat,lng:p.lng,radius:10,limit:20,lang:"zh"},env)));else layers.push({name:"geonames",ok:false,skipped:true,evidence_kind:"reference-place-admin",error:"NOT_CONFIGURED"});
  if(has(env,"MOBILITYDATABASE_REFRESH_TOKEN","MOBILITYDATABASE_ACCESS_TOKEN","MOBILITYDATABASE_API_TOKEN")&&cc&&municipality)layers.push(await layer("mobilitydatabase","transit-feed-metadata",async()=>runGM("mobilitydatabase","gtfs_search",{country_code:cc,municipality,limit:20},env)));else layers.push({name:"mobilitydatabase",ok:false,skipped:true,evidence_kind:"transit-feed-metadata",error:has(env,"MOBILITYDATABASE_REFRESH_TOKEN","MOBILITYDATABASE_ACCESS_TOKEN","MOBILITYDATABASE_API_TOKEN")?"COUNTRY_AND_MUNICIPALITY_REQUIRED":"NOT_CONFIGURED"});
  let web=null;
  if(has(env,"TAVILY_API_KEY","EXA_API_KEY","FIRECRAWL_API_KEY")){
    try{web=await buildCommercialWebEvidence({place_name:placeName,city,province,competitor_names:args.competitor_names,max_providers:clamp(args.max_web_providers,1,3,2),results_per_query:clamp(args.web_results_per_query,1,8,4),query_families:args.query_families},env);const digest_sha256=await sha256(web);layers.push({name:"network_intelligence",ok:true,evidence_kind:"public-web-proxy",digest_sha256,data:web})}catch(e){layers.push({name:"network_intelligence",ok:false,evidence_kind:"public-web-proxy",error:String(e?.message||"WEB_ENRICHMENT_FAILED").slice(0,160),http_status:e?.status||null})}
  }else layers.push({name:"network_intelligence",ok:false,skipped:true,evidence_kind:"public-web-proxy",error:"NOT_CONFIGURED"});
  const successful=layers.filter(x=>x.ok),receipts=successful.map(sourceReceipt).filter(Boolean);
  const target=tencentItems(layers.find(x=>x.name==="tencent_target_place")?.data)?.[0]||null;
  const malls=tencentItems(layers.find(x=>x.name==="tencent_nearby_malls")?.data),metros=tencentItems(layers.find(x=>x.name==="tencent_nearby_metro")?.data),buses=tencentItems(layers.find(x=>x.name==="tencent_nearby_bus")?.data);
  const nearest=(arr)=>arr.filter(x=>Number.isFinite(Number(x?._distance))).sort((a,b)=>Number(a._distance)-Number(b._distance))[0]||null;
  return{
    provider:"geospatial_commercial",operation:"combined_context",domain_version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION,
    collaboration:{network_intelligence_branch:"network-intelligence-collection",geospatial_branch:"geospatial-commercial",compute_handoff:true},
    place:{name:placeName,city,province:province||null,country_code:cc,requested_location:p.s,resolved_target:target?{title:target.title||null,address:target.address||null,location:target.location||null,distance_m:target._distance??null}:null},
    observed_mobile_lbs:false,real_footfall:false,dwell_time_observed:false,origin_destination_observed:false,cross_mall_audience_overlap_observed:false,payment_spend_observed:false,
    network_assisted:Boolean(web),successful_layers:successful.length,layer_count:layers.length,layers,source_receipts:receipts,
    spatial_signals:{nearby_mall_count:malls.length,nearest_other_mall:nearest(malls.filter(x=>!String(x?.title||"").includes(placeName))),nearby_metro_count:metros.length,nearest_metro:nearest(metros),nearby_bus_count:buses.length,nearest_bus:nearest(buses)},
    web_signals:web?{unique_item_count:web.unique_item_count,domain_diversity:web.domain_diversity,family_item_counts:web.family_item_counts,configured_providers:web.configured_providers}:null,
    compute_handoff:{recommended_models:["location_intelligence.commercial_spatial_fusion","location_intelligence.site_ranking","location_intelligence.white_space","location_intelligence.competitor_diversion"],normalization_required:true,network_used_by_compute:false,source_receipts:receipts},
    limitations:["public-web-signals-are-proxy-only","map-poi-and-road-traffic-do-not-equal-person-footfall","no-observed-phone-footfall","no-observed-dwell-time","no-observed-mobile-od","no-cross-mall-audience-overlap","no-private-consumer-profile-or-payment-spend","do-not-claim-baidu-huiyan-or-tencent-location-big-data-equivalence"]
  };
}
