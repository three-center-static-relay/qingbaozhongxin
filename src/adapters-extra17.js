const MAX_UPSTREAM_BYTES=1500000;
const DEFAULT_TIMEOUT_MS=15000;
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const text=(v,n=500)=>String(v??"").trim().slice(0,n);
const required=(v,name)=>{const x=text(v,500);if(!x)throw Object.assign(new Error(`ARG_REQUIRED:${name}`),{status:400});return x};
async function fetchJson(url){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),DEFAULT_TIMEOUT_MS);
  try{
    const r=await fetch(url,{signal:c.signal,headers:{accept:"application/json"}});
    const len=Number(r.headers.get("content-length")||0);if(Number.isFinite(len)&&len>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status}});return body;
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}
}
export const OPERATIONS={finna:["search"],cleveland_museum:["search"]};
export async function runAdapter(provider,operation,args){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  const q=required(args?.query,"query"),limit=clamp(args?.limit,1,25,10);
  if(provider==="finna"){
    const u=new URL("https://api.finna.fi/v1/search");u.searchParams.set("lookfor",q);u.searchParams.set("limit",String(limit));u.searchParams.set("page","1");
    const body=await fetchJson(u);return {provider,operation,total:body?.resultCount??null,items:Array.isArray(body?.records)?body.records.slice(0,limit):[],status:body?.status??null};
  }
  if(provider==="cleveland_museum"){
    const u=new URL("https://openaccess-api.clevelandart.org/api/artworks/");u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));u.searchParams.set("skip","0");
    const body=await fetchJson(u);return {provider,operation,total:body?.info?.total??null,items:Array.isArray(body?.data)?body.data.slice(0,limit):[]};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
