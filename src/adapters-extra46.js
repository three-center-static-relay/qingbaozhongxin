const TIMEOUT_MS=18000,MAX_BYTES=1600000;
const text=(v,n=1800)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=800){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function optionalSecret(env,name){return text(env?.[name],1000)||null}
async function boundedText(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES});const reader=r.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES})}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function requestJson(url,init={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,headers:{accept:"application/json","user-agent":"three-center-intelligence-medical/1.0",...(init.headers||{})},signal:c.signal}),raw=await boundedText(r);if(!r.ok){const auth=r.status===401||r.status===403;err(auth?"UPSTREAM_AUTH_FAILED":r.status===429?"UPSTREAM_RATE_LIMITED":"UPSTREAM_HTTP_ERROR",auth?503:r.status===429?429:502,{http_status:r.status,preview:text(raw,500)})}let out;try{out=raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{preview:text(raw,400)})}if(Array.isArray(out?.errors)&&out.errors.length)err("UPSTREAM_GRAPHQL_ERROR",502,{errors:out.errors.slice(0,4).map(x=>text(x?.message,500))});return out}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}
function ncbiParams(u,env){u.searchParams.set("tool","three_center_intelligence");const key=optionalSecret(env,"NCBI_API_KEY");if(key)u.searchParams.set("api_key",key);return u}
function cleanSymbol(v){const s=required(v,"gene_symbol",40).toUpperCase();if(!/^[A-Z0-9][A-Z0-9.-]{0,39}$/.test(s))err("INVALID_GENE_SYMBOL");return s}
function positiveInt(v,name,max=999999999){const n=Number(v);if(!Number.isInteger(n)||n<=0||n>max)err(`INVALID_${name.toUpperCase()}`);return n}

