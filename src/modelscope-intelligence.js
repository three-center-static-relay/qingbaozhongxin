const API="https://modelscope.cn/openapi/v1";
const TIMEOUT_MS=15000;
const str=v=>String(v??"").trim();

function token(env={}){return str(env.MODELSCOPE_API_TOKEN)||str(env.MODELSCOPE_TOKEN)}
function headers(env={}){const t=token(env);return t?{authorization:`Bearer ${t}`,accept:"application/json"}:{accept:"application/json"}}

async function getJson(env,path){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(`${API}${path}`,{method:"GET",headers:headers(env),signal:controller.signal});
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{}
    if(!r.ok){const e=new Error(`MODELSCOPE_HTTP_${r.status}`);e.status=r.status;throw e}
    return data;
  }catch(e){if(e?.name==="AbortError"){const x=new Error("MODELSCOPE_TIMEOUT");x.status=504;throw x}throw e}
  finally{clearTimeout(timer)}
}

function countPayload(value){
  if(Array.isArray(value))return value.length;
  if(Array.isArray(value?.data))return value.data.length;
  if(Array.isArray(value?.data?.items))return value.data.items.length;
  if(Array.isArray(value?.items))return value.items.length;
  if(Array.isArray(value?.models))return value.models.length;
  if(Array.isArray(value?.datasets))return value.datasets.length;
  if(Array.isArray(value?.skills))return value.skills.length;
  if(Array.isArray(value?.studios))return value.studios.length;
  return value&&typeof value==="object"?1:0;
}

async function safe(env,path){
  try{const data=await getJson(env,path);return{ok:true,http_status:200,item_count:countPayload(data)}}
  catch(e){return{ok:false,http_status:Number(e?.status||0)||null,error_class:str(e?.message)||"MODELSCOPE_PROBE_FAILED",item_count:0}}
}

export async function probeModelScopeIntelligence(env={}){
  const configured=Boolean(token(env));
  if(!configured)return{ok:false,provider:"modelscope",configured:false,authenticated:false,models_ok:false,datasets_ok:false,skills_ok:false,studios_ok:false,secret_echo:false,acceptance_state:"token-required"};
  const me=await safe(env,"/users/me");
  if(!me.ok)return{ok:false,provider:"modelscope",configured:true,authenticated:false,models_ok:false,datasets_ok:false,skills_ok:false,studios_ok:false,http_status:me.http_status,error_class:me.error_class,secret_echo:false,acceptance_state:[401,403].includes(me.http_status)?"auth-failed":"upstream-failed"};
  const [models,datasets,skills,studios]=await Promise.all([
    safe(env,"/models"),
    safe(env,"/datasets"),
    safe(env,"/skills"),
    safe(env,"/studios")
  ]);
  const ok=models.ok&&datasets.ok&&skills.ok&&studios.ok;
  return{
    ok,provider:"modelscope",configured:true,authenticated:true,
    models_ok:models.ok,models_count:models.item_count,
    datasets_ok:datasets.ok,datasets_count:datasets.item_count,
    skills_ok:skills.ok,skills_count:skills.item_count,
    studios_ok:studios.ok,studios_count:studios.item_count,
    acceptance_state:ok?"live-read-apis-pass":"partial-read-api-failure",
    secret_echo:false
  };
}
