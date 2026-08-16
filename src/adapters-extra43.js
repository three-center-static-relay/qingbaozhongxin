import {runAdapter as runWebSearch} from "./adapters-extra39.js";
import {OPERATIONS as SPATIAL_OPERATIONS,runAdapter as runSpatial} from "./adapters-extra44.js";
import {OPERATIONS as MEDICAL_LIVE_OPERATIONS,runAdapter as runMedicalLive} from "./adapters-extra45.js";
import {OPERATIONS as MEDICAL_LIVE2_OPERATIONS,runAdapter as runMedicalLive2} from "./adapters-extra46.js";
import {OPERATIONS as MEDICAL_LIVE3_OPERATIONS,runAdapter as runMedicalLive3} from "./adapters-extra47.js";
import {OPERATIONS as MEDICAL_LIVE4_OPERATIONS,runAdapter as runMedicalLive4} from "./adapters-extra48.js";
import {OPERATIONS as MEDICAL_LIVE5_OPERATIONS,runAdapter as runMedicalLive5} from "./adapters-extra49.js";
import {OPERATIONS as PUBLIC_DATASET_OPERATIONS,runAdapter as runPublicDatasets} from "./adapters-extra50.js";

const text=(v,n=1200)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=800){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function hostOf(url){try{return new URL(url).hostname.toLowerCase()}catch{return""}}

const CORE_DOMAINS=[
  "who.int","nhc.gov.cn","nmpa.gov.cn","nice.org.uk","cdc.gov","fda.gov","ncbi.nlm.nih.gov","nlm.nih.gov","ebi.ac.uk","clinicaltrials.gov",
  "cancer.gov","ema.europa.eu","kdigo.org","idsociety.org","professional.heart.org","escardio.org","aasld.org","sccm.org","rnao.ca","nei.nih.gov"
];
const SPECIALTY={
  ophthalmology:["aao.org","nei.nih.gov"],
  oncology:["cancer.gov","civicdb.org","opentargets.org"],
  genetics:["ncbi.nlm.nih.gov","monarchinitiative.org","orphadata.com","cpicpgx.org","pharmgkb.org"],
  nephrology:["kdigo.org"],
  infectious_disease:["idsociety.org","cdc.gov"],
  cardiology:["professional.heart.org","escardio.org"],
  hepatology:["aasld.org"],
  critical_care:["sccm.org"],
  nursing:["rnao.ca","who.int"],
  rehabilitation:["who.int"]
};
function domains(args){const s=text(args?.specialty,80).toLowerCase().replace(/[\s-]+/g,"_");const extra=SPECIALTY[s]||[];return[...new Set([...extra,...CORE_DOMAINS])].slice(0,20)}
function normalize(x,engine){const url=text(x?.url,2000);return{engine,title:text(x?.title,600),url,domain:hostOf(url),published_date:x?.published_date||null,score:x?.score??null,snippet:text(x?.content||(Array.isArray(x?.highlights)?x.highlights.join(" "):""),3500)}}
function dedupe(items){const seen=new Set(),out=[];for(const x of items){const k=(x.url||`${x.domain}|${x.title}`).toLowerCase();if(!k||seen.has(k))continue;seen.add(k);out.push(x)}return out}

async function searchMedical(args,env){
  const q=required(args?.query,"query",1000),limit=clamp(args?.limit_per_engine,3,10,6),include=domains(args);
  const mode=text(args?.mode,80),specialty=text(args?.specialty,80);
  const query=[q,specialty?`specialty: ${specialty}`:"",mode?`clinical task: ${mode}`:"","diagnosis differential treatment evidence guideline medication nursing clinical decision support"].filter(Boolean).join("; ");
  const base={query,limit,include_domains:include};
  const [exa,tavily]=await Promise.allSettled([
    runWebSearch("exa","search",{...base,type:"auto"},env),
    runWebSearch("tavily","search",{...base,search_depth:"advanced",topic:"general"},env)
  ]);
  const items=[];
  if(exa.status==="fulfilled")for(const x of exa.value?.items||[])items.push(normalize(x,"exa"));
  if(tavily.status==="fulfilled")for(const x of tavily.value?.items||[])items.push(normalize(x,"tavily"));
  if(!items.length)err("MEDICAL_SEARCH_UNAVAILABLE",502,{exa:exa.status==="rejected"?String(exa.reason?.message||exa.reason):null,tavily:tavily.status==="rejected"?String(tavily.reason?.message||tavily.reason):null});
  return{provider:"medical_top_tier_search",operation:"search",query:q,specialty:specialty||null,mode:mode||null,official_domains:include,engines:{exa:exa.status==="fulfilled",tavily:tavily.status==="fulfilled"},items:dedupe(items),source_mode:"direct Exa+Tavily retrieval restricted to top-tier official medical and specialty domains; no generated search answer"};
}

export const OPERATIONS={medical_top_tier_search:["search"],...PUBLIC_DATASET_OPERATIONS,...MEDICAL_LIVE_OPERATIONS,...MEDICAL_LIVE2_OPERATIONS,...MEDICAL_LIVE3_OPERATIONS,...MEDICAL_LIVE4_OPERATIONS,...MEDICAL_LIVE5_OPERATIONS,...SPATIAL_OPERATIONS};
export async function runAdapter(provider,operation,args={},env={}){
  if(PUBLIC_DATASET_OPERATIONS[provider]?.includes(operation))return runPublicDatasets(provider,operation,args,env);
  if(MEDICAL_LIVE5_OPERATIONS[provider]?.includes(operation))return runMedicalLive5(provider,operation,args,env);
  if(MEDICAL_LIVE4_OPERATIONS[provider]?.includes(operation))return runMedicalLive4(provider,operation,args,env);
  if(MEDICAL_LIVE3_OPERATIONS[provider]?.includes(operation))return runMedicalLive3(provider,operation,args,env);
  if(MEDICAL_LIVE2_OPERATIONS[provider]?.includes(operation))return runMedicalLive2(provider,operation,args,env);
  if(MEDICAL_LIVE_OPERATIONS[provider]?.includes(operation))return runMedicalLive(provider,operation,args,env);
  if(SPATIAL_OPERATIONS[provider]?.includes(operation))return runSpatial(provider,operation,args,env);
  if(provider!=="medical_top_tier_search"||operation!=="search")err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation});
  return searchMedical(args,env);
}
