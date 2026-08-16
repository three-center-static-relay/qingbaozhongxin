const MAX_UPSTREAM_BYTES=2000000;
const DEFAULT_TIMEOUT_MS=15000;
const text=(v,n=1000)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=500){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function safeSlug(v,name){const s=required(v,name,120);if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s))err(`INVALID_${name.toUpperCase()}`);return s}
async function fetchBounded(url,init={},mode="json",timeoutMs=DEFAULT_TIMEOUT_MS){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{...init,signal:c.signal,headers:{accept:mode==="json"?"application/json":"application/xml,text/xml;q=0.9,*/*;q=0.5",...(init.headers||{})}});
    const len=Number(r.headers.get("content-length")||0);if(len>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:r.status});
    const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:r.status});
    if(!r.ok)err("UPSTREAM_HTTP_ERROR",502,{http_status:r.status,body:raw.slice(0,1000)});
    if(mode==="text")return{http_status:r.status,body:raw};
    try{return{http_status:r.status,body:raw?JSON.parse(raw):null}}catch{err("UPSTREAM_BAD_JSON",502,{http_status:r.status})}
  }catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}
}
function decodeXml(s){return String(s??"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}
function firstTag(xml,tag){const m=xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));return m?decodeXml(m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()):null}
function allTags(xml,tag,limit=12){const out=[],re=new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"gi");let m;while((m=re.exec(xml))&&out.length<limit)out.push(decodeXml(m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()));return out.filter(Boolean)}
function parsePangaea(xml,limit){const records=[],re=/<record(?:\s[^>]*)?>([\s\S]*?)<\/record>/gi;let m;while((m=re.exec(xml))&&records.length<limit){const block=m[1],identifier=firstTag(block,"identifier"),title=firstTag(block,"dc:title"),descriptions=allTags(block,"dc:description",3),creators=allTags(block,"dc:creator",12),subjects=allTags(block,"dc:subject",12),dates=allTags(block,"dc:date",4);records.push({identifier,title,creators,subjects,dates,description:descriptions[0]||null})}const token=firstTag(xml,"resumptionToken");return{items:records,resumption_token:token||null}}
function kaggleHeaders(env){
  if(env.KAGGLE_API_TOKEN)return{authorization:`Bearer ${String(env.KAGGLE_API_TOKEN)}`};
  if(env.KAGGLE_USERNAME&&env.KAGGLE_KEY)return{authorization:`Basic ${btoa(`${String(env.KAGGLE_USERNAME)}:${String(env.KAGGLE_KEY)}`)}`};
  err("UPSTREAM_AUTH_FAILED",503,{provider:"kaggle",required_secret_groups:[["KAGGLE_API_TOKEN"],["KAGGLE_USERNAME","KAGGLE_KEY"]]});
}

export const OPERATIONS={
  zenodo:["search","search_public"],
  huggingface:["datasets_search"],
  kaggle:["datasets_search","dataset_files"],
  harvard_dataverse:["search"],
  pangaea:["oai_list_records"],
  figshare:["search"]
};

