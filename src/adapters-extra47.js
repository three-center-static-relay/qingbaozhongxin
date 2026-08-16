const TIMEOUT_MS=18000,MAX_BYTES=1600000;
const text=(v,n=1800)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=800){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function optionalSecret(env,name){return text(env?.[name],1000)||null}
function cleanRxcui(v){const s=required(v,"rxcui",20);if(!/^\d{1,12}$/.test(s))err("INVALID_RXCUI");return s}
function cleanSetId(v){const s=required(v,"setid",80).toLowerCase();if(!/^[0-9a-f-]{16,64}$/.test(s))err("INVALID_SETID");return s}
async function boundedText(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES});const reader=r.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES})}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function requestJson(url,init={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,headers:{accept:"application/json","user-agent":"three-center-intelligence-medical/1.0",...(init.headers||{})},signal:c.signal}),raw=await boundedText(r);if(!r.ok){const auth=r.status===401||r.status===403;err(auth?"UPSTREAM_AUTH_FAILED":r.status===429?"UPSTREAM_RATE_LIMITED":"UPSTREAM_HTTP_ERROR",auth?503:r.status===429?429:502,{http_status:r.status,preview:text(raw,500)})}try{return raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{preview:text(raw,400)})}}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}
function ncbiParams(u,env){u.searchParams.set("tool","three_center_intelligence");const key=optionalSecret(env,"NCBI_API_KEY");if(key)u.searchParams.set("api_key",key);return u}

