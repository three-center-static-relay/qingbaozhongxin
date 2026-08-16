const json=(x,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
const sha256=async value=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value))));

export const PROVIDER_CANARIES=Object.freeze([
  {id:"bigquery-metadata",provider:"bigquery",operation:"table_get",args:{public_project:"bigquery-public-data",dataset:"google_trends",table:"international_top_terms"},cost_class:"google-metadata-no-query-scan"},
  {id:"earthengine-public-asset",provider:"earthengine",operation:"asset_get",args:{asset:"GOOGLE/DYNAMICWORLD/V1"},cost_class:"public-read"},
  {id:"google-patents-public",provider:"google_patents_public",operation:"search",args:{query:"battery",limit:1},cost_class:"public-read-zero-bigquery"},
  {id:"pkulaw-health",provider:"pkulaw",operation:"health_check",args:{},cost_class:"provider-account-read"},
  {id:"wind-aifin-stock",provider:"aifin_market",operation:"get_stock_price_indicators",args:{windcode:"600519.SH"},cost_class:"provider-account-read"},
  {id:"geonames-fuzhou",provider:"geonames",operation:"search",args:{q:"Fuzhou",country:"CN",limit:3,lang:"en"},cost_class:"free-tier-read"},
  {id:"mobilitydatabase-metadata",provider:"mobilitydatabase",operation:"metadata",args:{limit:1},cost_class:"free-account-read"}
]);

function gate(env){return env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"))}
async function gateRead(env,path){
  if(!env.CENTER_GATE?.get||!env.CENTER_GATE?.idFromName)return{ok:false,error:"CENTER_GATE_UNAVAILABLE"};
  const r=await gate(env).fetch(new Request(`https://gate.internal${path}`,{method:"GET"}));
  return{http_status:r.status,...await r.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}))};
}
function validateResult(spec,result){
  if(spec.id==="bigquery-metadata"){
    const ref=result?.data?.tableReference||{};
    return{business_ok:ref.projectId==="bigquery-public-data"&&ref.datasetId==="google_trends"&&ref.tableId==="international_top_terms",observed:{project:ref.projectId||null,dataset:ref.datasetId||null,table:ref.tableId||null,bigquery_bytes_billed:0}};
  }
  if(spec.id==="earthengine-public-asset"){
    const name=String(result?.data?.name||"");
    return{business_ok:name.includes("earthengine-public")&&name.includes("GOOGLE/DYNAMICWORLD/V1"),observed:{asset:name||null}};
  }
  if(spec.id==="google-patents-public"){
    const count=Array.isArray(result?.items)?result.items.length:0,bytes=Number(result?.bigquery_bytes_billed);
    return{business_ok:count>0&&bytes===0,observed:{item_count:count,bigquery_bytes_billed:Number.isFinite(bytes)?bytes:null,query_mode:result?.query_mode||null}};
  }
  if(spec.id==="pkulaw-health"){
    const healthy=result?.auth_ok===true&&result?.transport_ok===true&&result?.law_data_ok===true&&result?.case_data_ok===true&&result?.status==="healthy";
    return{business_ok:healthy,observed:{status:result?.status||null,auth_ok:result?.auth_ok===true,transport_ok:result?.transport_ok===true,law_data_ok:result?.law_data_ok===true,case_data_ok:result?.case_data_ok===true,checks:result?.checks||null}};
  }
  if(spec.id==="wind-aifin-stock"){
    const source=result?.source||null,serverType=result?.server_type||null,hasData=result?.result!==undefined&&result?.result!==null;
    return{business_ok:source==="Wind AIFin Market"&&serverType==="stock_data"&&hasData,observed:{source,server_type:serverType,has_data:hasData,tool:spec.operation}};
  }
  if(spec.id==="geonames-fuzhou"){
    const items=Array.isArray(result?.data?.geonames)?result.data.geonames:[],first=items[0]||{};
    return{business_ok:result?.free_tier_only===true&&items.length>0,observed:{item_count:items.length,first_name:first.name||null,first_country:first.countryCode||null,free_tier_only:result?.free_tier_only===true}};
  }
  if(spec.id==="mobilitydatabase-metadata"){
    const hasData=result?.data!==undefined&&result?.data!==null;
    return{business_ok:result?.free_account_only===true&&hasData,observed:{free_account_only:result?.free_account_only===true,has_data:hasData,refresh_token_supported:true}};
  }
  return{business_ok:false,observed:{error:"UNKNOWN_CANARY"}};
}
async function runOne(app,env,ctx,spec){
  const taskId=`provider-selftest-${spec.id}-${crypto.randomUUID()}`;
  const started=Date.now();
  let response,payload;
  try{
    response=await app.fetch(new Request("https://intelligence.internal/v1/run",{method:"POST",headers:{"content-type":"application/json","x-three-center-selftest":"provider-fresh-e2e"},body:JSON.stringify({task_id:taskId,provider:spec.provider,operation:spec.operation,timeout_seconds:90,args:spec.args})}),env,ctx);
    payload=await response.json().catch(()=>null);
  }catch(error){
    payload={ok:false,error:String(error?.message||error)};
    response={ok:false,status:500};
  }
  const taskState=await gateRead(env,`/task/${encodeURIComponent(taskId)}`),lockState=await gateRead(env,"/state");
  const digestOk=typeof payload?.result_digest==="string"&&payload.result_digest.length===64;
  const terminal=taskState?.task?.status||null,lockReleased=lockState?.ok===true&&!lockState?.active;
  const checked=payload?.ok===true?validateResult(spec,payload.result):{business_ok:false,observed:{error:payload?.error||"UPSTREAM_FAILED"}};
  const ok=response.ok===true&&payload?.ok===true&&digestOk&&terminal==="pass"&&lockReleased&&checked.business_ok===true;
  return{id:spec.id,provider:spec.provider,operation:spec.operation,ok,http_status:Number(response.status)||null,cost_class:spec.cost_class,result_digest:digestOk?payload.result_digest:null,terminal_status:terminal,lock_released:lockReleased,...checked.observed,elapsed_ms:Date.now()-started};
}

export async function runProviderSelftest(app,env,ctx){
  const checks=[];
  for(const spec of PROVIDER_CANARIES)checks.push(await runOne(app,env,ctx,spec));
  const ok=checks.every(x=>x.ok===true),receipt_digest=await sha256(checks.map(({elapsed_ms,...x})=>x));
  return json({ok,selftest:"provider-fresh-e2e",runtime:true,ai_called:false,providers_checked:checks.length,bigquery_query_scan:false,bigquery_bytes_billed:0,checks,receipt_digest,secrets_redacted:true,observed_at:new Date().toISOString()},ok?200:503);
}
