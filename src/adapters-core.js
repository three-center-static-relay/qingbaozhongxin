const MAX_UPSTREAM_BYTES=1500000;
const DEFAULT_TIMEOUT_MS=12000;
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const req=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||String(v).trim()==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
function safeDate(v){const s=text(v,24);if(!/^\d{4}(?:-\d{2}-\d{2})?(?::\d{4}(?:-\d{2}-\d{2})?)?$/.test(s))throw Object.assign(new Error("INVALID_DATE_RANGE"),{status:400});return s}
async function fetchJson(url,init={},timeoutMs=DEFAULT_TIMEOUT_MS){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{...init,signal:c.signal,headers:{accept:"application/json",...(init.headers||{})}});
    const len=Number(r.headers.get("content-length")||0); if(len>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    const raw=await r.text(); if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body; try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status,body}});
    return {http_status:r.status,body};
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
function doiPath(v){const s=text(v,300);if(!/^10\.\d{4,9}\/.+/.test(s))throw Object.assign(new Error("INVALID_DOI"),{status:400});return s.split("/").map(encodeURIComponent).join("/")}

export const OPERATIONS={
  mcp_registry:["search"],worldbank:["indicator"],crossref:["works"],semantic_scholar:["paper_search"],openaire:["research_products"],clinicaltrials:["studies"],open_meteo:["forecast"],apis_guru:["providers"],huggingface:["models"],openalex:["works"],unpaywall:["doi"],tavily:["search"],serpapi:["search"],fred:["series_observations"],alpha_vantage:["daily"]
};

