const MAX_UPSTREAM_BYTES=2000000,MAX_BROWSER_BYTES=1800000,DEFAULT_TIMEOUT_MS=15000;
const text=(v,n=1000)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=700){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
async function sha256(value){const raw=typeof value==="string"?value:JSON.stringify(value),h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
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
function privateOrLocalHost(h){h=String(h||"").toLowerCase().replace(/^\[|\]$/g,"");if(!h||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h==="0.0.0.0"||h==="127.0.0.1"||h==="::1"||h==="::")return true;if(/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return true;if(h.includes(":")){const x=h.replace(/:/g,"");if(h.startsWith("fc")||h.startsWith("fd")||h.startsWith("fe8")||h.startsWith("fe9")||h.startsWith("fea")||h.startsWith("feb")||/^0+$/.test(x))return true}return false}
function publicHttpUrl(v){
  const raw=required(v,"url",2048);let u;try{u=new URL(raw)}catch{err("INVALID_PUBLIC_URL")}
  if(!["http:","https:"].includes(u.protocol)||u.username||u.password)err("INVALID_PUBLIC_URL");
  if(privateOrLocalHost(u.hostname))err("PRIVATE_OR_LOCAL_URL_DENIED",403);
  return u.toString();
}
function browserAllowlist(env={}){const raw=String(env.NETWORK_INTELLIGENCE_BROWSER_ALLOWLIST||"");return raw.split(",").map(x=>x.trim().toLowerCase().replace(/^\./,"")).filter(Boolean).slice(0,200)}
function browserUrl(v,env){const raw=required(v,"url",2048);let u;try{u=new URL(raw)}catch{err("INVALID_PUBLIC_URL")};if(u.protocol!=="https:"||u.username||u.password)err("BROWSER_HTTPS_REQUIRED",403);const h=u.hostname.toLowerCase();if(privateOrLocalHost(h))err("PRIVATE_OR_LOCAL_URL_DENIED",403);const allow=browserAllowlist(env);if(!allow.length)err("BROWSER_ALLOWLIST_NOT_CONFIGURED",503);if(!allow.some(s=>h===s||h.endsWith(`.${s}`)))err("BROWSER_HOST_NOT_ALLOWLISTED",403,{host:h});u.hash="";return u.toString()}
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
function selectors(args={}){const raw=Array.isArray(args.elements)?args.elements:Array.isArray(args.selectors)?args.selectors.map(selector=>({selector})):[];if(!raw.length)err("ARG_REQUIRED:elements");return raw.slice(0,12).map(x=>{const selector=text(typeof x==="string"?x:x?.selector,200);if(!selector||/[{};]/.test(selector))err("INVALID_SELECTOR");return{selector}})}
function trimBrowserResult(action,result){if(action==="content"||action==="markdown")return text(result,240000);if(action==="links")return(Array.isArray(result)?result:[]).map(x=>text(x,2048)).filter(x=>/^https?:\/\//i.test(x)).slice(0,500);if(action==="scrape")return(Array.isArray(result)?result:[]).slice(0,12).map(group=>({selector:text(group?.selector,200),results:(Array.isArray(group?.results)?group.results:[]).slice(0,250).map(x=>({text:text(x?.text,4000),html:text(x?.html,8000),attributes:(Array.isArray(x?.attributes)?x.attributes:[]).slice(0,40).map(a=>({name:text(a?.name,120),value:text(a?.value,2000)})),height:Number.isFinite(Number(x?.height))?Number(x.height):null,width:Number.isFinite(Number(x?.width))?Number(x.width):null,top:Number.isFinite(Number(x?.top))?Number(x.top):null,left:Number.isFinite(Number(x?.left))?Number(x.left):null}))}));if(action==="snapshot"){const o=result&&typeof result==="object"?result:{};return{content:typeof o.content==="string"?text(o.content,160000):null,markdown:typeof o.markdown==="string"?text(o.markdown,160000):null,accessibilityTree:o.accessibilityTree??null}}return result}
async function browserQuickAction(action,args={},env={}){
  if(!env?.BROWSER||typeof env.BROWSER.quickAction!=="function")err("CLOUDFLARE_BROWSER_BINDING_NOT_CONFIGURED",503);
  const url=browserUrl(args.url,env),timeout=clamp(args.timeout_ms,3000,12000,9000),payload={url,gotoOptions:{waitUntil:"networkidle2",timeout}};
  if(action==="links")payload.visibleLinksOnly=args.visible_only!==false;
  if(action==="scrape")payload.elements=selectors(args);
  if(action==="snapshot"){const requested=Array.isArray(args.formats)?args.formats: ["content","markdown"],allowed=[...new Set(requested.map(x=>text(x,40)).filter(x=>["content","markdown","accessibilityTree"].includes(x)))];payload.formats=allowed.length>=2?allowed:["content","markdown"]}
  let r;try{r=await env.BROWSER.quickAction(action,payload)}catch(e){err("CLOUDFLARE_BROWSER_RUN_ERROR",502,{action,message:text(e?.message||e,300)})}
  const raw=await r.text(),bytes=new TextEncoder().encode(raw).length,browserMsUsed=Number(r?.headers?.get?.("x-browser-ms-used")||0)||null;if(bytes>MAX_BROWSER_BYTES)err("CLOUDFLARE_BROWSER_RESPONSE_TOO_LARGE",502,{action,bytes,max_bytes:MAX_BROWSER_BYTES,browser_ms_used:browserMsUsed});if(!r.ok)err("CLOUDFLARE_BROWSER_HTTP_ERROR",502,{action,http_status:r.status,body:raw.slice(0,500),browser_ms_used:browserMsUsed});let data;try{data=raw?JSON.parse(raw):null}catch{err("CLOUDFLARE_BROWSER_BAD_JSON",502,{action,browser_ms_used:browserMsUsed})}if(data?.success!==true)err("CLOUDFLARE_BROWSER_UNSUCCESSFUL_RESPONSE",502,{action,browser_ms_used:browserMsUsed});const result=trimBrowserResult(action,data.result),digest=await sha256(result);return{provider:"cloudflare_browser_run",operation:action,source_url:url,retrieved_via:`cloudflare-browser-run-quick-action-${action}`,evidence_kind:"observed",fetched_at:new Date().toISOString(),content_hash:digest,browser_ms_used:browserMsUsed,result,source_receipt:{source:"cloudflare_browser_run",digest_sha256:digest},policy:{deployment_allowlist:true,https_only:true,ephemeral:true,cookies_persisted:false,login_or_cookie_injection:false,http_auth_injection:false,captcha_bypass:false,anti_bot_evasion:false,automatic_browser_fallback:false,screenshot_binary_disabled:action==="snapshot"}}}
function browserSourceInfo(env={}){return{provider:"cloudflare_browser_run",binding:"BROWSER",operations:["content","markdown","links","scrape","snapshot"],allowlisted_host_suffixes:browserAllowlist(env),worker_binding_no_api_token:true,static_fetch_first:true,automatic_browser_fallback:false,snapshot_formats_allowed:["content","markdown","accessibilityTree"],screenshot_binary_disabled:true}}

export const OPERATIONS={common_crawl:["latest_index","index_lookup"],cloudflare_browser_run:["source_info","content","markdown","links","scrape","snapshot"]};
export async function runAdapter(provider,operation,args={},env={}){
  if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
  if(provider==="common_crawl")return operation==="latest_index"?latestIndex():indexLookup(args);
  if(operation==="source_info")return browserSourceInfo(env);
  return browserQuickAction(operation,args,env);
}
