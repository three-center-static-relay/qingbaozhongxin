const MAX_UPSTREAM_BYTES=2000000,DEFAULT_TIMEOUT_MS=15000;
const text=(v,n=1000)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=700){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
async function fetchBounded(url,mode="json"){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),DEFAULT_TIMEOUT_MS);
  try{
    const r=await fetch(url,{signal:c.signal,headers:{accept:mode==="json"?"application/json":"application/x-ndjson,text/plain;q=0.9,*/*;q=0.5"}}),len=Number(r.headers.get("content-length")||0);
    if(len>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:r.status});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:r.status});
    if(!r.ok)err("UPSTREAM_HTTP_ERROR",502,{http_status:r.status,body:raw.slice(0,500)});
    if(mode==="text")return raw;
    try{return raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{http_status:r.status})}
  }catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}
}
function publicHttpUrl(v){
  const raw=required(v,"url");let u;try{u=new URL(raw)}catch{err("INVALID_PUBLIC_URL")}
  if(!["http:","https:"].includes(u.protocol)||u.username||u.password)err("INVALID_PUBLIC_URL");
  const h=u.hostname.toLowerCase(),blocked=h==="localhost"||h.endsWith(".localhost")||h==="0.0.0.0"||h==="127.0.0.1"||h==="::1"||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h);
  if(blocked)err("PRIVATE_OR_LOCAL_URL_DENIED",403);
  return u.toString();
}
function collectionId(v){if(v===undefined||v===null||v==="")return"";const s=text(v,32).toUpperCase();if(!/^CC-MAIN-\d{4}-\d{2}$/.test(s))err("INVALID_COMMON_CRAWL_COLLECTION");return s}
async function collections(){const body=await fetchBounded("https://index.commoncrawl.org/collinfo.json"),items=Array.isArray(body)?body.filter(x=>x&&typeof x==="object").slice(0,30):[];if(!items.length)err("UPSTREAM_BAD_RESPONSE",502,{provider:"common_crawl"});return items}
async function latestIndex(){const items=await collections(),x=items[0];return{provider:"common_crawl",operation:"latest_index",public_archive:true,latest:{id:x.id,name:x.name||null,timegate:x.timegate||null,"cdx-api":x["cdx-api"]||null},items:items.map(y=>({id:y.id,name:y.name||null,timegate:y.timegate||null,"cdx-api":y["cdx-api"]||null}))}}
async function indexLookup(args={}){
  const target=publicHttpUrl(args.url),limit=clamp(args.limit,1,50,20);let collection=collectionId(args.collection);
  if(!collection){const items=await collections();collection=String(items[0].id||"");if(!/^CC-MAIN-\d{4}-\d{2}$/.test(collection))err("UPSTREAM_BAD_RESPONSE",502,{provider:"common_crawl"})}
  const u=new URL(`https://index.commoncrawl.org/${collection}-index`);u.searchParams.set("url",target);u.searchParams.set("output","json");u.searchParams.append("filter","status:200");u.searchParams.set("collapse","digest");
  const raw=await fetchBounded(u,"text"),items=[];
  for(const line of raw.split(/\r?\n/)){if(items.length>=limit)break;const s=line.trim();if(!s)continue;let x;try{x=JSON.parse(s)}catch{continue}if(x&&typeof x==="object")items.push({url:x.url||null,timestamp:x.timestamp||null,status:x.status||null,mime:x.mime||null,digest:x.digest||null,filename:x.filename||null,offset:x.offset||null,length:x.length||null,languages:x.languages||null})}
  return{provider:"common_crawl",operation:"index_lookup",collection,target_url:target,public_archive:true,raw_warc_fetched:false,arbitrary_live_target_fetch:false,items,limit};
}

export const OPERATIONS={common_crawl:["latest_index","index_lookup"]};
export async function runAdapter(provider,operation,args={}){
  if(provider!=="common_crawl"||!OPERATIONS.common_crawl.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
  if(operation==="latest_index")return latestIndex();
  return indexLookup(args);
}
