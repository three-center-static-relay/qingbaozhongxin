const TIMEOUT_MS=16000,MAX_BYTES=1200000;
const text=(v,n=1200)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function cleanGene(v){const s=text(v,40).toUpperCase();if(!s)return null;if(!/^[A-Z0-9][A-Z0-9.-]{0,39}$/.test(s))err("INVALID_GENE_SYMBOL");return s}
function cleanTerm(v,name,n=180){const s=text(v,n);if(!s)return null;if(/[\u0000-\u001f]/.test(s))err(`INVALID_${name.toUpperCase()}`);return s.replace(/[*,()]/g," ").replace(/\s+/g," ").trim()}
async function boundedText(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES});const reader=r.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_BYTES})}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function requestJson(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{method:"GET",headers:{accept:"application/json","user-agent":"three-center-intelligence-medical/1.0"},signal:c.signal}),raw=await boundedText(r);if(!r.ok){err(r.status===429?"UPSTREAM_RATE_LIMITED":"UPSTREAM_HTTP_ERROR",r.status===429?429:502,{http_status:r.status,preview:text(raw,400)})}try{return raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{preview:text(raw,300)})}}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}

const PAIR_FIELDS="pairid,drugid,drugname,genesymbol,guidelinename,guidelineurl,cpiclevel,clinpgxlevel,pgxtesting,pmids,usedForRecommendation,provisional";
async function pairs(args){
  const gene=cleanGene(args?.gene_symbol),drug=cleanTerm(args?.drug_name,"drug_name",160),limit=clamp(args?.limit,1,25,10);if(!gene&&!drug)err("ARG_REQUIRED:gene_symbol_or_drug_name");
  const u=new URL("https://api.cpicpgx.org/v1/pair_view");u.searchParams.set("select",PAIR_FIELDS);if(gene)u.searchParams.set("genesymbol",`eq.${gene}`);if(drug)u.searchParams.set("drugname",`ilike.*${drug}*`);u.searchParams.set("limit",String(limit));
  const out=await requestJson(u),items=Array.isArray(out)?out.slice(0,limit):[];
  return{provider:"cpic_pgx",operation:"pairs",gene_symbol:gene,drug_name:drug,items,source_mode:"CPIC official PostgREST pair_view; fixed fields and filters; bounded read-only"};
}
async function guidelines(args){
  const name=cleanTerm(args?.name,"name",240),limit=clamp(args?.limit,1,25,10),u=new URL("https://api.cpicpgx.org/v1/guideline_summary_view");u.searchParams.set("select","guideline_name,guideline_url,drugs,genes");if(name)u.searchParams.set("guideline_name",`ilike.*${name}*`);u.searchParams.set("limit",String(limit));const out=await requestJson(u),items=Array.isArray(out)?out.slice(0,limit):[];
  return{provider:"cpic_pgx",operation:"guidelines",name:name||null,items,source_mode:"CPIC official PostgREST guideline_summary_view; fixed fields and optional name filter; bounded read-only"};
}

export const OPERATIONS={cpic_pgx:["pairs","guidelines"]};
export async function runAdapter(provider,operation,args={}){if(provider!=="cpic_pgx"||!OPERATIONS.cpic_pgx.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation});if(operation==="pairs")return pairs(args);return guidelines(args)}
