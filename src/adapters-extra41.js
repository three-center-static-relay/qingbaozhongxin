const MAX_BYTES=1500000,TIMEOUT_MS=18000;
const text=(v,n=1200)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function query(v){const s=text(v,800);if(!s)err("ARG_REQUIRED:query",400);return s}
function envSecret(env,names){for(const name of names){const s=text(env?.[name],1000);if(s)return s}err("UPSTREAM_AUTH_FAILED",503,{missing:names})}
async function boundedText(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502);const reader=r.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES})}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function request(url,{headers={},format="json"}={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{method:"GET",headers:{accept:format==="xml"?"application/xml,text/xml;q=0.9,*/*;q=0.1":"application/json","user-agent":"three-center-intelligence-knowledge-archives/1.0",...headers},signal:c.signal}),raw=await boundedText(r);if(!r.ok){const auth=r.status===401||r.status===403;err(auth?"UPSTREAM_AUTH_FAILED":r.status===429?"UPSTREAM_RATE_LIMITED":"UPSTREAM_HTTP_ERROR",auth?503:r.status===429?429:502,{http_status:r.status,preview:text(raw,400)})}if(format==="xml")return raw;try{return raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{http_status:r.status,preview:text(raw,300)})}}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}
const arr=v=>Array.isArray(v)?v:[];
function first(v){return Array.isArray(v)?v[0]:v??null}
function cleanCql(v){return query(v).replace(/[\u0000-\u001f]/g," ").replace(/["\\]/g," ").replace(/\s+/g," ").trim()}
function xmlDecode(s){return String(s??"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&").trim()}
function xmlTag(block,name){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),m=block.match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${escaped}>`,"i"));return m?xmlDecode(m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ")):null}
function xmlRecords(raw,limit){const blocks=[...raw.matchAll(/<(?:[A-Za-z0-9_-]+:)?record\b[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?record>/gi)].slice(0,limit).map(m=>m[0]);return blocks.map(b=>({title:xmlTag(b,"title"),creator:xmlTag(b,"creator"),subject:xmlTag(b,"subject"),description:xmlTag(b,"description"),publisher:xmlTag(b,"publisher"),date:xmlTag(b,"date"),type:xmlTag(b,"type"),language:xmlTag(b,"language"),identifier:xmlTag(b,"identifier"),rights:xmlTag(b,"rights")}))}
function normalizeLoc(x){return{id:x?.id??null,title:first(x?.title),date:x?.date??null,creator:first(x?.contributor)||first(x?.creator),description:first(x?.description),subject:arr(x?.subject).slice(0,12),location:arr(x?.location).slice(0,8),format:arr(x?.original_format).slice(0,8),url:x?.url??x?.id??null}}
function normalizeEuropeana(x){return{id:x?.id??null,title:first(x?.title),creator:first(x?.dcCreator),year:first(x?.year),country:first(x?.country),type:first(x?.type),provider:first(x?.provider),data_provider:first(x?.dataProvider),rights:first(x?.rights),link:x?.guid??null}}
function normalizeDpla(x){const s=x?.sourceResource||{};return{id:x?.id??null,title:first(s?.title),creator:first(s?.creator),date:first(s?.date?.displayDate??s?.date),description:first(s?.description),type:first(s?.type),language:first(s?.language?.name??s?.language),provider:x?.provider?.name??null,is_shown_at:x?.isShownAt??null}}
function normalizeNara(x){const d=x?.record||x?.description||x;return{id:d?.naId??d?.naid??d?.id??null,title:d?.title??d?.titleNaId??null,level:d?.levelOfDescription??null,date:d?.productionDateArray??d?.date??null,record_group:d?.recordGroupNumber??null,series:d?.seriesTitle??null,scope:d?.scopeAndContentNote??null,raw_summary:Object.fromEntries(Object.entries(d||{}).filter(([k])=>/title|date|naid|level|recordgroup|series|description|scope/i.test(k)).slice(0,20))}}
function normalizeDataset(x){return{id:x?.id??x?.identifier??x?.name??null,title:x?.title??x?.name??null,publisher:x?.publisher?.name??x?.publisher??x?.organization?.title??null,description:x?.description??x?.notes??null,keywords:x?.keyword??x?.tags??null,modified:x?.modified??x?.metadata_modified??x?.last_harvested_date??null,landing_page:x?.landingPage??x?.url??null}}
export const OPERATIONS={library_of_congress:["search"],nara_catalog:["search"],europeana:["search"],dpla:["search"],gallica:["search"],ndl_search:["search"],data_gov_us:["search"],data_europa:["search"]};
export async function runAdapter(provider,operation,args={},env={}){
  if(operation!=="search"||!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation});
  const q=query(args?.query),limit=clamp(args?.limit,1,25,10),page=clamp(args?.page,1,100,1);
  if(provider==="library_of_congress"){
    const u=new URL("https://www.loc.gov/search/");u.searchParams.set("fo","json");u.searchParams.set("at","pagination,results");u.searchParams.set("q",q);u.searchParams.set("c",String(limit));u.searchParams.set("sp",String(page));
    const body=await request(u);return{provider,operation,total:Number(body?.pagination?.of??0)||null,page,items:arr(body?.results).slice(0,limit).map(normalizeLoc),source_mode:"Library of Congress official JSON API; public; bounded; read-only"};
  }
  if(provider==="nara_catalog"){
    const u=new URL("https://catalog.archives.gov/api/v2/records/search");u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));u.searchParams.set("page",String(page));
    const body=await request(u,{headers:{"x-api-key":envSecret(env,["NARA_API_KEY","NARA_CATALOG_API_KEY"])}}),items=arr(body?.body?.hits?.hits||body?.hits?.hits||body?.records||body?.results).slice(0,limit).map(x=>normalizeNara(x?._source||x));return{provider,operation,total:Number(body?.body?.hits?.total?.value??body?.hits?.total?.value??body?.total??0)||null,page,items,source_mode:"US National Archives Catalog API v2; key-authenticated; read-only; bounded"};
  }
  if(provider==="europeana"){
    const u=new URL("https://api.europeana.eu/record/v2/search.json");u.searchParams.set("wskey",envSecret(env,["EUROPEANA_API_KEY"]));u.searchParams.set("query",q);u.searchParams.set("rows",String(limit));u.searchParams.set("start",String((page-1)*limit+1));u.searchParams.set("profile","standard");
    const body=await request(u);return{provider,operation,total:Number(body?.totalResults??0)||null,page,items:arr(body?.items).slice(0,limit).map(normalizeEuropeana),source_mode:"Europeana Search API v2; key-authenticated; bounded metadata"};
  }
  if(provider==="dpla"){
    const u=new URL("https://api.dp.la/v2/items");u.searchParams.set("q",q);u.searchParams.set("page_size",String(limit));u.searchParams.set("page",String(page));u.searchParams.set("api_key",envSecret(env,["DPLA_API_KEY"]));
    const body=await request(u);return{provider,operation,total:Number(body?.count??0)||null,page,items:arr(body?.docs).slice(0,limit).map(normalizeDpla),source_mode:"DPLA API v2 JSON-LD; key-authenticated; bounded metadata"};
  }
  if(provider==="gallica"){
    const term=cleanCql(q),u=new URL("https://gallica.bnf.fr/SRU");u.searchParams.set("version","1.2");u.searchParams.set("operation","searchRetrieve");u.searchParams.set("query",`(gallica all \"${term}\")`);u.searchParams.set("maximumRecords",String(limit));u.searchParams.set("startRecord",String((page-1)*limit+1));u.searchParams.set("suggest","0");
    const raw=await request(u,{format:"xml"}),total=Number(xmlTag(raw,"numberOfRecords")||0)||null;return{provider,operation,total,page,items:xmlRecords(raw,limit),source_mode:"BnF Gallica official SRU 1.2; fixed CQL template; bounded Dublin Core metadata"};
  }
  if(provider==="ndl_search"){
    const term=cleanCql(q),u=new URL("https://ndlsearch.ndl.go.jp/api/sru");u.searchParams.set("operation","searchRetrieve");u.searchParams.set("version","1.2");u.searchParams.set("query",`title=\"${term}\"`);u.searchParams.set("maximumRecords",String(limit));u.searchParams.set("startRecord",String((page-1)*limit+1));
    const raw=await request(u,{format:"xml"}),total=Number(xmlTag(raw,"numberOfRecords")||0)||null;return{provider,operation,total,page,items:xmlRecords(raw,limit),source_mode:"National Diet Library Search official SRU; documented title CQL template; bounded metadata; provider terms apply"};
  }
  if(provider==="data_gov_us"){
    const u=new URL("https://api.gsa.gov/technology/datagov/v4/search");u.searchParams.set("q",q);u.searchParams.set("per_page",String(limit));if(args?.after)u.searchParams.set("after",text(args.after,1500));
    const body=await request(u,{headers:{"X-Api-Key":envSecret(env,["DATA_GOV_API_KEY","GSA_DATA_GOV_API_KEY"])}});return{provider,operation,next_after:body?.after??null,items:arr(body?.results).slice(0,limit).map(normalizeDataset),source_mode:"Data.gov official Catalog API v4; key-authenticated; cursor-ready; bounded metadata"};
  }
  if(provider==="data_europa"){
    const u=new URL("https://data.europa.eu/api/hub/search/ckan/package_search");u.searchParams.set("q",q);u.searchParams.set("rows",String(limit));u.searchParams.set("start",String((page-1)*limit));
    const body=await request(u),result=body?.result||body;return{provider,operation,total:Number(result?.count??result?.total??0)||null,page,items:arr(result?.results||result?.datasets).slice(0,limit).map(normalizeDataset),source_mode:"data.europa.eu official Hub Search CKAN API; public; bounded dataset metadata"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation});
}
