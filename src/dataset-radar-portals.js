import {mergeCandidates,scoreCandidate} from "./dataset-radar.js";

const TIMEOUT_MS=15000,MAX_BYTES=700000,PER_PORTAL_LIMIT=10;
const JINA_PREFIX="https://r.jina.ai/";
const SENSITIVE_META=[
  "password dump","credential leak","doxxing","leaked personal data","身份证号码库","手机号库","密码库",
  "身份证","手机号","通讯录","家庭住址","住址数据","个人照片","我的照片","我个人的脸","人脸数据","人脸照片","未脱敏病历"
];
const text=(v,n=500)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const hasSensitive=v=>SENSITIVE_META.some(x=>String(v||"").toLowerCase().includes(x.toLowerCase()));

export const PORTALS=Object.freeze([
  {id:"kaggle_datasets",platform:"Kaggle 中国公开数据集兜底",region:"GLOBAL",kind:"dataset",priority:"S+",always:true,url:"https://www.kaggle.com/datasets?tags=3024-China",domain:"kaggle.com",path_hints:["/datasets/"],tags:["China","dataset","business","finance","industry"]},
  {id:"kaggle_notebooks",platform:"Kaggle 中国公开 Notebook 兜底",region:"GLOBAL",kind:"notebook",priority:"S+",always:true,url:"https://www.kaggle.com/code?searchQuery=China",domain:"kaggle.com",path_hints:["/code/"],tags:["China","notebook","template","EDA","machine-learning"]},
  {id:"tianchi_portal",platform:"Tianchi/阿里云天池",region:"CN",kind:"dataset",priority:"S+",url:"https://tianchi.aliyun.com/dataset/public",domain:"tianchi.aliyun.com",path_hints:["/dataset/"],tags:["China","dataset","competition","notebook","industry"]},
  {id:"datafountain_portal",platform:"DataFountain",region:"CN",kind:"dataset",priority:"S",url:"https://www.datafountain.cn/datasets?view=latest",domain:"datafountain.cn",path_hints:["/datasets","/dataset"],tags:["China","dataset","competition","industry"]},
  {id:"heywhale_dataset_portal",platform:"和鲸 HeyWhale 数据集",region:"CN",kind:"dataset",priority:"S+",url:"https://www.heywhale.com/home/dataset",domain:"heywhale.com",path_hints:["/home/dataset","/m/","/dataset"],tags:["China","dataset","data-science","notebook"]},
  {id:"heywhale_project_portal",platform:"和鲸 HeyWhale 开源项目",region:"CN",kind:"notebook",priority:"S+",url:"https://www.heywhale.com/home/project",domain:"heywhale.com",path_hints:["/home/project","/m/","/project"],tags:["China","notebook","project","template","data-science"]},
  {id:"opendatalab_portal",platform:"OpenDataLab",region:"CN",kind:"dataset",priority:"S+",url:"https://opendatalab.com/home",domain:"opendatalab.com",path_hints:["/OpenDataLab","/dataset","/datasets"],tags:["China","dataset","multimodal","computer-vision","language"]},
  {id:"sciencedb_portal",platform:"ScienceDB 科学数据银行",region:"CN",kind:"scientific-dataset",priority:"S+",url:"https://www.scidb.cn/",domain:"scidb.cn",path_hints:["/detail","/s/","/dataset","/data"],tags:["China","scientific-data","DOI","FAIR"]},
  {id:"tpdc_portal",platform:"国家青藏高原科学数据中心",region:"CN",kind:"scientific-dataset",priority:"S+",url:"https://data.tpdc.ac.cn/product",domain:"data.tpdc.ac.cn",path_hints:["/product","/dataset"],tags:["China","earth-science","climate","remote-sensing","socioeconomic"]},
  {id:"geodata_portal",platform:"国家地球系统科学数据中心",region:"CN",kind:"scientific-dataset",priority:"S+",url:"https://www.geodata.cn/",domain:"geodata.cn",path_hints:["/data","/dataset","/resource"],tags:["China","earth-system","geospatial","environment"]},
  {id:"ngdc_portal",platform:"国家基因组科学数据中心",region:"CN",kind:"scientific-dataset",priority:"S+",url:"https://ngdc.cncb.ac.cn/databases?lang=zh",domain:"ngdc.cncb.ac.cn",path_hints:["/database","/gsa","/bioproject","/biosample","/omix","/gwh","/gvm"],tags:["China","genomics","health","biology","database"]},
  {id:"cma_data_portal",platform:"国家气象科学数据中心",region:"CN",kind:"scientific-dataset",priority:"S+",url:"https://k.data.cma.cn/",domain:"k.data.cma.cn",path_hints:["/data","/dataset","/product"],tags:["China","weather","climate","meteorology"]},

  {id:"uci_portal",platform:"UCI Machine Learning Repository",region:"GLOBAL",kind:"dataset",priority:"S",url:"https://archive.ics.uci.edu/datasets",domain:"archive.ics.uci.edu",path_hints:["/dataset/","/datasets"],tags:["dataset","machine-learning","benchmark"]},
  {id:"openneuro_portal",platform:"OpenNeuro",region:"GLOBAL",kind:"scientific-dataset",priority:"S",url:"https://openneuro.org/search",domain:"openneuro.org",path_hints:["/datasets/","/dataset/"],tags:["neuroimaging","MRI","EEG","BIDS","dataset"]},
  {id:"physionet_portal",platform:"PhysioNet",region:"GLOBAL",kind:"scientific-dataset",priority:"S+",url:"https://physionet.org/about/database/",domain:"physionet.org",path_hints:["/content/","/about/database","/search"],tags:["health","physiology","clinical","dataset"]},
  {id:"dataone_portal",platform:"DataONE",region:"GLOBAL",kind:"scientific-dataset",priority:"S",url:"https://search.dataone.org/data",domain:"search.dataone.org",path_hints:["/view/","/data"],tags:["ecology","environment","earth-science","dataset"]},
  {id:"pangaea_portal",platform:"PANGAEA",region:"GLOBAL",kind:"scientific-dataset",priority:"S",url:"https://www.pangaea.de/",domain:"pangaea.de",path_hints:["/dataset/","/search","/doi"],tags:["earth-science","environment","ocean","dataset"]}
]);

