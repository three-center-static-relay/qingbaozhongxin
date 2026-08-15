const MAX_UPSTREAM_BYTES=1500000;
const DEFAULT_TIMEOUT_MS=15000;
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
const required=(v,name)=>{const x=text(v,500);if(!x)throw Object.assign(new Error(`ARG_REQUIRED:${name}`),{status:400});return x};
async function fetchJson(url,init={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),DEFAULT_TIMEOUT_MS);
  try{
    const r=await fetch(url,{...init,signal:c.signal,headers:{accept:"application/json",...(init.headers||{})}});
    const len=Number(r.headers.get("content-length")||0);if(Number.isFinite(len)&&len>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});return body;
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
export const OPERATIONS={
  ncbi_entrez:["search"],
  dbpedia_lookup:["search"],
  rijksmuseum:["search"]
};
export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=required(args?.query,"query"),limit=clamp(args?.limit,1,25,10);
  if(provider==="ncbi_entrez"){
    const dbs=["pubmed","pmc","gene","protein","nuccore","sra","gds","biosample","bioproject","clinvar"];
    const db=dbs.includes(String(args?.db||"pubmed"))?String(args?.db||"pubmed"):"pubmed";
    const u=new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
    u.searchParams.set("db",db);u.searchParams.set("term",q);u.searchParams.set("retmode","json");u.searchParams.set("retmax",String(limit));u.searchParams.set("tool","three-center-intelligence");
    if(env.NCBI_API_KEY)u.searchParams.set("api_key",env.NCBI_API_KEY);if(env.NCBI_EMAIL)u.searchParams.set("email",text(env.NCBI_EMAIL,200));
    const body=await fetchJson(u);return {provider,operation,db,total:Number(body?.esearchresult?.count||0),ids:body?.esearchresult?.idlist||[]};
  }
  if(provider==="dbpedia_lookup"){
    const u=new URL("https://lookup.dbpedia.org/api/search");u.searchParams.set("query",q);u.searchParams.set("format","JSON");u.searchParams.set("maxResults",String(limit));
    const body=await fetchJson(u);return {provider,operation,items:body?.docs||[]};
  }
  if(provider==="rijksmuseum"){
    const fields=["title","creator","type","material","technique","description","creationDate","aboutActor","objectNumber"];
    const field=fields.includes(String(args?.field||"title"))?String(args?.field||"title"):"title";
    const u=new URL("https://data.rijksmuseum.nl/search/collection");u.searchParams.set(field,q);
    const body=await fetchJson(u);return {provider,operation,field,total:body?.partOf?.totalItems??null,items:(body?.orderedItems||[]).slice(0,limit)};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
