import app,{CenterGate} from "./production-guard.js";
import {runAdapter} from "./adapters.js";
export {CenterGate};

const ORIGIN="https://intelligence.internal";
const SERVICE="intelligence-worker";
const DEPLOYMENT_ATTESTATION="required-secrets-zenodo-kaggle-v1-baolong-collaboration";
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});

async function readApp(path,env,ctx){
  const response=await app.fetch(new Request(`${ORIGIN}${path}`,{method:"GET"}),env,ctx);
  const body=await response.json().catch(()=>({ok:false,error:"ADMIN_BAD_JSON"}));
  return {http_status:response.status,body};
}

async function readGate(env){
  if(!env.CENTER_GATE?.get||!env.CENTER_GATE?.idFromName)return {ok:false,error:"CENTER_GATE_UNAVAILABLE",active:null};
  const gate=env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"));
  const response=await gate.fetch(new Request("https://gate.internal/state",{method:"GET"}));
  const body=await response.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}));
  return {http_status:response.status,...body};
}

function classifyZenodo403(error){
  if(Number(error?.details?.http_status)!==403)return null;
  const raw=String(error?.details?.body||"").trim();
  const lower=raw.toLowerCase();
  if(/ip address|ip has been blocked|you are being blocked|blocked.*support@zenodo\.org|contact.*support@zenodo\.org/.test(lower))return"IP_BLOCKED";
  if(/<!doctype html|<html|cloudflare|captcha|attention required|challenge|cf-ray/.test(lower))return"WAF_OR_HTML_FORBIDDEN";
  let parsed=null;try{parsed=JSON.parse(raw)}catch{}
  const message=String(parsed?.message||"").trim().toLowerCase();
  if(/scope|missing authorization|not authorized|permission/.test(message))return"AUTHORIZATION_SCOPE";
  if(parsed&&Number(parsed?.status)===403&&/^forbidden\.?$/.test(message))return"ZENODO_JSON_FORBIDDEN_GENERIC";
  if(parsed&&Number(parsed?.status)===403)return"ZENODO_JSON_OTHER_403";
  if(/^forbidden\.?$/.test(lower))return"GENERIC_FORBIDDEN";
  return"OTHER_403";
}

async function providerRuntimeSelftest(provider,env){
  const isZenodo=provider==="zenodo";
  const secretName=isZenodo?"ZENODO_TOKEN":"KAGGLE_API_TOKEN";
  const operation=isZenodo?"search":"datasets_search";
  const args=isZenodo?{query:"climate",limit:1,page:1,sort:"bestmatch"}:{query:"population",page:1,sort:"hottest"};
  const secretPresent=Boolean(String(env[secretName]||"").trim());
  try{
    const result=await runAdapter(provider,operation,args,env);
    const itemCount=Array.isArray(result?.items)?result.items.length:0;
    return json({ok:itemCount>0,selftest:`${provider}-runtime`,secret_present:secretPresent,upstream_http_status:200,item_count:itemCount,total:result?.total??null,error:null,upstream_error_class:null,secrets_redacted:true});
  }catch(error){
    return json({ok:false,selftest:`${provider}-runtime`,secret_present:secretPresent,upstream_http_status:Number(error?.details?.http_status)||null,error:String(error?.message||`${provider.toUpperCase()}_SELFTEST_FAILED`),adapter_status:Number(error?.status)||500,upstream_error_class:isZenodo?classifyZenodo403(error):null,secrets_redacted:true});
  }
}

