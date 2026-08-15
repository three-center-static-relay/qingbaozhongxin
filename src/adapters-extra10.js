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
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});return {body,http_status:r.status};
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
function doi(v){const s=text(v,300);if(!/^10\.\d{4,9}\/.+/.test(s))throw Object.assign(new Error("INVALID_DOI"),{status:400});return s}
export const OPERATIONS={
  dblp:["search"],inspirehep:["search"],ror:["search"],bhl:["search"],gbif_literature:["search"],uniprot:["search"],opencitations:["doi"],wikimedia_commons:["search"],wikisource:["search"]
};
export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=text(args?.query,300),limit=clamp(args?.limit,1,25,10);
  if(provider==="dblp"){
    if(!q)req(args,"query");const u=new URL("https://dblp.org/search/publ/api");u.searchParams.set("q",q);u.searchParams.set("format","json");u.searchParams.set("h",String(limit));
    const r=await fetchJson(u);const x=r.body?.result?.hits||{};return {provider,operation,total:Number(x["@total"]||0),items:x.hit||[]};
  }
  if(provider==="inspirehep"){
    if(!q)req(args,"query");const u=new URL("https://inspirehep.net/api/literature");u.searchParams.set("q",q);u.searchParams.set("size",String(limit));u.searchParams.set("sort","mostrecent");
    const r=await fetchJson(u);return {provider,operation,total:r.body?.hits?.total??null,items:r.body?.hits?.hits||[]};
  }
  if(provider==="ror"){
    if(!q)req(args,"query");const u=new URL("https://api.ror.org/v2/organizations");u.searchParams.set("query",q);const h={};if(env.ROR_CLIENT_ID)h["Client-Id"]=String(env.ROR_CLIENT_ID);
    const r=await fetchJson(u,{headers:h});return {provider,operation,total:r.body?.number_of_results??null,items:(r.body?.items||[]).slice(0,limit)};
  }
  if(provider==="bhl"){
    if(!env.BHL_API_KEY)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});if(!q)req(args,"query");const u=new URL("https://www.biodiversitylibrary.org/api3");
    u.searchParams.set("op","PublicationSearch");u.searchParams.set("searchterm",q);u.searchParams.set("searchtype",args?.full_text===false?"C":"F");u.searchParams.set("page","1");u.searchParams.set("pageSize",String(limit));u.searchParams.set("format","json");u.searchParams.set("apikey",String(env.BHL_API_KEY));
    const r=await fetchJson(u);return {provider,operation,status:r.body?.Status||null,error:r.body?.ErrorMessage||null,items:r.body?.Result||[]};
  }
  if(provider==="gbif_literature"){
    if(!q)req(args,"query");const u=new URL("https://api.gbif.org/v1/literature/search");u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));
    const r=await fetchJson(u);return {provider,operation,total:r.body?.count??null,items:r.body?.results||[]};
  }
  if(provider==="uniprot"){
    if(!q)req(args,"query");const u=new URL("https://rest.uniprot.org/uniprotkb/search");u.searchParams.set("query",q);u.searchParams.set("format","json");u.searchParams.set("size",String(limit));
    const r=await fetchJson(u,{},15000);return {provider,operation,items:r.body?.results||[]};
  }
  if(provider==="opencitations"){
    const id=doi(req(args,"doi")),u=new URL(`https://api.opencitations.net/meta/v1/metadata/doi:${encodeURIComponent(id)}`);const h={};if(env.OPENCITATIONS_ACCESS_TOKEN)h.authorization=String(env.OPENCITATIONS_ACCESS_TOKEN);
    const r=await fetchJson(u,{headers:h});return {provider,operation,items:Array.isArray(r.body)?r.body:[]};
  }
  if(provider==="wikimedia_commons"){
    if(!q)req(args,"query");const u=new URL("https://commons.wikimedia.org/w/api.php");u.searchParams.set("action","query");u.searchParams.set("list","search");u.searchParams.set("srsearch",q);u.searchParams.set("srnamespace","6");u.searchParams.set("srlimit",String(limit));u.searchParams.set("format","json");u.searchParams.set("origin","*");
    const r=await fetchJson(u);return {provider,operation,total:r.body?.query?.searchinfo?.totalhits??null,items:r.body?.query?.search||[]};
  }
  if(provider==="wikisource"){
    if(!q)req(args,"query");const lang=String(args?.lang||"en").toLowerCase();if(!["en","zh","fr","de","es","it","ru","ja","pt","ar","pl"].includes(lang))throw Object.assign(new Error("INVALID_WIKISOURCE_LANG"),{status:400});const u=new URL(`https://${lang}.wikisource.org/w/api.php`);u.searchParams.set("action","query");u.searchParams.set("list","search");u.searchParams.set("srsearch",q);u.searchParams.set("srlimit",String(limit));u.searchParams.set("format","json");u.searchParams.set("origin","*");
    const r=await fetchJson(u);return {provider,operation,language:lang,total:r.body?.query?.searchinfo?.totalhits??null,items:r.body?.query?.search||[]};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
