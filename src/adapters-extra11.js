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
async function fetchText(url,timeoutMs=DEFAULT_TIMEOUT_MS){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{signal:c.signal,headers:{accept:"application/xml,text/xml;q=0.9,*/*;q=0.1"}});const len=Number(r.headers.get("content-length")||0);if(len>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});return raw;
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
const strip=s=>String(s||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
function xmlRecords(xml,limit){
  const chunks=[...xml.matchAll(/<(?:srw:)?record(?:\s[^>]*)?>([\s\S]*?)<\/(?:srw:)?record>/gi)].slice(0,limit);
  return chunks.map((m,i)=>({index:i+1,text:strip(m[1]).slice(0,8000)}));
}
function safeSolr(q){return String(q).replace(/([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g,"\\$1")}
export const OPERATIONS={
  hal:["search"],oapen:["search"],doab:["search"],eric:["search"],ndl_search:["search"],gallica:["search"],govinfo:["search"]
};
export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=text(args?.query,300),limit=clamp(args?.limit,1,25,10);if(!q)req(args,"query");
  if(provider==="hal"){
    const u=new URL("https://api.archives-ouvertes.fr/search/");u.searchParams.set("q",safeSolr(q));u.searchParams.set("wt","json");u.searchParams.set("rows",String(limit));u.searchParams.set("fl","docid,title_s,authFullName_s,producedDateY_i,doiId_s,uri_s,docType_s,language_s,openAccess_bool");
    const r=await fetchJson(u);return {provider,operation,total:r.body?.response?.numFound??null,items:r.body?.response?.docs||[]};
  }
  if(provider==="oapen"||provider==="doab"){
    const base=provider==="oapen"?"https://library.oapen.org/rest/search":"https://directory.doabooks.org/rest/search",u=new URL(base);u.searchParams.set("query",q);u.searchParams.set("expand","metadata");
    const r=await fetchJson(u,{headers:{accept:"application/json"}},15000);const arr=Array.isArray(r.body)?r.body:(r.body?.items||r.body?.results||[]);return {provider,operation,items:Array.isArray(arr)?arr.slice(0,limit):[]};
  }
  if(provider==="eric"){
    const u=new URL("https://api.ies.ed.gov/eric/");u.searchParams.set("search",q);u.searchParams.set("format","json");u.searchParams.set("rows",String(limit));u.searchParams.set("start","0");if(args?.peer_reviewed===true)u.searchParams.set("peerreviewed","true");
    const r=await fetchJson(u,{},15000);return {provider,operation,total:r.body?.response?.numFound??null,items:r.body?.response?.docs||[]};
  }
  if(provider==="ndl_search"){
    const u=new URL("https://ndlsearch.ndl.go.jp/api/sru");u.searchParams.set("operation","searchRetrieve");u.searchParams.set("version","1.2");u.searchParams.set("maximumRecords",String(limit));u.searchParams.set("query",`anywhere = \"${q.replace(/[\"\\]/g," ")}\"`);
    const xml=await fetchText(u,15000);return {provider,operation,items:xmlRecords(xml,limit)};
  }
  if(provider==="gallica"){
    const u=new URL("https://gallica.bnf.fr/SRU");u.searchParams.set("version","1.2");u.searchParams.set("operation","searchRetrieve");u.searchParams.set("maximumRecords",String(limit));u.searchParams.set("query",`gallica all \"${q.replace(/[\"\\]/g," ")}\"`);
    const xml=await fetchText(u,15000);return {provider,operation,items:xmlRecords(xml,limit)};
  }
  if(provider==="govinfo"){
    const key=env.DATA_GOV_API_KEY||env.GOVINFO_API_KEY;if(!key)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const u=new URL("https://api.govinfo.gov/search");u.searchParams.set("api_key",String(key));
    const body={query:q,pageSize:String(limit),offsetMark:"*",sorts:[{field:"score",sortOrder:"DESC"}]};const r=await fetchJson(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)},15000);return {provider,operation,data:r.body};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
