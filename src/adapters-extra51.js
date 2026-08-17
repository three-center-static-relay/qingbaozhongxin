const MAX_UPSTREAM_BYTES=1500000;
const DEFAULT_TIMEOUT_MS=15000;
const text=(v,n=1000)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=500){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
async function requestJson(url,init={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS);
  try{
    const response=await fetch(url,{...init,signal:controller.signal,headers:{accept:"application/json","user-agent":"three-center-intelligence/2026-08",...(init.headers||{})}});
    const len=Number(response.headers.get("content-length")||0);if(len>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:response.status});
    const raw=await response.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:response.status});
    let body;try{body=raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{http_status:response.status})}
    if(!response.ok)err("UPSTREAM_HTTP_ERROR",502,{http_status:response.status,body});
    return body;
  }catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}
}
function safeDoi(v){const s=required(v,"doi",300);if(!/^10\.\d{4,9}\/.+/.test(s))err("INVALID_DOI");return s}

export const OPERATIONS={
  datacite:["search","doi_get"],
  dryad:["search"],
  hdx:["search"],
  openml:["datasets_search"]
};

async function dataciteSearch(args){
  const q=required(args.query,"query",500),limit=clamp(args.limit,1,50,10),page=clamp(args.page,1,1000,1),u=new URL("https://api.datacite.org/dois");
  u.searchParams.set("query",q);u.searchParams.set("page[size]",String(limit));u.searchParams.set("page[number]",String(page));u.searchParams.set("sort","-updated");u.searchParams.set("disable-facets","true");
  const body=await requestJson(u);return{provider:"datacite",operation:"search",meta:body?.meta||null,links:body?.links||null,items:Array.isArray(body?.data)?body.data:[]};
}
async function dataciteGet(args){
  const doi=safeDoi(args.doi),u=`https://api.datacite.org/dois/${doi.split("/").map(encodeURIComponent).join("/")}`,body=await requestJson(u);
  return{provider:"datacite",operation:"doi_get",item:body?.data||null};
}
async function dryadSearch(args){
  const q=required(args.query,"query",500),limit=clamp(args.limit,1,50,10),page=clamp(args.page,1,1000,1),u=new URL("https://datadryad.org/api/v2/search");
  u.searchParams.set("q",q);u.searchParams.set("page",String(page));u.searchParams.set("per_page",String(limit));
  const body=await requestJson(u),items=body?._embedded?.stash_datasets||body?.items||[];
  return{provider:"dryad",operation:"search",count:Number(body?.count)||null,total:Number(body?.total)||null,items:Array.isArray(items)?items:[]};
}
async function hdxSearch(args){
  const q=required(args.query,"query",500),limit=clamp(args.limit,1,50,10),start=clamp(args.start,0,1000000,0),u=new URL("https://data.humdata.org/api/3/action/package_search");
  u.searchParams.set("q",q);u.searchParams.set("rows",String(limit));u.searchParams.set("start",String(start));u.searchParams.set("sort","metadata_modified desc");
  const body=await requestJson(u);if(body?.success===false)err("UPSTREAM_BUSINESS_ERROR",502,{provider:"hdx"});
  return{provider:"hdx",operation:"search",total:body?.result?.count??null,start,items:body?.result?.results||[]};
}
async function openmlSearch(args){
  const q=required(args.query,"query",300),limit=clamp(args.limit,1,50,10),fetchLimit=clamp(args.scan_limit,50,500,100),u=`https://www.openml.org/api/v1/json/data/list/limit/${fetchLimit}/status/active`,body=await requestJson(u),all=body?.data?.dataset||[],terms=q.toLowerCase().split(/\s+/).filter(Boolean);
  const items=(Array.isArray(all)?all:[]).filter(x=>{const hay=JSON.stringify([x?.name,x?.description,x?.tag]).toLowerCase();return terms.every(t=>hay.includes(t))}).slice(0,limit);
  return{provider:"openml",operation:"datasets_search",query:q,scanned:Array.isArray(all)?all.length:0,items};
}

export async function runAdapter(provider,operation,args={}){
  if(provider==="datacite"&&operation==="search")return dataciteSearch(args);
  if(provider==="datacite"&&operation==="doi_get")return dataciteGet(args);
  if(provider==="dryad"&&operation==="search")return dryadSearch(args);
  if(provider==="hdx"&&operation==="search")return hdxSearch(args);
  if(provider==="openml"&&operation==="datasets_search")return openmlSearch(args);
  err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
}