function flattenDrugGroups(out,limit){const groups=Array.isArray(out?.drugGroup?.conceptGroup)?out.drugGroup.conceptGroup:[],items=[];for(const g of groups){for(const x of Array.isArray(g?.conceptProperties)?g.conceptProperties:[]){items.push({rxcui:x?.rxcui??null,name:x?.name??null,synonym:x?.synonym??null,tty:x?.tty??g?.tty??null,language:x?.language??null,suppress:x?.suppress??null,psn:x?.psn??null});if(items.length>=limit)return items}}return items}
async function rxnorm(operation,args){
  if(operation==="drugs_by_name"){
    const name=required(args?.name,"name",240),limit=clamp(args?.limit,1,50,20),u=new URL("https://rxnav.nlm.nih.gov/REST/drugs.json");u.searchParams.set("name",name);if(args?.prescribable_name===true)u.searchParams.set("expand","psn");const out=await requestJson(u);return{provider:"rxnorm",operation,name,items:flattenDrugGroups(out,limit),source_mode:"NLM RxNorm getDrugs official API; current active RxNorm concepts; bounded read-only"};
  }
  if(operation==="properties"){
    const rxcui=cleanRxcui(args?.rxcui),u=new URL(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`),out=await requestJson(u);return{provider:"rxnorm",operation,rxcui,properties:out?.properties??null,source_mode:"NLM RxNorm getRxConceptProperties official API; active concept metadata; read-only"};
  }
  if(operation==="version"){
    const out=await requestJson("https://rxnav.nlm.nih.gov/REST/version.json");return{provider:"rxnorm",operation,version:out?.version??null,api_version:out?.apiVersion??null,source_mode:"NLM RxNorm current dataset/API version endpoint; read-only"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

function dailyNameType(v){const s=text(v||"both",16).toLowerCase();if(!["g","generic","b","brand","both"].includes(s))err("INVALID_NAME_TYPE");return s}
function dailyData(out,limit){return(Array.isArray(out?.data)?out.data:[]).slice(0,limit)}
async function dailymed(operation,args){
  if(operation==="drug_names"){
    const q=required(args?.drug_name,"drug_name",240),limit=clamp(args?.limit,1,50,20),u=new URL("https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json");u.searchParams.set("drug_name",q);u.searchParams.set("name_type",dailyNameType(args?.name_type));u.searchParams.set("pagesize",String(limit));u.searchParams.set("page","1");const out=await requestJson(u);return{provider:"dailymed",operation,drug_name:q,items:dailyData(out,limit),metadata:out?.metadata??null,source_mode:"NLM DailyMed REST v2 drug names; current SPL index; bounded GET-only"};
  }
  if(operation==="search_labels"){
    const limit=clamp(args?.limit,1,25,10),u=new URL("https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json");let filters=0;
    if(args?.drug_name){u.searchParams.set("drug_name",required(args.drug_name,"drug_name",240));u.searchParams.set("name_type",dailyNameType(args?.name_type));filters++}
    if(args?.rxcui){u.searchParams.set("rxcui",cleanRxcui(args.rxcui));filters++}
    if(args?.ndc){const ndc=required(args.ndc,"ndc",40);if(!/^[0-9-]{4,40}$/.test(ndc))err("INVALID_NDC");u.searchParams.set("ndc",ndc);filters++}
    if(typeof args?.boxed_warning==="boolean"){u.searchParams.set("boxed_warning",String(args.boxed_warning));filters++}
    if(!filters)err("ARG_REQUIRED:dailymed_filter");u.searchParams.set("pagesize",String(limit));u.searchParams.set("page","1");const out=await requestJson(u);return{provider:"dailymed",operation,items:dailyData(out,limit),metadata:out?.metadata??null,source_mode:"NLM DailyMed REST v2 SPL search by fixed supported filters; bounded GET-only"};
  }
  if(operation==="label_history"){
    const setid=cleanSetId(args?.setid),limit=clamp(args?.limit,1,50,20),u=new URL(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}/history.json`);u.searchParams.set("pagesize",String(limit));u.searchParams.set("page","1");const out=await requestJson(u);return{provider:"dailymed",operation,setid,items:dailyData(out,limit),metadata:out?.metadata??null,source_mode:"NLM DailyMed REST v2 SPL version history; bounded GET-only"};
  }
  if(operation==="label_ndcs"){
    const setid=cleanSetId(args?.setid),limit=clamp(args?.limit,1,50,20),u=new URL(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}/ndcs.json`);u.searchParams.set("pagesize",String(limit));u.searchParams.set("page","1");const out=await requestJson(u);return{provider:"dailymed",operation,setid,items:dailyData(out,limit),metadata:out?.metadata??null,source_mode:"NLM DailyMed REST v2 NDCs for SPL; bounded GET-only"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

async function gtr(operation,args,env){
  if(operation==="search"){
    const q=required(args?.query,"query",500),limit=clamp(args?.limit,1,20,8),u=ncbiParams(new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"),env);u.searchParams.set("db","gtr");u.searchParams.set("term",q);u.searchParams.set("retmax",String(limit));u.searchParams.set("retmode","json");const found=await requestJson(u),ids=Array.isArray(found?.esearchresult?.idlist)?found.esearchresult.idlist.slice(0,limit):[];
    if(!ids.length)return{provider:"ncbi_gtr",operation,query:q,total:Number(found?.esearchresult?.count||0)||0,items:[],source_mode:"NCBI GTR via Entrez E-utilities esearch+esummary; bounded read-only"};
    const s=ncbiParams(new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"),env);s.searchParams.set("db","gtr");s.searchParams.set("id",ids.join(","));s.searchParams.set("retmode","json");const summary=await requestJson(s),result=summary?.result||{},items=ids.map(id=>result[id]).filter(Boolean);return{provider:"ncbi_gtr",operation,query:q,total:Number(found?.esearchresult?.count||0)||items.length,items,source_mode:"NCBI GTR via Entrez E-utilities; test summaries include clinical purpose, analytes, methods and laboratory metadata where supplied; bounded read-only"};
  }
  if(operation==="summary"){
    const id=required(args?.test_id,"test_id",32);if(!/^\d{1,18}$/.test(id))err("INVALID_TEST_ID");const u=ncbiParams(new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"),env);u.searchParams.set("db","gtr");u.searchParams.set("id",id);u.searchParams.set("retmode","json");const out=await requestJson(u);return{provider:"ncbi_gtr",operation,test_id:id,item:out?.result?.[id]??null,source_mode:"NCBI GTR Entrez document summary; bounded read-only"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

export const OPERATIONS={
  rxnorm:["drugs_by_name","properties","version"],
  dailymed:["drug_names","search_labels","label_history","label_ndcs"],
  ncbi_gtr:["search","summary"]
};
export async function runAdapter(provider,operation,args={},env={}){
  if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
  if(provider==="rxnorm")return rxnorm(operation,args);
  if(provider==="dailymed")return dailymed(operation,args);
  if(provider==="ncbi_gtr")return gtr(operation,args,env);
  err("ADAPTER_NOT_IMPLEMENTED",501)
}
