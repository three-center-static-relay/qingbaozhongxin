import {runAdapter as runWebSearch} from "../adapters-extra39.js";

const PROVIDERS=["tavily","exa","firecrawl"];
const SECRET_BY_PROVIDER={tavily:"TAVILY_API_KEY",exa:"EXA_API_KEY",firecrawl:"FIRECRAWL_API_KEY"};
const FAMILIES=["tenant_brand_mix","recent_operations","access_transport","competition_context"];
const text=(v,n=200)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function fail(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function configured(env,p){return Boolean(text(env?.[SECRET_BY_PROVIDER[p]],4096))}
function normalizedCompetitors(v){return(Array.isArray(v)?v:[]).map(x=>text(x,80)).filter(Boolean).slice(0,6)}
function queryTemplates(args){
  const place=text(args?.place_name,120),city=text(args?.city,80),province=text(args?.province,80),competitors=normalizedCompetitors(args?.competitor_names);
  if(!place)fail("ARG_REQUIRED:place_name");if(!city)fail("ARG_REQUIRED:city");
  const geo=[province,city].filter(Boolean).join(" ");
  return{
    tenant_brand_mix:`${geo} ${place} 品牌 商户 餐饮 零售 影院 招商`,
    recent_operations:`${geo} ${place} 2025 2026 活动 开业 调整 改造 招商`,
    access_transport:`${geo} ${place} 地铁 公交 停车 交通 可达性`,
    competition_context:`${geo} ${place} ${competitors.join(" ")} 商圈 竞争 商业体`
  };
}
async function sha256(value){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value)));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function normalizeItem(provider,x){
  const snippet=text(x?.content||x?.description||(Array.isArray(x?.highlights)?x.highlights.join(" "):""),1800);
  return{provider,title:text(x?.title,300),url:text(x?.url,1500),snippet,published_date:text(x?.published_date,80)||null,score:Number.isFinite(Number(x?.score))?Number(x.score):null};
}
export async function buildCommercialWebEvidence(args={},env={}){
  const templates=queryTemplates(args),requestedFamilies=(Array.isArray(args.query_families)?args.query_families:FAMILIES).filter(x=>FAMILIES.includes(x)).slice(0,4);
  if(!requestedFamilies.length)fail("INVALID_QUERY_FAMILIES");
  const maxProviders=clamp(args.max_providers,1,3,2),perQuery=clamp(args.results_per_query,1,8,4);
  const available=PROVIDERS.filter(p=>configured(env,p)).slice(0,maxProviders);
  const layers=[],receipts=[],dedup=new Map();
  for(const family of requestedFamilies){
    const query=templates[family];
    for(const provider of available){
      const started=Date.now();
      try{
        const raw=await runWebSearch(provider,"search",{query,limit:perQuery,country:"CN"},env);
        const items=(Array.isArray(raw?.items)?raw.items:[]).map(x=>normalizeItem(provider,x)).filter(x=>x.url||x.title);
        for(const item of items){const key=item.url||`${provider}:${item.title}`;if(!dedup.has(key))dedup.set(key,{...item,families:[family]});else{const old=dedup.get(key);if(!old.families.includes(family))old.families.push(family)}}
        const digest_sha256=await sha256({provider,family,items});
        layers.push({name:`web:${provider}:${family}`,ok:true,evidence_kind:"public-web-proxy",provider,family,item_count:items.length,digest_sha256,elapsed_ms:Date.now()-started});
        receipts.push({source:`web_${provider}_${family}`,digest_sha256,evidence_kind:"public-web-proxy"});
      }catch(e){layers.push({name:`web:${provider}:${family}`,ok:false,evidence_kind:"public-web-proxy",provider,family,error:String(e?.message||"WEB_SEARCH_FAILED").slice(0,120),http_status:e?.status||null,elapsed_ms:Date.now()-started})}
    }
  }
  const items=[...dedup.values()].slice(0,64),domains=[...new Set(items.map(x=>{try{return new URL(x.url).hostname}catch{return null}}).filter(Boolean))];
  const familyCounts=Object.fromEntries(FAMILIES.map(f=>[f,items.filter(x=>x.families.includes(f)).length]));
  return{
    branch:"network-intelligence-collection",assist_target:"geospatial-commercial",network_intelligence_assistance:true,
    place_name:text(args.place_name,120),city:text(args.city,80),province:text(args.province,80)||null,
    configured_providers:available,query_families:requestedFamilies,query_count:requestedFamilies.length*available.length,
    items,unique_item_count:items.length,domain_diversity:domains.length,family_item_counts:familyCounts,layers,source_receipts:receipts,
    evidence_kind:"public-web-proxy",observed_mobile_lbs:false,real_footfall:false,dwell_time_observed:false,origin_destination_observed:false,
    usage_policy:"discovery-and-corroboration-only; not a substitute for observed LBS or transaction data",arbitrary_url_fetch:false,write:false
  };
}

export const NETWORK_COMMERCIAL_QUERY_FAMILIES=FAMILIES;
