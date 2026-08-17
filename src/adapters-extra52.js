const ENDPOINT="https://www.scidb.cn/oai";
const MAX_UPSTREAM_BYTES=1800000;
const DEFAULT_TIMEOUT_MS=18000;
const text=(v,n=1200)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=1200){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function safeDate(v,name){const s=required(v,name,32);if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(s))err(`INVALID_${name.toUpperCase()}`);return s}
function decodeXml(s){return String(s??"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}
function stripTags(s){return decodeXml(String(s??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())}
function firstTag(xml,tag){const m=String(xml).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));return m?stripTags(m[1]):null}
function allTags(xml,tag,limit=20){const out=[],re=new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"gi");let m;while((m=re.exec(String(xml)))&&out.length<limit){const v=stripTags(m[1]);if(v)out.push(v)}return out}
async function requestXml(url){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{accept:"application/xml,text/xml;q=0.9,*/*;q=0.2","user-agent":"three-center-intelligence/2026-08"}});
    const len=Number(response.headers.get("content-length")||0);if(len>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:response.status});
    const raw=await response.text();if(new TextEncoder().encode(raw).length>MAX_UPSTREAM_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{http_status:response.status});
    if(!response.ok)err("UPSTREAM_HTTP_ERROR",502,{http_status:response.status,body:raw.slice(0,800)});
    const oaiError=raw.match(/<error\s+code=["']([^"']+)["'][^>]*>([\s\S]*?)<\/error>/i);if(oaiError)err("UPSTREAM_OAI_ERROR",502,{code:oaiError[1],message:stripTags(oaiError[2]).slice(0,400)});
    return raw;
  }catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}
}
function recordFromBlock(block){
  const header=(block.match(/<header(?:\s[^>]*)?>([\s\S]*?)<\/header>/i)||[])[1]||"";
  return{identifier:firstTag(header,"identifier"),datestamp:firstTag(header,"datestamp"),sets:allTags(header,"setSpec",12),deleted:/<header(?:\s[^>]*)?\sstatus=["']deleted["']/i.test(block),title:firstTag(block,"dc:title"),creators:allTags(block,"dc:creator",20),subjects:allTags(block,"dc:subject",20),description:firstTag(block,"dc:description"),publisher:firstTag(block,"dc:publisher"),dates:allTags(block,"dc:date",8),types:allTags(block,"dc:type",8),formats:allTags(block,"dc:format",8),identifiers:allTags(block,"dc:identifier",12),language:firstTag(block,"dc:language"),rights:allTags(block,"dc:rights",8)};
}
function parseRecords(xml,limit){const items=[],re=/<record(?:\s[^>]*)?>([\s\S]*?)<\/record>/gi;let m;while((m=re.exec(xml))&&items.length<limit)items.push(recordFromBlock(m[1]));const token=firstTag(xml,"resumptionToken");const tag=xml.match(/<resumptionToken([^>]*)>/i),attrs=tag?.[1]||"",size=attrs.match(/completeListSize=["'](\d+)["']/i),cursor=attrs.match(/cursor=["'](\d+)["']/i);return{items,resumption_token:token||null,complete_list_size:size?Number(size[1]):null,cursor:cursor?Number(cursor[1]):null}}
function parseSets(xml,limit){const items=[],re=/<set>([\s\S]*?)<\/set>/gi;let m;while((m=re.exec(xml))&&items.length<limit)items.push({set_spec:firstTag(m[1],"setSpec"),set_name:firstTag(m[1],"setName")});return{items,resumption_token:firstTag(xml,"resumptionToken")||null}}

export const OPERATIONS={sciencedb:["identify","list_records","get_record","list_sets"]};

export async function runAdapter(provider,operation,args={}){
  if(provider!=="sciencedb"||!OPERATIONS.sciencedb.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
  const u=new URL(ENDPOINT);
  if(operation==="identify"){
    u.searchParams.set("verb","Identify");const xml=await requestXml(u);return{provider,operation,repository_name:firstTag(xml,"repositoryName"),base_url:firstTag(xml,"baseURL"),protocol_version:firstTag(xml,"protocolVersion"),earliest_datestamp:firstTag(xml,"earliestDatestamp"),deleted_record:firstTag(xml,"deletedRecord"),granularity:firstTag(xml,"granularity"),admin_emails:allTags(xml,"adminEmail",8)};
  }
  if(operation==="list_records"){
    const limit=clamp(args.limit,1,50,20);u.searchParams.set("verb","ListRecords");
    if(args.resumption_token)u.searchParams.set("resumptionToken",required(args.resumption_token,"resumption_token",1600));
    else{u.searchParams.set("metadataPrefix","oai_dc");if(args.from)u.searchParams.set("from",safeDate(args.from,"from"));if(args.until)u.searchParams.set("until",safeDate(args.until,"until"));if(args.set)u.searchParams.set("set",required(args.set,"set",300))}
    const xml=await requestXml(u);return{provider,operation,metadata_prefix:"oai_dc",...parseRecords(xml,limit)};
  }
  if(operation==="get_record"){
    u.searchParams.set("verb","GetRecord");u.searchParams.set("metadataPrefix","oai_dc");u.searchParams.set("identifier",required(args.identifier,"identifier",1000));const xml=await requestXml(u),parsed=parseRecords(xml,1);return{provider,operation,item:parsed.items[0]||null};
  }
  const limit=clamp(args.limit,1,100,50);u.searchParams.set("verb","ListSets");if(args.resumption_token)u.searchParams.set("resumptionToken",required(args.resumption_token,"resumption_token",1600));const xml=await requestXml(u);return{provider,operation,...parseSets(xml,limit)};
}
