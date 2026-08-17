import {runAdapter as runGM} from "../adapters-geonames-mobility.js";
const text=(v,n=160)=>String(v??"").trim().slice(0,n),has=(e,...n)=>n.some(k=>Boolean(text(e?.[k],4096)));
function fail(m,s=400){throw Object.assign(new Error(m),{status:s})}
function point(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))fail("INVALID_COORDINATE");const[lat,lng]=s.split(",").map(Number);return{lat,lng,s}}
async function digest(v){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(v)));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function layer(name,kind,fn){try{const data=await fn();return{name,ok:true,evidence_kind:kind,digest_sha256:await digest(data),data}}catch(e){return{name,ok:false,evidence_kind:kind,error:String(e?.message||"LAYER_FAILED").slice(0,120),http_status:e?.status||null}}
export const OPERATIONS={geospatial_commercial:["combined_context"]};
export async function runAdapter(provider,operation,args={},env={}){
  if(provider!=="geospatial_commercial"||operation!=="combined_context")fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  const p=point(args.location),place=text(args.place_name,120),city=text(args.city,80),country=text(args.country_code||"CN",2).toUpperCase(),municipality=text(args.municipality||city,100),layers=[];
  layers.push(await layer("spatial_index","derived-deferred-to-compute",async()=>({location:p.s,h3_resolution:9,status:"deferred-to-compute-center"})));
  if(has(env,"GEONAMES_USERNAME"))layers.push(await layer("geonames","reference-place-admin",()=>runGM("geonames","nearby",{lat:p.lat,lng:p.lng,radius:10,limit:20,lang:"zh"},env)));
  if(has(env,"MOBILITYDATABASE_REFRESH_TOKEN","MOBILITYDATABASE_ACCESS_TOKEN","MOBILITYDATABASE_API_TOKEN"))layers.push(await layer("mobilitydatabase","transit-feed-metadata",()=>runGM("mobilitydatabase","gtfs_search",{country_code:country,municipality,limit:20},env)));
  const good=layers.filter(x=>x.ok),receipts=good.map(x=>({source:x.name,digest_sha256:x.digest_sha256,evidence_kind:x.evidence_kind}));
  return{provider,operation,collaboration:{network_intelligence_branch:"network-intelligence-collection",geospatial_branch:"geospatial-commercial",compute_handoff:true},place:{name:place,city,location:p.s},network_assisted:false,observed_mobile_lbs:false,real_footfall:false,dwell_time_observed:false,origin_destination_observed:false,successful_layers:good.length,layers,source_receipts:receipts,compute_handoff:{recommended_models:["location_intelligence.commercial_spatial_fusion","location_intelligence.site_ranking","location_intelligence.white_space"],network_used_by_compute:false},status:"gm-collaboration-stage"};
}
