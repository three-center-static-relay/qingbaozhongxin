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
export const OPERATIONS={libris:["search"],federal_register:["search"],software_heritage:["search_origin"]};
export async function runAdapter(provider,operation,args){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=required(args?.query,"query"),limit=clamp(args?.limit,1,25,10);
  if(provider==="libris"){
    const u=new URL("https://libris.kb.se/find.jsonld");u.searchParams.set("q",q);u.searchParams.set("_limit",String(limit));u.searchParams.set("computedLabel","en");
    const body=await fetchJson(u,{headers:{accept:"application/ld+json"}});return {provider,operation,data:body};
  }
  if(provider==="federal_register"){
    const u=new URL("https://www.federalregister.gov/api/v1/documents.json");u.searchParams.set("conditions[term]",q);u.searchParams.set("per_page",String(limit));u.searchParams.set("order","relevance");
    const body=await fetchJson(u);return {provider,operation,total:body?.count??null,items:Array.isArray(body?.results)?body.results.slice(0,limit):[]};
  }
  if(provider==="software_heritage"){
    const u=new URL(`https://archive.softwareheritage.org/api/1/origin/search/${encodeURIComponent(q)}/`);u.searchParams.set("limit",String(limit));
    const body=await fetchJson(u);const items=Array.isArray(body)?body:(body?.results||[]);return {provider,operation,items:items.slice(0,limit)};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
