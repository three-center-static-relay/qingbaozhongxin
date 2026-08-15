const MAX_UPSTREAM_BYTES=1500000;
const DEFAULT_TIMEOUT_MS=12000;
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const req=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||String(v).trim()==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
async function fetchJson(url,init={},timeoutMs=DEFAULT_TIMEOUT_MS){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{...init,signal:c.signal,headers:{accept:"application/json",...(init.headers||{})}});
    const len=Number(r.headers.get("content-length")||0);if(len>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});
    return {http_status:r.status,body};
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
async function fetchText(url,init={},timeoutMs=DEFAULT_TIMEOUT_MS){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{...init,signal:c.signal,headers:{accept:"application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.1",...(init.headers||{})}});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});
    return raw;
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
const strip=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
function arxivEntries(xml,limit){
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0,limit).map(m=>{
    const x=m[1],one=t=>{const z=x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`));return z?strip(z[1]):null};
    const authors=[...x.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map(a=>strip(a[1]));
    return {id:one("id"),title:one("title"),summary:one("summary"),published:one("published"),updated:one("updated"),authors};
  });
}
function safeServer(v){const s=String(v||"").toLowerCase();if(!["biorxiv","medrxiv"].includes(s))throw Object.assign(new Error("INVALID_PREPRINT_SERVER"),{status:400});return s}

export const OPERATIONS={
  europe_pmc:["search"],
  pubmed:["search"],
  datacite:["search"],
  zenodo:["search"],
  figshare:["search"],
  arxiv:["search"],
  biorxiv:["recent"],
  medrxiv:["recent"],
  library_of_congress:["search"],
  open_library:["search"],
  dpla:["search"],
  europeana:["search"],
  smithsonian:["search"],
  nara_catalog:["search"],
  digitalnz:["search"],
  met_museum:["search"]
};

export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=text(args?.query,300),limit=clamp(args?.limit,1,25,10);

  if(provider==="europe_pmc"){
    if(!q)req(args,"query");const u=new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
    u.searchParams.set("query",q);u.searchParams.set("format","json");u.searchParams.set("resultType","core");u.searchParams.set("pageSize",String(limit));
    const r=await fetchJson(u);return {provider,operation,total:Number(r.body?.hitCount||0),items:r.body?.resultList?.result||[]};
  }
  if(provider==="pubmed"){
    if(!q)req(args,"query");const u=new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
    u.searchParams.set("db","pubmed");u.searchParams.set("term",q);u.searchParams.set("retmode","json");u.searchParams.set("retmax",String(limit));u.searchParams.set("sort","relevance");
    if(env.NCBI_API_KEY)u.searchParams.set("api_key",String(env.NCBI_API_KEY));if(env.NCBI_EMAIL)u.searchParams.set("email",String(env.NCBI_EMAIL));
    const r=await fetchJson(u);const x=r.body?.esearchresult||{};return {provider,operation,total:Number(x.count||0),items:x.idlist||[],translations:x.translationset||[]};
  }
  if(provider==="datacite"){
    if(!q)req(args,"query");const u=new URL("https://api.datacite.org/dois");u.searchParams.set("query",q);u.searchParams.set("page[size]",String(limit));
    const r=await fetchJson(u,{headers:env.CONTACT_EMAIL?{"user-agent":`intelligence-center/1.0 (mailto:${String(env.CONTACT_EMAIL)})`}:{}});return {provider,operation,total:r.body?.meta?.total??null,items:r.body?.data||[]};
  }
  if(provider==="zenodo"){
    if(!q)req(args,"query");const u=new URL("https://zenodo.org/api/records");u.searchParams.set("q",q);u.searchParams.set("size",String(limit));u.searchParams.set("sort","bestmatch");
    const h={};if(env.ZENODO_TOKEN)h.authorization=`Bearer ${env.ZENODO_TOKEN}`;const r=await fetchJson(u,{headers:h},15000);return {provider,operation,total:r.body?.hits?.total?.value??r.body?.hits?.total??null,items:r.body?.hits?.hits||[]};
  }
  if(provider==="figshare"){
    if(!q)req(args,"query");const r=await fetchJson("https://api.figshare.com/v2/articles/search",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({search_for:q,page_size:limit,order:"published_date",order_direction:"desc"})},15000);
    return {provider,operation,items:Array.isArray(r.body)?r.body:[]};
  }
  if(provider==="arxiv"){
    if(!q)req(args,"query");const u=new URL("https://export.arxiv.org/api/query");u.searchParams.set("search_query",`all:${q}`);u.searchParams.set("start","0");u.searchParams.set("max_results",String(limit));u.searchParams.set("sortBy","relevance");
    const xml=await fetchText(u,{},15000);return {provider,operation,items:arxivEntries(xml,limit)};
  }
  if(provider==="biorxiv"||provider==="medrxiv"){
    const server=safeServer(provider),days=clamp(args?.days,1,30,7),u=`https://api.biorxiv.org/details/${server}/${days}d/0/json`;const r=await fetchJson(u);
    return {provider,operation,messages:r.body?.messages||[],items:(r.body?.collection||[]).slice(0,limit)};
  }
  if(provider==="library_of_congress"){
    if(!q)req(args,"query");const u=new URL("https://www.loc.gov/search/");u.searchParams.set("q",q);u.searchParams.set("fo","json");u.searchParams.set("at","pagination,results");u.searchParams.set("c",String(limit));
    const r=await fetchJson(u);return {provider,operation,pagination:r.body?.pagination||null,items:r.body?.results||[]};
  }
  if(provider==="open_library"){
    if(!q)req(args,"query");const u=new URL("https://openlibrary.org/search.json");u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));u.searchParams.set("fields","key,title,author_name,first_publish_year,isbn,language,subject,edition_count");
    const h={};if(env.CONTACT_EMAIL)h["user-agent"]=`IntelligenceCenter (mailto:${String(env.CONTACT_EMAIL)})`;const r=await fetchJson(u,{headers:h});return {provider,operation,total:r.body?.numFound??null,items:r.body?.docs||[]};
  }
  if(provider==="dpla"){
    if(!env.DPLA_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});if(!q)req(args,"query");const u=new URL("https://api.dp.la/v2/items");u.searchParams.set("q",q);u.searchParams.set("page_size",String(limit));u.searchParams.set("api_key",String(env.DPLA_API_KEY));
    const r=await fetchJson(u);return {provider,operation,total:r.body?.count??null,items:r.body?.docs||[]};
  }
  if(provider==="europeana"){
    if(!env.EUROPEANA_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});if(!q)req(args,"query");const u=new URL("https://api.europeana.eu/record/v2/search.json");u.searchParams.set("query",q);u.searchParams.set("rows",String(limit));u.searchParams.set("wskey",String(env.EUROPEANA_API_KEY));
    const r=await fetchJson(u);return {provider,operation,total:r.body?.totalResults??null,items:r.body?.items||[]};
  }
  if(provider==="smithsonian"){
    const key=env.SMITHSONIAN_API_KEY||env.DATA_GOV_API_KEY;if(!key)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});if(!q)req(args,"query");const u=new URL("https://api.si.edu/openaccess/api/v1.0/search");u.searchParams.set("q",q);u.searchParams.set("rows",String(limit));u.searchParams.set("api_key",String(key));
    const r=await fetchJson(u);return {provider,operation,total:r.body?.response?.rowCount??null,items:r.body?.response?.rows||[]};
  }
  if(provider==="nara_catalog"){
    if(!env.NARA_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});if(!q)req(args,"query");const u=new URL("https://catalog.archives.gov/api/v2/records/search");u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));
    const r=await fetchJson(u,{headers:{"x-api-key":String(env.NARA_API_KEY)}});return {provider,operation,data:r.body};
  }
  if(provider==="digitalnz"){
    if(!q)req(args,"query");const u=new URL("https://api.digitalnz.org/v3/records.json");u.searchParams.set("text",q);u.searchParams.set("per_page",String(limit));const h={};if(env.DIGITALNZ_API_KEY)h["Authentication-Token"]=String(env.DIGITALNZ_API_KEY);
    const r=await fetchJson(u,{headers:h});return {provider,operation,total:r.body?.search?.result_count??null,items:r.body?.search?.results||[]};
  }
  if(provider==="met_museum"){
    if(!q)req(args,"query");const u=new URL("https://collectionapi.metmuseum.org/public/collection/v1/search");u.searchParams.set("q",q);if(args?.has_images===true)u.searchParams.set("hasImages","true");
    const r=await fetchJson(u);return {provider,operation,total:r.body?.total??0,items:(r.body?.objectIDs||[]).slice(0,limit)};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