const slimText=(v,n=160)=>String(v??"").trim().slice(0,n);
function rowsFrom(result){
  const candidates=[result?.items,result?.data?.data,result?.data?.geonames,result?.data?.feeds,result?.data?.results,result?.data?.items,result?.data];
  for(const v of candidates)if(Array.isArray(v))return v;
  return[];
}
function publicRows(result,limit=5){return rowsFrom(result).slice(0,limit).map(x=>({title:slimText(x?.title||x?.name||x?.provider||x?.id,120)||null,address:slimText(x?.address,160)||null,distance_m:Number.isFinite(Number(x?._distance))?Number(x._distance):null}))}
async function probe(name,provider,operation,args,env){
  const started=Date.now();
  try{
    const result=await runAdapter(provider,operation,args,env),rows=rowsFrom(result);
    const summary={row_count:rows.length};
    if(provider==="tencent_maps")summary.top=publicRows(result);
    if(provider==="geonames")summary.top=publicRows(result);
    if(provider==="mobilitydatabase")summary.sample=publicRows(result,3);
    if(provider==="baidu_maps")summary.traffic={description:slimText(result?.data?.description,80)||null,road_count:Array.isArray(result?.data?.road_traffic)?result.data.road_traffic.length:0};
    if(["tavily","exa","firecrawl"].includes(provider))summary.top=(Array.isArray(result?.items)?result.items:[]).slice(0,3).map(x=>({title:slimText(x?.title,160)||null,domain:(()=>{try{return new URL(x?.url).hostname}catch{return null}})()}));
    return{name,ok:true,provider,operation,elapsed_ms:Date.now()-started,summary};
  }catch(error){return{name,ok:false,provider,operation,elapsed_ms:Date.now()-started,error:String(error?.message||"SELFTEST_STAGE_FAILED").slice(0,120),adapter_status:Number(error?.status)||null,upstream_http_status:Number(error?.details?.http_status)||null}}
}
async function baolongCollaborationSelftest(env){
  const args={place_name:"福州宝龙城市广场",city:"福州",province:"福建",country_code:"CN",municipality:"Fuzhou",location:"26.061551,119.291555",competitor_names:["福州苏宁广场","福州万象城"]};
  const stages=[];
  stages.push(await probe("collaboration_plan","geospatial_commercial","combined_context",args,env));
  stages.push(await probe("tencent_target","tencent_maps","place_text",{keyword:args.place_name,region:args.city,limit:8},env));
  stages.push(await probe("tencent_malls","tencent_maps","place_nearby",{keyword:"购物中心",location:args.location,radius:3000,limit:20},env));
  stages.push(await probe("tencent_metro","tencent_maps","place_nearby",{keyword:"地铁站",location:args.location,radius:1500,limit:20},env));
  stages.push(await probe("tencent_bus","tencent_maps","place_nearby",{keyword:"公交站",location:args.location,radius:1000,limit:20},env));
  stages.push(await probe("baidu_traffic","baidu_maps","traffic_around",{center:args.location,radius:500,coord_type_input:"wgs84",coord_type_output:"bd09ll"},env));
  stages.push(await probe("geonames","geonames","nearby",{lat:26.061551,lng:119.291555,radius:10,limit:20,lang:"zh"},env));
  stages.push(await probe("mobilitydatabase","mobilitydatabase","gtfs_search",{country_code:"CN",municipality:"Fuzhou",limit:20},env));
  let web=null;
  for(const[p,key]of [["tavily","TAVILY_API_KEY"],["exa","EXA_API_KEY"],["firecrawl","FIRECRAWL_API_KEY"]]){
    if(!slimText(env?.[key],4096))continue;
    const x=await probe("network_intelligence",p,"search",{query:"福建 福州 福州宝龙城市广场 品牌 商户 招商 2025 2026",limit:3,country:"CN"},env);
    stages.push(x);web=x;if(x.ok)break;
  }
  if(!web)stages.push({name:"network_intelligence",ok:false,error:"NO_CONFIGURED_WEB_PROVIDER",provider:null,operation:"search"});
  const required=["collaboration_plan","tencent_target","baidu_traffic","geonames","mobilitydatabase","network_intelligence"],requiredPass=required.every(n=>stages.some(x=>x.name===n&&x.ok));
  return json({ok:requiredPass,selftest:"fuzhou-baolong-collaboration",case:"福州宝龙城市广场",location:args.location,required_pass:requiredPass,stages,observed_mobile_lbs:false,real_footfall:false,dwell_time_observed:false,origin_destination_observed:false,cross_mall_audience_overlap_observed:false,payment_spend_observed:false,compute_handoff:"existing bounded location_intelligence recipes; network remains disabled inside compute",secrets_redacted:true},requiredPass?200:503);
}

async function adminContext(env,ctx){
  const health=await readApp("/health",env,ctx);
  const source=await readApp("/source",env,ctx);
  const acceptance=await readApp("/v1/acceptance/latest",env,ctx);
  const gate=await readGate(env);
  const version=env.CF_VERSION_METADATA||{};
  const ok=health.http_status===200&&health.body?.ok===true&&source.http_status===200&&source.body?.ok===true&&gate.ok===true;
  return json({ok,service:SERVICE,admin_read_only:true,deployment_attestation:DEPLOYMENT_ATTESTATION,observed_at:new Date().toISOString(),runtime_version:{id:version.id||null,tag:version.tag||null,timestamp:version.timestamp||null},health:health.body,source:source.body,acceptance:acceptance.body,active_task:gate.active||null,active_state_verified:gate.ok===true,secrets_redacted:true},ok?200:503);
}

export default{
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/zenodo-runtime")return providerRuntimeSelftest("zenodo",env);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/kaggle-runtime")return providerRuntimeSelftest("kaggle",env);
    if(req.method==="GET"&&url.pathname==="/v1/selftest/fuzhou-baolong-collaboration")return baolongCollaborationSelftest(env);
    if(req.method==="GET"&&url.pathname==="/v1/admin/context"){
      if(url.hostname!=="intelligence.internal")return json({ok:false,error:"POLICY_DENIED",message:"admin context is service-binding internal only"},403);
      return adminContext(env,ctx);
    }
    return app.fetch(req,env,ctx);
  },
  async scheduled(controller,env,ctx){if(typeof app.scheduled==="function")return app.scheduled(controller,env,ctx)}
};
