const MAX_BYTES=1500000,TIMEOUT_MS=12000;
const text=(v,n=300)=>String(v??"").trim().slice(0,n);
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const required=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||String(v).trim()==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
function googleKey(env){return env.GOOGLE_API_KEY||""}
async function getJson(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{headers:{accept:"application/json"},signal:c.signal}),raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502})}if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status,error:body?.error?.message||body?.error||null}});return body}catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}}
function keyed(base,env){const key=googleKey(env);if(!key)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});const u=new URL(base);u.searchParams.set("key",key);return u}
function pageToken(v){const s=text(v,256);if(s) return s}
export const OPERATIONS={
  youtube:["search","video","channel","playlist_items"],
  google_books:["search","volume"],
  google_factcheck:["search"],
  google_civic:["elections","divisions","voter_info"]
};
export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  if(provider==="youtube"){
    if(operation==="search"){const u=keyed("https://www.googleapis.com/youtube/v3/search",env);u.searchParams.set("part","snippet");u.searchParams.set("q",text(required(args,"query"),200));u.searchParams.set("type",["video","channel","playlist"].includes(args.type)?args.type:"video");u.searchParams.set("maxResults",String(clamp(args.limit,1,50,10)));u.searchParams.set("safeSearch",["none","moderate","strict"].includes(args.safe_search)?args.safe_search:"moderate");if(args.order&&["date","rating","relevance","title","videoCount","viewCount"].includes(args.order))u.searchParams.set("order",args.order);if(args.region_code)u.searchParams.set("regionCode",text(args.region_code,2).toUpperCase());if(args.published_after)u.searchParams.set("publishedAfter",text(args.published_after,40));if(args.published_before)u.searchParams.set("publishedBefore",text(args.published_before,40));const p=pageToken(args.page_token);if(p)u.searchParams.set("pageToken",p);const body=await getJson(u);return{provider,operation,items:body?.items||[],next_page_token:body?.nextPageToken||null,total_results:body?.pageInfo?.totalResults??null}}
    if(operation==="video"){const u=keyed("https://www.googleapis.com/youtube/v3/videos",env);u.searchParams.set("part","snippet,statistics,contentDetails,status");u.searchParams.set("id",text(required(args,"id"),256));const body=await getJson(u);return{provider,operation,items:body?.items||[]}}
    if(operation==="channel"){const u=keyed("https://www.googleapis.com/youtube/v3/channels",env);u.searchParams.set("part","snippet,statistics,contentDetails,status");if(args.id)u.searchParams.set("id",text(args.id,256));else if(args.handle)u.searchParams.set("forHandle",text(args.handle,100));else throw Object.assign(new Error("ARG_REQUIRED:id_or_handle"),{status:400});const body=await getJson(u);return{provider,operation,items:body?.items||[]}}
    if(operation==="playlist_items"){const u=keyed("https://www.googleapis.com/youtube/v3/playlistItems",env);u.searchParams.set("part","snippet,contentDetails,status");u.searchParams.set("playlistId",text(required(args,"playlist_id"),256));u.searchParams.set("maxResults",String(clamp(args.limit,1,50,20)));const p=pageToken(args.page_token);if(p)u.searchParams.set("pageToken",p);const body=await getJson(u);return{provider,operation,items:body?.items||[],next_page_token:body?.nextPageToken||null}}
  }
  if(provider==="google_books"){
    if(operation==="search"){const u=keyed("https://www.googleapis.com/books/v1/volumes",env);u.searchParams.set("q",text(required(args,"query"),300));u.searchParams.set("maxResults",String(clamp(args.limit,1,40,20)));u.searchParams.set("startIndex",String(clamp(args.start,0,100000,0)));if(args.order_by&&["relevance","newest"].includes(args.order_by))u.searchParams.set("orderBy",args.order_by);if(args.print_type&&["all","books","magazines"].includes(args.print_type))u.searchParams.set("printType",args.print_type);if(args.lang_restrict)u.searchParams.set("langRestrict",text(args.lang_restrict,8));const body=await getJson(u);return{provider,operation,items:body?.items||[],total_items:body?.totalItems??0}}
    if(operation==="volume"){const id=encodeURIComponent(text(required(args,"id"),128));const u=keyed(`https://www.googleapis.com/books/v1/volumes/${id}`,env);return{provider,operation,data:await getJson(u)}}
  }
  if(provider==="google_factcheck"){
    const u=keyed("https://factchecktools.googleapis.com/v1alpha1/claims:search",env);u.searchParams.set("query",text(required(args,"query"),300));u.searchParams.set("pageSize",String(clamp(args.limit,1,100,20)));if(args.language_code)u.searchParams.set("languageCode",text(args.language_code,12));if(args.review_publisher_site_filter)u.searchParams.set("reviewPublisherSiteFilter",text(args.review_publisher_site_filter,160));if(args.max_age_days!==undefined)u.searchParams.set("maxAgeDays",String(clamp(args.max_age_days,0,3650,365)));const p=pageToken(args.page_token);if(p)u.searchParams.set("pageToken",p);const body=await getJson(u);return{provider,operation,items:body?.claims||[],next_page_token:body?.nextPageToken||null}
  }
  if(provider==="google_civic"){
    if(operation==="elections"){const u=keyed("https://www.googleapis.com/civicinfo/v2/elections",env);const body=await getJson(u);return{provider,operation,items:body?.elections||[]}}
    if(operation==="divisions"){const u=keyed("https://www.googleapis.com/civicinfo/v2/divisions",env);u.searchParams.set("query",text(required(args,"query"),200));const body=await getJson(u);return{provider,operation,items:body?.results||[]}}
    if(operation==="voter_info"){const u=keyed("https://www.googleapis.com/civicinfo/v2/voterinfo",env);u.searchParams.set("address",text(required(args,"address"),300));if(args.election_id)u.searchParams.set("electionId",text(args.election_id,40));if(args.official_only===true)u.searchParams.set("officialOnly","true");return{provider,operation,data:await getJson(u)}}
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