async function clinvar(operation,args,env){
  if(operation==="search"){
    const q=required(args?.query,"query",500),limit=clamp(args?.limit,1,20,8),u=ncbiParams(new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"),env);
    u.searchParams.set("db","clinvar");u.searchParams.set("term",q);u.searchParams.set("retmax",String(limit));u.searchParams.set("retmode","json");
    const found=await requestJson(u),ids=Array.isArray(found?.esearchresult?.idlist)?found.esearchresult.idlist.slice(0,limit):[];
    if(!ids.length)return{provider:"ncbi_clinvar",operation,query:q,total:Number(found?.esearchresult?.count||0)||0,items:[],source_mode:"NCBI ClinVar E-utilities esearch+esummary; public read-only"};
    const s=ncbiParams(new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"),env);s.searchParams.set("db","clinvar");s.searchParams.set("id",ids.join(","));s.searchParams.set("retmode","json");
    const summary=await requestJson(s),result=summary?.result||{},items=ids.map(id=>result[id]).filter(Boolean);
    return{provider:"ncbi_clinvar",operation,query:q,total:Number(found?.esearchresult?.count||0)||items.length,items,source_mode:"NCBI ClinVar E-utilities esearch+esummary; synchronized with public ClinVar releases; bounded read-only"};
  }
  if(operation==="summary"){
    const id=positiveInt(args?.variation_id,"variation_id"),u=ncbiParams(new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"),env);u.searchParams.set("db","clinvar");u.searchParams.set("id",String(id));u.searchParams.set("retmode","json");const out=await requestJson(u);return{provider:"ncbi_clinvar",operation,variation_id:id,item:out?.result?.[String(id)]||null,source_mode:"NCBI ClinVar E-utilities document summary; public read-only"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

async function orphadata(operation,args){
  if(operation==="by_gene_symbol"){
    const symbol=cleanSymbol(args?.gene_symbol),u=new URL(`https://api.orphadata.com/rd-associated-genes/genes/symbols/${encodeURIComponent(symbol)}`),out=await requestJson(u);return{provider:"orphadata_api",operation,gene_symbol:symbol,data:out,source_mode:"Orphadata official OAS3 API; CC BY 4.0; read-only"};
  }
  if(operation==="by_orphacode"){
    const code=positiveInt(args?.orphacode,"orphacode",9999999),u=new URL(`https://api.orphadata.com/rd-associated-genes/orphacodes/${code}`),out=await requestJson(u);return{provider:"orphadata_api",operation,orphacode:code,data:out,source_mode:"Orphadata rare-disease gene association by ORPHAcode; official read-only API"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

async function nciEvs(operation,args){
  if(operation!=="search")err("ADAPTER_OPERATION_NOT_APPROVED",403);
  const term=required(args?.query,"query",400),limit=clamp(args?.limit,1,25,10),type=["contains","match","startsWith","phrase","AND","OR","fuzzy"].includes(args?.match_type)?args.match_type:"contains",u=new URL("https://api-evsrest.nci.nih.gov/api/v1/concept/search");
  u.searchParams.set("terminology","ncit");u.searchParams.set("term",term);u.searchParams.set("type",type);u.searchParams.set("include","summary,definitions,synonyms");u.searchParams.set("fromRecord","0");u.searchParams.set("pageSize",String(limit));
  const out=await requestJson(u);return{provider:"nci_evs",operation,query:term,terminology:"ncit",match_type:type,data:out,source_mode:"NCI EVS REST API NCI Thesaurus concept search; fixed unrestricted terminology; bounded read-only"};
}

const CIVIC_ASSERTIONS=`query MedicalAssertions($diseaseName:String,$variantName:String,$therapyName:String,$molecularProfileName:String,$first:Int){assertions(diseaseName:$diseaseName,variantName:$variantName,therapyName:$therapyName,molecularProfileName:$molecularProfileName,first:$first,status:ACCEPTED){totalCount nodes{id name summary assertionType significance status disease{name} molecularProfile{name} therapies{name}}}}`;
const CIVIC_ASSERTION=`query MedicalAssertion($id:Int!){assertion(id:$id){id name summary description assertionType assertionDirection significance status variantOrigin disease{name} molecularProfile{name} therapies{name}}}`;
async function civic(operation,args,env){
  const headers={"content-type":"application/json"},key=optionalSecret(env,"CIVIC_API_KEY");if(key)headers.authorization=`Bearer ${key}`;
  if(operation==="assertions"){
    const first=clamp(args?.limit,1,10,5),variables={first},fields=[["diseaseName",args?.disease],["variantName",args?.variant],["therapyName",args?.therapy],["molecularProfileName",args?.molecular_profile]];for(const[k,v]of fields){const s=text(v,240);if(s)variables[k]=s}if(Object.keys(variables).length===1)err("ARG_REQUIRED:civic_filter");
    const out=await requestJson("https://civicdb.org/api/graphql",{method:"POST",headers,body:JSON.stringify({query:CIVIC_ASSERTIONS,variables})}),data=out?.data?.assertions||null;return{provider:"civic_precision_oncology",operation,filters:variables,total:data?.totalCount??null,items:Array.isArray(data?.nodes)?data.nodes:[],source_mode:"CIViC V2 fixed read-only GraphQL assertion query; anonymous or optional free key"};
  }
  if(operation==="assertion"){
    const id=positiveInt(args?.id,"id"),out=await requestJson("https://civicdb.org/api/graphql",{method:"POST",headers,body:JSON.stringify({query:CIVIC_ASSERTION,variables:{id}})});return{provider:"civic_precision_oncology",operation,id,item:out?.data?.assertion||null,source_mode:"CIViC V2 fixed assertion lookup; read-only GraphQL"};
  }
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

const OT_SEARCH=`query MedicalEntitySearch($queryString:String!,$entityNames:[String!],$size:Int!){search(queryString:$queryString,entityNames:$entityNames,page:{index:0,size:$size}){hits{id entity object{... on Target{id approvedSymbol approvedName} ... on Disease{id name description} ... on Drug{id name description}}}}}`;
async function openTargets(operation,args){
  if(operation!=="search")err("ADAPTER_OPERATION_NOT_APPROVED",403);
  const q=required(args?.query,"query",400),size=clamp(args?.limit,1,20,8),requested=Array.isArray(args?.entities)?args.entities.map(x=>text(x,30).toLowerCase()):[],allowed=["target","disease","drug"],entities=(requested.length?requested:allowed).filter(x=>allowed.includes(x));if(!entities.length)err("INVALID_ENTITIES");
  const out=await requestJson("https://api.platform.opentargets.org/api/v4/graphql",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:OT_SEARCH,variables:{queryString:q,entityNames:entities,size}})}),hits=Array.isArray(out?.data?.search?.hits)?out.data.search.hits:[];
  return{provider:"open_targets",operation,query:q,entities,items:hits,source_mode:"Open Targets Platform official fixed GraphQL entity search; public read-only"};
}

export const OPERATIONS={
  ncbi_clinvar:["search","summary"],
  orphadata_api:["by_gene_symbol","by_orphacode"],
  nci_evs:["search"],
  civic_precision_oncology:["assertions","assertion"],
  open_targets:["search"]
};
export async function runAdapter(provider,operation,args={},env={}){
  if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation,allowed:OPERATIONS[provider]||[]});
  if(provider==="ncbi_clinvar")return clinvar(operation,args,env);
  if(provider==="orphadata_api")return orphadata(operation,args);
  if(provider==="nci_evs")return nciEvs(operation,args);
  if(provider==="civic_precision_oncology")return civic(operation,args,env);
  if(provider==="open_targets")return openTargets(operation,args);
  err("ADAPTER_NOT_IMPLEMENTED",501)
}
