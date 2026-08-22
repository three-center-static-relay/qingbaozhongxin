import {buildSituationalPicture,buildAnalysisPacket,fusionMeta} from "./intelligence-fusion-core.js";

const MAX_BODY_BYTES=180000;
const PICTURE_TASK_ID="__situational_picture_v1";
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
function gate(env){return env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"))}
async function stateCall(env,path,method="GET",body){const init={method,headers:{"content-type":"application/json"}};if(body!==undefined)init.body=JSON.stringify(body);const r=await gate(env).fetch(new Request(`https://gate.internal${path}`,init));return{http:r.status,...await r.json().catch(()=>({ok:false,error:"FUSION_STATE_BAD_RESPONSE"}))}}
const statePath=()=>`/task/${encodeURIComponent(PICTURE_TASK_ID)}`;
async function loadPicture(env){const state=await stateCall(env,statePath());return{state,picture:state?.task?.picture||null}}
async function savePicture(env,picture){return stateCall(env,statePath(),"POST",{status:"ready",kind:"situational-picture",updated_at:new Date().toISOString(),picture})}
async function parse(req){const declared=Number(req.headers.get("content-length")||0);if(declared>MAX_BODY_BYTES)throw Object.assign(new Error("FUSION_BODY_TOO_LARGE"),{status:413});const raw=await req.text();if(new TextEncoder().encode(raw).length>MAX_BODY_BYTES)throw Object.assign(new Error("FUSION_BODY_TOO_LARGE"),{status:413});try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(new Error("INVALID_FUSION_JSON"),{status:400})}}
const internal=u=>u.hostname==="intelligence.internal";

async function aiAdvisory(env,picture){
  if(String(env.INTELLIGENCE_AI_ADVISORY_ENABLED||"false")!=="true")return{ok:false,enabled:false,reason:"AI_ADVISORY_DISABLED_ZERO_AUTO_SPEND",automatic:false};
  if(!env.AI?.run)return{ok:false,enabled:true,reason:"WORKERS_AI_BINDING_UNAVAILABLE",automatic:false};
  const packet=buildAnalysisPacket(picture),model=String(env.INTELLIGENCE_ANALYSIS_MODEL||"@cf/nvidia/nemotron-3-120b-a12b");
  const prompt=`You are an intelligence-analysis advisory model. Analyze ONLY the metadata packet below. Do not infer hidden raw-source content. Return concise JSON with: key_judgments, alternative_hypotheses, dissent_or_contradictions, uncertainty, collection_gaps, collection_priorities, escalation_recommendation. Separate observations from assumptions and judgments. Cite track_key for every judgment. Do not recommend autonomous external actions. Packet: ${JSON.stringify(packet)}`;
  try{
    const out=await env.AI.run(model,{messages:[{role:"system",content:"Provide objective, uncertainty-aware all-source analytic support. Preserve human decision authority."},{role:"user",content:prompt}],max_tokens:1800,temperature:0.2});
    return{ok:true,enabled:true,automatic:false,model,advisory:out?.response??out,metadata_only:true,decision_authority:false};
  }catch(error){return{ok:false,enabled:true,automatic:false,model,error:String(error?.message||error).slice(0,180),metadata_only:true,decision_authority:false}}
}

export async function intelligenceFusionRoute(req,env){
  const u=new URL(req.url);
  if(req.method==="GET"&&u.pathname==="/v1/intelligence-fusion/meta")return json({ok:true,...fusionMeta(),ai_advisory:{implemented:true,automatic:false,enabled:String(env.INTELLIGENCE_AI_ADVISORY_ENABLED||"false")==="true",model:String(env.INTELLIGENCE_ANALYSIS_MODEL||"@cf/nvidia/nemotron-3-120b-a12b")}});
  if(req.method==="GET"&&u.pathname==="/v1/intelligence-fusion/latest"){
    if(!internal(u))return json({ok:false,error:"POLICY_DENIED",message:"situational picture is service-binding internal only"},403);
    const loaded=await loadPicture(env);return json({ok:loaded.state?.ok===true,picture:loaded.picture},loaded.state?.ok===true?200:503)
  }
  if(req.method==="POST"&&u.pathname==="/v1/intelligence-fusion/run"){
    if(!internal(u))return json({ok:false,error:"POLICY_DENIED",message:"fusion execution is service-binding internal only"},403);
    const body=await parse(req),loaded=await loadPicture(env),picture=buildSituationalPicture(body,loaded.picture),saved=await savePicture(env,picture);
    if(saved.ok!==true)return json({ok:false,error:"FUSION_STATE_WRITE_FAILED",details:{http:saved.http}},503);
    return json({ok:true,picture,analysis_packet:buildAnalysisPacket(picture),ai_advisory_automatic:false,decision_authority:false});
  }
  if(req.method==="POST"&&u.pathname==="/v1/intelligence-fusion/ai-assess"){
    if(!internal(u))return json({ok:false,error:"POLICY_DENIED",message:"AI assessment is service-binding internal only"},403);
    const loaded=await loadPicture(env);if(!loaded.picture)return json({ok:false,error:"NO_SITUATIONAL_PICTURE"},404);
    const advisory=await aiAdvisory(env,loaded.picture);return json({ok:advisory.ok===true,advisory,analysis_packet:buildAnalysisPacket(loaded.picture)},advisory.ok===true?200:503)
  }
  return null
}