function allowedLink(portal,raw){
  try{
    const u=new URL(raw);
    if(u.protocol!=="https:")return null;
    const h=u.hostname.toLowerCase(),d=portal.domain.toLowerCase();
    if(h!==d&&!h.endsWith(`.${d}`))return null;
    if(portal.path_hints?.length&&!portal.path_hints.some(x=>u.pathname.toLowerCase().includes(x.toLowerCase())))return null;
    u.username="";u.password="";u.hash="";
    return u.toString();
  }catch{return null}
}
function portalCandidate(portal,title,url){
  const joined=`${title} ${url}`;
  if(hasSensitive(joined))return null;
  const c={source:portal.id,type:portal.kind,id:url,title:text(title,260)||portal.platform,description:`${portal.platform} metadata discovery candidate`,query:"fixed-domain-portal-rotation",url,tags:portal.tags||[],license:null,updated_at:null,popularity:0,china_match:portal.region==="CN"||portal.tags?.includes("China"),risk_flags:[]};
  c.score=scoreCandidate(c)+(portal.priority==="S+"?8:portal.priority==="S"?4:0);
  return c;
}
export function parsePortalMarkdown(portal,markdown){
  const out=[],seen=new Set();
  const re=/\[([^\]]{1,220})\]\((https:\/\/[^)\s]+)\)/g;
  for(const m of String(markdown||"").matchAll(re)){
    if(out.length>=PER_PORTAL_LIMIT)break;
    const title=text(m[1],260),url=allowedLink(portal,m[2]);
    if(!url||seen.has(url)||hasSensitive(title))continue;
    const c=portalCandidate(portal,title,url);if(!c||c.score<0)continue;
    seen.add(url);out.push(c);
  }
  return out;
}
async function boundedText(response){
  const declared=Number(response.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)throw new Error("PORTAL_RESPONSE_TOO_LARGE");
  const reader=response.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;
  try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});throw new Error("PORTAL_RESPONSE_TOO_LARGE")}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}
  const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out);
}
async function collectOne(portal){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const response=await fetch(`${JINA_PREFIX}${portal.url}`,{signal:controller.signal,headers:{accept:"text/plain","x-retain-images":"none","user-agent":"three-center-dataset-portal-radar/1.0"}});
    const raw=await boundedText(response);if(!response.ok)throw Object.assign(new Error("PORTAL_UPSTREAM_FAILED"),{http_status:response.status});
    return{portal:portal.id,items:parsePortalMarkdown(portal,raw)};
  }catch(e){if(e?.name==="AbortError")throw new Error("PORTAL_TIMEOUT");throw e}finally{clearTimeout(timer)}
}
function dayIndex(ts=Date.now()){return Math.floor(Number(ts)/86400000)}
export function portalsForDay(ts=Date.now()){
  const always=PORTALS.filter(x=>x.always===true),cn=PORTALS.filter(x=>x.region==="CN"&&x.always!==true),global=PORTALS.filter(x=>x.region==="GLOBAL"&&x.always!==true),d=dayIndex(ts);
  return[...always,cn[d%cn.length],global[d%global.length]];
}
function gate(env){return env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"))}
async function g(env,path,method="GET",body){const init={method,headers:{"content-type":"application/json"}};if(body!==undefined)init.body=JSON.stringify(body);const r=await gate(env).fetch(new Request(`https://gate.internal${path}`,init));return{http:r.status,...await r.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}))}}
export async function runPortalRadar(env,{trigger="cloudflare-cron",scheduled_time=Date.now()}={}){
  const selected=portalsForDay(scheduled_time),items=[],outcomes=[];
  for(const portal of selected){
    try{const r=await collectOne(portal);items.push(...r.items);outcomes.push({portal:portal.id,ok:true,count:r.items.length})}
    catch(e){outcomes.push({portal:portal.id,ok:false,error:text(e?.message||e,120)})}
  }
  const current=await g(env,"/radar/latest"),old=current?.snapshot||null;
  const candidates=mergeCandidates(old?.candidates||[],items);
  const snapshot={...(old||{}),schema_version:old?.schema_version||"2026-08-16.3",metadata_only:true,raw_dataset_mirror:false,raw_notebook_copy:false,portal_radar:true,portal_trigger:trigger,portal_collected_at:new Date().toISOString(),portal_outcomes:outcomes,candidates};
  const saved=await g(env,"/radar/latest","POST",snapshot);
  return{ok:Boolean(saved?.ok),portal_radar:true,selected:selected.map(x=>x.id),new_candidates:items.length,candidate_count:candidates.length,outcomes,save_http:saved?.http};
}
export function portalRadarMeta(){const always=PORTALS.filter(x=>x.always===true);return{mode:"fixed-domain-rotating-metadata-only",reader:"Jina public Reader",arbitrary_target:false,raw_page_archive:false,portals_total:PORTALS.length,china_portals:PORTALS.filter(x=>x.region==="CN").length,global_portals:PORTALS.filter(x=>x.region==="GLOBAL").length,always_daily_portals:always.map(x=>x.id),per_portal_limit:PER_PORTAL_LIMIT,sensitive_metadata_filter:true,scheduled_portals_per_day:always.length+2,portals:PORTALS.map(({id,platform,region,kind,priority,url,always})=>({id,platform,region,kind,priority,url,always:Boolean(always)}))}}
export const __test={collectOne,allowedLink,hasSensitive};