export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403,details:{provider,operation,allowed:OPERATIONS[provider]||[]}});
  if(provider==="mcp_registry"){
    const q=text(req(args,"query"),180),limit=clamp(args.limit,1,20,10),u=new URL("https://registry.modelcontextprotocol.io/v0.1/servers");u.searchParams.set("search",q);u.searchParams.set("limit",String(limit));u.searchParams.set("version","latest");const r=await fetchJson(u);return {provider,operation,items:(r.body?.servers||[]).slice(0,limit),metadata:r.body?.metadata||null};
  }
  if(provider==="worldbank"){
    const country=text(req(args,"country"),40),indicator=text(req(args,"indicator"),60);if(!/^[A-Za-z0-9;._-]+$/.test(country)||!/^[A-Za-z0-9._-]+$/.test(indicator))throw Object.assign(new Error("INVALID_WORLD_BANK_ID"),{status:400});
    const limit=clamp(args.limit,1,100,30),u=new URL(`https://api.worldbank.org/v2/country/${country}/indicator/${indicator}`);u.searchParams.set("format","json");u.searchParams.set("per_page",String(limit));if(args.date)u.searchParams.set("date",safeDate(args.date));const r=await fetchJson(u);return {provider,operation,metadata:Array.isArray(r.body)?r.body[0]:null,items:Array.isArray(r.body)?(r.body[1]||[]):[]};
  }
  if(provider==="crossref"){
    const q=text(req(args,"query"),300),rows=clamp(args.limit,1,20,10),u=new URL("https://api.crossref.org/works");u.searchParams.set("query.bibliographic",q);u.searchParams.set("rows",String(rows));u.searchParams.set("select","DOI,title,author,published,type,URL,is-referenced-by-count");if(env.CROSSREF_MAILTO)u.searchParams.set("mailto",String(env.CROSSREF_MAILTO));const r=await fetchJson(u);return {provider,operation,total:r.body?.message?.["total-results"]??null,items:r.body?.message?.items||[]};
  }
  if(provider==="semantic_scholar"){
    const q=text(req(args,"query"),300),limit=clamp(args.limit,1,20,10),u=new URL("https://api.semanticscholar.org/graph/v1/paper/search");u.searchParams.set("query",q);u.searchParams.set("limit",String(limit));u.searchParams.set("fields","paperId,title,abstract,year,authors,url,venue,citationCount,openAccessPdf");const h={};if(env.SEMANTIC_SCHOLAR_API_KEY)h["x-api-key"]=String(env.SEMANTIC_SCHOLAR_API_KEY);const r=await fetchJson(u,{headers:h});return {provider,operation,total:r.body?.total??null,items:r.body?.data||[]};
  }
  if(provider==="openaire"){
    const q=text(req(args,"query"),300),limit=clamp(args.limit,1,20,10),u=new URL("https://api.openaire.eu/graph/v3/research-products");u.searchParams.set("search",q);u.searchParams.set("page","1");u.searchParams.set("pageSize",String(limit));const r=await fetchJson(u);return {provider,operation,header:r.body?.header||null,items:r.body?.results||[]};
  }
  if(provider==="clinicaltrials"){
    const q=text(req(args,"query"),300),limit=clamp(args.limit,1,50,10),u=new URL("https://clinicaltrials.gov/api/v2/studies");u.searchParams.set("query.term",q);u.searchParams.set("pageSize",String(limit));u.searchParams.set("format","json");const r=await fetchJson(u);return {provider,operation,total:r.body?.totalCount??null,nextPageToken:r.body?.nextPageToken||null,items:r.body?.studies||[]};
  }
  if(provider==="open_meteo"){
    const lat=Number(req(args,"latitude")),lon=Number(req(args,"longitude"));if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lon)||lon<-180||lon>180)throw Object.assign(new Error("INVALID_COORDINATES"),{status:400});
    const days=clamp(args.forecast_days,1,7,3),u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",String(lat));u.searchParams.set("longitude",String(lon));u.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");u.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum");u.searchParams.set("forecast_days",String(days));u.searchParams.set("timezone","auto");const r=await fetchJson(u);return {provider,operation,data:r.body};
  }
  if(provider==="apis_guru"){
    const r=await fetchJson("https://api.apis.guru/v2/providers.json");const data=r.body?.data||r.body||[];return {provider,operation,items:Array.isArray(data)?data.slice(0,500):data};
  }
  if(provider==="huggingface"){
    const q=text(req(args,"query"),200),limit=clamp(args.limit,1,20,10),u=new URL("https://huggingface.co/api/models");u.searchParams.set("search",q);u.searchParams.set("limit",String(limit));u.searchParams.set("sort","downloads");u.searchParams.set("direction","-1");const h={};if(env.HUGGINGFACE_TOKEN)h.authorization=`Bearer ${env.HUGGINGFACE_TOKEN}`;const r=await fetchJson(u,{headers:h});return {provider,operation,items:Array.isArray(r.body)?r.body:[]};
  }
  if(provider==="openalex"){
    if(!env.OPENALEX_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const q=text(req(args,"query"),300),limit=clamp(args.limit,1,20,10),u=new URL("https://api.openalex.org/works");u.searchParams.set("search",q);u.searchParams.set("per-page",String(limit));u.searchParams.set("api_key",String(env.OPENALEX_API_KEY));u.searchParams.set("select","id,doi,title,display_name,publication_year,publication_date,type,language,cited_by_count,is_retracted,primary_location,authorships");const r=await fetchJson(u);return {provider,operation,meta:r.body?.meta||null,items:r.body?.results||[]};
  }
  if(provider==="unpaywall"){
    if(!env.UNPAYWALL_EMAIL)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const u=new URL(`https://api.unpaywall.org/v2/${doiPath(req(args,"doi"))}`);u.searchParams.set("email",String(env.UNPAYWALL_EMAIL));const r=await fetchJson(u);return {provider,operation,item:r.body};
  }
  if(provider==="tavily"){
    if(!env.TAVILY_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const q=text(req(args,"query"),400),max_results=clamp(args.limit,1,10,5),depth=["basic","advanced"].includes(args.search_depth)?args.search_depth:"basic";const r=await fetchJson("https://api.tavily.com/search",{method:"POST",headers:{authorization:`Bearer ${env.TAVILY_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({query:q,max_results,search_depth:depth,include_answer:false,include_raw_content:false,include_images:false})},15000);return {provider,operation,query:r.body?.query||q,items:r.body?.results||[],usage:r.body?.usage||null};
  }
  if(provider==="serpapi"){
    if(!env.SERPAPI_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const q=text(req(args,"query"),300),num=clamp(args.limit,1,10,10),u=new URL("https://serpapi.com/search.json");u.searchParams.set("engine","google");u.searchParams.set("q",q);u.searchParams.set("num",String(num));u.searchParams.set("api_key",String(env.SERPAPI_API_KEY));if(args.location)u.searchParams.set("location",text(args.location,120));const r=await fetchJson(u);return {provider,operation,search_metadata:r.body?.search_metadata||null,items:r.body?.organic_results||[]};
  }
  if(provider==="fred"){
    if(!env.FRED_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const series=text(req(args,"series_id"),80);if(!/^[A-Za-z0-9._-]+$/.test(series))throw Object.assign(new Error("INVALID_SERIES_ID"),{status:400});const limit=clamp(args.limit,1,1000,120),u=new URL("https://api.stlouisfed.org/fred/series/observations");u.searchParams.set("series_id",series);u.searchParams.set("api_key",String(env.FRED_API_KEY));u.searchParams.set("file_type","json");u.searchParams.set("limit",String(limit));if(args.observation_start)u.searchParams.set("observation_start",safeDate(args.observation_start));if(args.observation_end)u.searchParams.set("observation_end",safeDate(args.observation_end));const r=await fetchJson(u);return {provider,operation,metadata:{count:r.body?.count,units:r.body?.units,frequency:r.body?.frequency},items:r.body?.observations||[]};
  }
  if(provider==="alpha_vantage"){
    if(!env.ALPHAVANTAGE_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const symbol=text(req(args,"symbol"),24);if(!/^[A-Za-z0-9._:-]+$/.test(symbol))throw Object.assign(new Error("INVALID_SYMBOL"),{status:400});const u=new URL("https://www.alphavantage.co/query");u.searchParams.set("function","TIME_SERIES_DAILY");u.searchParams.set("symbol",symbol);u.searchParams.set("outputsize","compact");u.searchParams.set("apikey",String(env.ALPHAVANTAGE_API_KEY));const r=await fetchJson(u);return {provider,operation,data:r.body};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
