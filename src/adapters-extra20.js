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
function safeToken(v,name,n=120){const s=required(v,name).slice(0,n);if(!/^[A-Za-z0-9_.:-]+$/.test(s))throw Object.assign(new Error(`INVALID_${name.toUpperCase()}`),{status:400});return s}
export const OPERATIONS={osf:["search_public"],ensembl:["lookup_symbol"],reactome:["query_id"]};
export async function runAdapter(provider,operation,args){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  if(provider==="osf"){
    const q=required(args?.query,"query"),limit=clamp(args?.limit,1,25,10),u=new URL("https://api.osf.io/v2/nodes/");
    u.searchParams.set("filter[title]",q);u.searchParams.set("page[size]",String(limit));
    const body=await fetchJson(u);return {provider,operation,items:body?.data||[],links:body?.links||null,meta:body?.meta||null};
  }
  if(provider==="ensembl"){
    const species=safeToken(args?.species||"homo_sapiens","species",80),symbol=safeToken(args?.symbol||args?.query,"symbol",120),u=new URL(`https://rest.ensembl.org/lookup/symbol/${encodeURIComponent(species)}/${encodeURIComponent(symbol)}`);
    if(args?.expand===true)u.searchParams.set("expand","1");u.searchParams.set("content-type","application/json");
    return {provider,operation,species,symbol,data:await fetchJson(u,{headers:{"content-type":"application/json"}})};
  }
  if(provider==="reactome"){
    const id=safeToken(args?.id||args?.query,"id",120),u=`https://reactome.org/ContentService/data/query/${encodeURIComponent(id)}`;
    return {provider,operation,id,data:await fetchJson(u)};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
