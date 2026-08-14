const MAX_BYTES=1500000, TIMEOUT_MS=12000;
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const required=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||String(v).trim()==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
const text=(v,n=300)=>String(v??"").trim().slice(0,n);
async function getJson(url,headers={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{headers:{accept:"application/json",...headers},signal:c.signal});const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502})}if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status,body}});return body}catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}}
const code=(v,re,name)=>{const s=text(v,120);if(!re.test(s))throw Object.assign(new Error(`INVALID_${name}`),{status:400});return s};
export const OPERATIONS={who_gho:["indicator"],wikipedia:["search"],wikidata:["search_items"],oecd:["sdmx_data"]};
export async function runAdapter(provider,operation,args){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  if(provider==="who_gho"){
    const indicator=code(required(args,"indicator"),/^[A-Z0-9_]+$/,"INDICATOR"),limit=clamp(args.limit,1,100,30),u=new URL(`https://ghoapi.azureedge.net/api/${indicator}`);u.searchParams.set("$top",String(limit));
    const f=[];if(args.country)f.push(`SpatialDim eq '${code(args.country,/^[A-Z]{3}$/,"COUNTRY")}'`);if(args.year!==undefined){const y=Number(args.year);if(!Number.isInteger(y)||y<1900||y>2100)throw Object.assign(new Error("INVALID_YEAR"),{status:400});f.push(`TimeDim eq ${y}`)}if(f.length)u.searchParams.set("$filter",f.join(" and "));const body=await getJson(u);return{provider,operation,items:body?.value||[],count:body?.value?.length||0};
  }
  if(provider==="wikipedia"){
    const q=text(required(args,"query"),300),lang=code(args.language||"en",/^[a-z]{2,3}(?:-[a-z0-9]+)?$/i,"LANGUAGE").toLowerCase(),limit=clamp(args.limit,1,20,10),u=new URL(`https://${lang}.wikipedia.org/w/rest.php/v1/search/page`);u.searchParams.set("q",q);u.searchParams.set("limit",String(limit));const body=await getJson(u,{"user-agent":"ThreeCenterIntelligence/2026-08"});return{provider,operation,items:body?.pages||[]};
  }
  if(provider==="wikidata"){
    const q=text(required(args,"query"),300),lang=code(args.language||"en",/^[a-z]{2,3}(?:-[a-z0-9]+)?$/i,"LANGUAGE").toLowerCase(),limit=clamp(args.limit,1,20,10),u=new URL("https://www.wikidata.org/w/rest.php/wikibase/v1/search/items");u.searchParams.set("search",q);u.searchParams.set("language",lang);u.searchParams.set("limit",String(limit));const body=await getJson(u,{"user-agent":"ThreeCenterIntelligence/2026-08"});return{provider,operation,items:body||[]};
  }
  if(provider==="oecd"){
    const agency=code(required(args,"agency"),/^[A-Za-z0-9._-]+$/,"AGENCY"),flow=code(required(args,"flow"),/^[A-Za-z0-9._@-]+$/,"FLOW"),version=code(args.version||"latest",/^(?:latest|[0-9]+(?:\.[0-9]+)*)$/,"VERSION"),key=code(args.key||"all",/^[A-Za-z0-9._+~-]+$/,"KEY"),u=new URL(`https://sdmx.oecd.org/public/rest/data/${agency},${flow},${version}/${key}`);u.searchParams.set("dimensionAtObservation","AllDimensions");if(args.start_period)u.searchParams.set("startPeriod",code(args.start_period,/^[0-9]{4}(?:-[A-Za-z0-9]+)?$/,"START_PERIOD"));if(args.end_period)u.searchParams.set("endPeriod",code(args.end_period,/^[0-9]{4}(?:-[A-Za-z0-9]+)?$/,"END_PERIOD"));const body=await getJson(u,{accept:"application/vnd.sdmx.data+json;version=2.0"});return{provider,operation,data:body};
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
