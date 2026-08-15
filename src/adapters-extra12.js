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
export const OPERATIONS={courtlistener:["search"]};
export async function runAdapter(provider,operation,args,env){
  if(provider!=="courtlistener"||operation!=="search")throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  if(!env.COURTLISTENER_API_TOKEN)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});
  const q=text(req(args,"query"),300),limit=clamp(args?.limit,1,20,10),type=String(args?.type||"o");
  if(!["o","r","rd","d","p","oa"].includes(type))throw Object.assign(new Error("INVALID_COURTLISTENER_TYPE"),{status:400});
  const u=new URL("https://www.courtlistener.com/api/rest/v4/search/");u.searchParams.set("q",q);u.searchParams.set("type",type);
  const r=await fetchJson(u,{headers:{authorization:`Token ${String(env.COURTLISTENER_API_TOKEN)}`}},15000);
  return {provider,operation,type,total:r.body?.count??null,next:r.body?.next||null,items:(r.body?.results||[]).slice(0,limit)};
}