async function zenodoSearch(args,env,useToken=true){const q=required(args.query,"query",500),limit=clamp(args.limit,1,25,10),page=clamp(args.page,1,100,1),sort=["bestmatch","mostrecent"].includes(args.sort)?args.sort:"bestmatch",u=new URL("https://zenodo.org/api/records");u.searchParams.set("q",q);u.searchParams.set("size",String(limit));u.searchParams.set("page",String(page));u.searchParams.set("sort",sort);const headers={};if(useToken&&env.ZENODO_TOKEN)headers.authorization=`Bearer ${env.ZENODO_TOKEN}`;const r=await fetchBounded(u,{headers});return{provider:"zenodo",operation:useToken?"search":"search_public",total:r.body?.hits?.total??null,items:r.body?.hits?.hits||[],page,limit}}
async function huggingfaceDatasets(args,env){const q=required(args.query,"query",300),limit=clamp(args.limit,1,30,10),sort=["downloads","likes","lastModified","createdAt","trendingScore"].includes(args.sort)?args.sort:"downloads",u=new URL("https://huggingface.co/api/datasets");u.searchParams.set("search",q);u.searchParams.set("limit",String(limit));u.searchParams.set("sort",sort);u.searchParams.set("direction","-1");const headers={};if(env.HUGGINGFACE_TOKEN)headers.authorization=`Bearer ${env.HUGGINGFACE_TOKEN}`;const r=await fetchBounded(u,{headers});return{provider:"huggingface",operation:"datasets_search",items:Array.isArray(r.body)?r.body:[]}}
async function kaggleDatasets(args,env){const q=required(args.query,"query",300),page=clamp(args.page,1,100,1),sort=["hottest","votes","updated","active"].includes(args.sort)?args.sort:"hottest",filetype=["all","csv","sqlite","json","bigQuery"].includes(args.file_type)?args.file_type:"all",license=["all","cc","gpl","odb","other"].includes(args.license)?args.license:"all",u=new URL("https://www.kaggle.com/api/v1/datasets/list");u.searchParams.set("group","public");u.searchParams.set("sortBy",sort);u.searchParams.set("filetype",filetype);u.searchParams.set("license",license);u.searchParams.set("search",q);u.searchParams.set("page",String(page));if(args.max_size)u.searchParams.set("maxSize",String(clamp(args.max_size,1,1000000000000,1000000000)));if(args.min_size)u.searchParams.set("minSize",String(clamp(args.min_size,0,1000000000000,0)));const r=await fetchBounded(u,{headers:kaggleHeaders(env)});return{provider:"kaggle",operation:"datasets_search",page,items:Array.isArray(r.body)?r.body:(r.body?.datasets||[])}}
async function kaggleFiles(args,env){const owner=safeSlug(args.owner,"owner"),dataset=safeSlug(args.dataset,"dataset"),u=`https://www.kaggle.com/api/v1/datasets/list/${encodeURIComponent(owner)}/${encodeURIComponent(dataset)}`,r=await fetchBounded(u,{headers:kaggleHeaders(env)});return{provider:"kaggle",operation:"dataset_files",owner,dataset,items:Array.isArray(r.body)?r.body:(r.body?.datasetFiles||r.body?.files||[])}}
async function dataverseSearch(args,env){const q=required(args.query,"query",500),limit=clamp(args.limit,1,50,10),start=clamp(args.start,0,1000000,0),type=["dataset","file","dataverse"].includes(args.type)?args.type:"dataset",u=new URL("https://dataverse.harvard.edu/api/search");u.searchParams.set("q",q);u.searchParams.set("type",type);u.searchParams.set("per_page",String(limit));u.searchParams.set("start",String(start));u.searchParams.set("sort",args.sort==="name"?"name":args.sort==="score"?"score":"date");u.searchParams.set("order",args.order==="asc"?"asc":"desc");const headers={};const token=env.HARVARD_DATAVERSE_API_TOKEN||env.DATAVERSE_API_TOKEN;if(token)headers["X-Dataverse-key"]=String(token);const r=await fetchBounded(u,{headers});return{provider:"harvard_dataverse",operation:"search",total:r.body?.data?.total_count??null,start:r.body?.data?.start??start,items:r.body?.data?.items||[]}}
async function pangaeaList(args){const limit=clamp(args.limit,1,50,20),u=new URL("https://ws.pangaea.de/oai/provider");u.searchParams.set("verb","ListRecords");if(args.resumption_token){u.searchParams.set("resumptionToken",required(args.resumption_token,"resumption_token",1000))}else{u.searchParams.set("metadataPrefix","oai_dc");u.searchParams.set("set",text(args.set,100)||"citable");if(args.from)u.searchParams.set("from",required(args.from,"from",32));if(args.until)u.searchParams.set("until",required(args.until,"until",32))}const r=await fetchBounded(u,{},"text");const parsed=parsePangaea(r.body,limit);return{provider:"pangaea",operation:"oai_list_records",set:args.set||"citable",...parsed}}
async function figshareSearch(args,env){const q=required(args.query,"query",500),limit=clamp(args.limit,1,50,10),page=clamp(args.page,1,100,1),headers={"content-type":"application/json"};if(env.FIGSHARE_TOKEN)headers.authorization=`token ${env.FIGSHARE_TOKEN}`;const r=await fetchBounded("https://api.figshare.com/v2/articles/search",{method:"POST",headers,body:JSON.stringify({search_for:q,page,page_size:limit,order:"published_date",order_direction:"desc"})});return{provider:"figshare",operation:"search",page,items:Array.isArray(r.body)?r.body:[]}}

export async function runAdapter(provider,operation,args={},env={}){
  if(provider==="zenodo"&&operation==="search")return zenodoSearch(args,env,true);
  if(provider==="zenodo"&&operation==="search_public")return zenodoSearch(args,env,false);
  if(provider==="huggingface"&&operation==="datasets_search")return huggingfaceDatasets(args,env);
  if(provider==="kaggle"&&operation==="datasets_search")return kaggleDatasets(args,env);
  if(provider==="kaggle"&&operation==="dataset_files")return kaggleFiles(args,env);
  if(provider==="harvard_dataverse"&&operation==="search")return dataverseSearch(args,env);
  if(provider==="pangaea"&&operation==="oai_list_records")return pangaeaList(args);
  if(provider==="figshare"&&operation==="search")return figshareSearch(args,env);
  err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
}
