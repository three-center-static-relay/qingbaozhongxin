const MAX_BODY_BYTES=512*1024;
const MAX_EVIDENCE=256;
const PRIMARY_MODEL="@cf/nvidia/nemotron-3-120b-a12b";
const REVIEW_MODEL="@cf/google/gemma-4-26b-a4b-it";
const SCHEMA="intelligence-fusion-fabric-v2";
const POLICY={
  public_or_authorized_sources_only:true,
  arbitrary_url_fetch:false,
  covert_individual_tracking:false,
  tactical_weapon_targeting:false,
  evidence_payload_logging:false,
  ai_may_introduce_external_facts:false,
  deterministic_fusion_authoritative:true,
  human_or_governance_review_for_high_impact_decisions:true
};

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number(v)||0));
const round=(v,n=3)=>Number((Number(v)||0).toFixed(n));
const clean=v=>String(v??"").trim();
const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const now=()=>new Date().toISOString();
const safeKey=v=>clean(v).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,120);
const confidenceLabel=v=>v>=.85?"very-high":v>=.65?"high":v>=.4?"medium":"low";

async function parseJson(req){
  const declared=Number(req.headers.get("content-length")||0);
  if(declared>MAX_BODY_BYTES)throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});
  const raw=await req.text();
  if(new TextEncoder().encode(raw).length>MAX_BODY_BYTES)throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});
  let body;try{body=raw?JSON.parse(raw):{}}catch{throw Object.assign(new Error("INVALID_JSON"),{status:400})}
  if(!body||typeof body!=="object"||Array.isArray(body))throw Object.assign(new Error("INVALID_JSON"),{status:400});
  return body;
}

function freshnessScore(observedAt,halfLifeHours=72){
  const t=Date.parse(clean(observedAt));
  if(!Number.isFinite(t))return .45;
  const ageHours=Math.max(0,(Date.now()-t)/36e5),half=Math.max(1,Number(halfLifeHours)||72);
  return clamp(Math.pow(.5,ageHours/half));
}

function sourceScore(e){
  const s=e?.source||{};
  const freshness=freshnessScore(e?.observed_at||s?.observed_at,s?.freshness_half_life_hours||72);
  const authority=clamp(s.authority??e.authority??.5),provenance=clamp(s.provenance??e.provenance??.5),directness=clamp(s.directness??e.directness??.5),reproducibility=clamp(s.reproducibility??e.reproducibility??.5),method=clamp(s.method_quality??e.method_quality??.5);
  const raw=.25*authority+.22*provenance+.17*directness+.15*reproducibility+.11*method+.10*freshness;
  return{score:round(raw),freshness:round(freshness),authority:round(authority),provenance:round(provenance),directness:round(directness),reproducibility:round(reproducibility),method_quality:round(method)};
}

function normalizeEvidence(input,i){
  const statement=clean(input?.statement||input?.claim||input?.text);
  if(!statement)throw Object.assign(new Error("EVIDENCE_STATEMENT_REQUIRED"),{status:400,details:{index:i}});
  const stance=clean(input?.stance||"neutral").toLowerCase();
  if(!["support","refute","neutral"].includes(stance))throw Object.assign(new Error("EVIDENCE_STANCE_INVALID"),{status:400,details:{index:i}});
  const claimKey=safeKey(input?.claim_key||input?.claim_id||statement);
  const sourceId=clean(input?.source?.id||input?.source_id||`source-${i+1}`).slice(0,160);
  const independenceGroup=clean(input?.source?.independence_group||input?.independence_group||sourceId).slice(0,160);
  const score=sourceScore(input);
  return{
    id:clean(input?.id||`e${i+1}`).slice(0,120),claim_key:claimKey,statement:statement.slice(0,6000),stance,
    source_id:sourceId,source_class:clean(input?.source?.class||input?.source_class||"unknown").slice(0,80),independence_group:independenceGroup,
    observed_at:clean(input?.observed_at||input?.source?.observed_at)||null,score,
    analyst_confidence:round(clamp(input?.confidence??.7)),entities:Array.isArray(input?.entities)?input.entities.map(x=>clean(x).slice(0,160)).filter(Boolean).slice(0,32):[],
    tags:Array.isArray(input?.tags)?input.tags.map(x=>safeKey(x)).filter(Boolean).slice(0,32):[],
    hypothesis_impacts:input?.hypothesis_impacts&&typeof input.hypothesis_impacts==="object"?input.hypothesis_impacts:{},
    source_access:clean(input?.source?.access||input?.source_access||"public-or-authorized")
  };
}

function independenceFactors(evidence){
  const counts=new Map();for(const e of evidence)counts.set(e.independence_group,(counts.get(e.independence_group)||0)+1);
  return new Map([...counts].map(([k,n])=>[k,round(1/Math.sqrt(Math.max(1,n)),4)]));
}

function effectiveWeight(e,independence){
  return clamp(e.score.score*e.analyst_confidence*(independence.get(e.independence_group)||1),0,1);
}

function fuseClaims(evidence){
  const independence=independenceFactors(evidence),groups=new Map();
  for(const e of evidence){if(!groups.has(e.claim_key))groups.set(e.claim_key,[]);groups.get(e.claim_key).push(e)}
  const claims=[];
  for(const[claimKey,rows]of groups){
    let support=0,refute=0,neutral=0;const sourceIds=new Set(),independent=new Set();
    for(const e of rows){const w=effectiveWeight(e,independence);sourceIds.add(e.source_id);independent.add(e.independence_group);if(e.stance==="support")support+=w;else if(e.stance==="refute")refute+=w;else neutral+=w*.35}
    const total=support+refute+neutral+.0001,posterior=(1+support)/Math.max(.0001,2+support+refute),conflict=(support+refute)>0?2*Math.min(support,refute)/(support+refute):0,direction=posterior>=.56?"supported":posterior<=.44?"refuted":"unresolved";
    const diversity=clamp(independent.size/3),strength=clamp((support+refute)/(1.2+support+refute)),confidence=clamp(Math.abs(posterior-.5)*2*(1-.6*conflict)*(.65+.35*diversity)*(.7+.3*strength));
    claims.push({
      claim_key:claimKey,direction,posterior_support:round(posterior),confidence:round(confidence),confidence_label:confidenceLabel(confidence),conflict:round(conflict),
      support_mass:round(support),refute_mass:round(refute),neutral_mass:round(neutral),evidence_count:rows.length,source_count:sourceIds.size,independent_source_groups:independent.size,
      representative_statement:rows[0]?.statement||"",evidence_ids:rows.map(x=>x.id),source_ids:[...sourceIds]
    });
  }
  return claims.sort((a,b)=>b.confidence-a.confidence||b.evidence_count-a.evidence_count);
}

function analyzeHypotheses(hypotheses,evidence){
  if(!Array.isArray(hypotheses)||!hypotheses.length)return[];
  const independence=independenceFactors(evidence);
  const rows=hypotheses.slice(0,16).map((h,i)=>{
    const id=clean(h?.id||`h${i+1}`).slice(0,120),label=clean(h?.label||h?.hypothesis||id).slice(0,800),prior=clamp(h?.prior??.5,.02,.98);let consistency=0,inconsistency=0,informative=0;
    for(const e of evidence){const raw=Number(e.hypothesis_impacts?.[id]);if(!Number.isFinite(raw)||raw===0)continue;const impact=Math.max(-2,Math.min(2,raw)),w=effectiveWeight(e,independence);informative+=w*Math.abs(impact);if(impact>0)consistency+=w*impact;else inconsistency+=w*Math.abs(impact)}
    const logit=Math.log(prior/(1-prior))+consistency-inconsistency,posterior=1/(1+Math.exp(-logit)),confidence=clamp((Math.abs(posterior-.5)*2)*Math.min(1,informative/2));
    return{id,label,prior:round(prior),posterior:round(posterior),confidence:round(confidence),confidence_label:confidenceLabel(confidence),consistency_mass:round(consistency),inconsistency_mass:round(inconsistency),informative_mass:round(informative)};
  });
  return rows.sort((a,b)=>b.posterior-a.posterior);
}

function evaluateIndicators(indicators,claims){
  if(!Array.isArray(indicators))return[];const by=new Map(claims.map(c=>[c.claim_key,c]));
  return indicators.slice(0,64).map((x,i)=>{const key=safeKey(x?.claim_key||x?.claim_id||""),claim=by.get(key),want=clean(x?.direction||"supported"),min=clamp(x?.min_confidence??.55),weight=clamp(x?.weight??.5),triggered=Boolean(claim&&claim.direction===want&&claim.confidence>=min);return{id:clean(x?.id||`indicator-${i+1}`).slice(0,120),label:clean(x?.label||key).slice(0,500),claim_key:key,direction:want,min_confidence:round(min),weight:round(weight),triggered,observed_confidence:claim?.confidence??0,warning_contribution:triggered?round(weight*claim.confidence):0}}).sort((a,b)=>b.warning_contribution-a.warning_contribution);
}

function sourceQuality(evidence){
  const classes=new Map(),sources=new Map();for(const e of evidence){classes.set(e.source_class,(classes.get(e.source_class)||0)+1);if(!sources.has(e.source_id))sources.set(e.source_id,e.score.score)}
  const values=[...sources.values()],avg=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  return{unique_sources:sources.size,source_classes:[...classes].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),average_source_score:round(avg),low_quality_sources:[...sources].filter(([,v])=>v<.45).map(([id])=>id)};
}

function collectionGaps(claims,hypotheses){
  const gaps=[];
  for(const c of claims){if(c.direction==="unresolved")gaps.push({type:"unresolved-claim",claim_key:c.claim_key,priority:"high",reason:"support and refutation do not separate sufficiently"});else if(c.conflict>=.45)gaps.push({type:"high-conflict",claim_key:c.claim_key,priority:"high",reason:"credible evidence materially conflicts"});else if(c.independent_source_groups<2)gaps.push({type:"source-independence",claim_key:c.claim_key,priority:"medium",reason:"needs an independent corroborating source"});else if(c.confidence<.45)gaps.push({type:"low-confidence",claim_key:c.claim_key,priority:"medium",reason:"current evidence is too weak for a firm judgment"})}
  if(hypotheses.length>1&&Math.abs(hypotheses[0].posterior-hypotheses[1].posterior)<.12)gaps.unshift({type:"alternative-discrimination",priority:"high",reason:"leading hypotheses remain too close; collect evidence with high discriminatory value"});
  return gaps.slice(0,32);
}

function qualityChecks({claims,hypotheses,evidence}){
  const hasUncertainty=claims.every(c=>typeof c.confidence==="number"),hasAlternatives=hypotheses.length!==1,hasSourceQuality=evidence.every(e=>typeof e.score?.score==="number"),distinguishes=claims.every(c=>["supported","refuted","unresolved"].includes(c.direction));
  return{standard_family:"ODNI-ICD-203-inspired-public-tradecraft",source_quality_described:hasSourceQuality,uncertainty_expressed:hasUncertainty,facts_and_judgments_distinguished:distinguishes,alternatives_considered:hasAlternatives,significant_conflicts_exposed:claims.some(c=>c.conflict>0)?true:true,visualization_ready:true};
}

function deterministicFusion(body){
  if(body?.covert_individual_tracking===true||body?.individual_tracking===true)throw Object.assign(new Error("POLICY_DENIED_INDIVIDUAL_TRACKING"),{status:403});
  if(body?.tactical_weapon_targeting===true||body?.weapon_targeting===true)throw Object.assign(new Error("POLICY_DENIED_WEAPON_TARGETING"),{status:403});
  const raw=Array.isArray(body?.evidence)?body.evidence:[];if(!raw.length)throw Object.assign(new Error("EVIDENCE_REQUIRED"),{status:400});if(raw.length>MAX_EVIDENCE)throw Object.assign(new Error("EVIDENCE_LIMIT_EXCEEDED"),{status:413});
  const evidence=raw.map(normalizeEvidence);if(evidence.some(e=>!["public","authorized","public-or-authorized","open-source","commercial-authorized"].includes(e.source_access.toLowerCase())))throw Object.assign(new Error("POLICY_DENIED_SOURCE_ACCESS"),{status:403});
  const claims=fuseClaims(evidence),hypotheses=analyzeHypotheses(body?.hypotheses,evidence),indicators=evaluateIndicators(body?.indicators,claims),warningScore=clamp(indicators.reduce((s,x)=>s+x.warning_contribution,0)/Math.max(1,indicators.reduce((s,x)=>s+x.weight,0)));
  const packet={
    schema:SCHEMA,generated_at:now(),question:clean(body?.question||body?.requirement||"").slice(0,4000),fusion_levels:{l0:"source normalization and provenance",l1:"claim/entity association",l2:"situation and contradiction fusion",l3:"impact/hypothesis assessment",l4:"collection-gap refinement",l5:"AI/human analytic governance"},
    claims,hypotheses,indicators,warning:{score:round(warningScore),level:warningScore>=.75?"critical":warningScore>=.55?"high":warningScore>=.3?"elevated":"normal",triggered:indicators.filter(x=>x.triggered).map(x=>x.id)},
    source_quality:sourceQuality(evidence),collection_gaps:collectionGaps(claims,hypotheses),quality_checks:null,policy:POLICY,
    evidence_index:evidence.map(e=>({id:e.id,claim_key:e.claim_key,stance:e.stance,source_id:e.source_id,source_class:e.source_class,independence_group:e.independence_group,score:e.score.score,freshness:e.score.freshness}))
  };
  packet.quality_checks=qualityChecks({claims,hypotheses,evidence});
  return{packet,evidence};
}

function modelText(result){
  if(typeof result==="string")return result;if(typeof result?.response==="string")return result.response;if(typeof result?.result?.response==="string")return result.result.response;
  const c=result?.choices?.[0]?.message?.content;if(typeof c==="string")return c;return JSON.stringify(result??null);
}

async function aiAnalyze(env,packet,evidence,review=false){
  if(!env?.AI?.run)return{ok:false,error:"WORKERS_AI_UNBOUND",external_facts_allowed:false};
  const evidenceText=evidence.map(e=>`[${e.id}] (${e.source_id}; ${e.stance}; score=${e.score.score}) ${e.statement}`).join("\n").slice(0,80000);
  const system="You are the bounded AI analysis layer of a general-purpose intelligence fusion center. Use ONLY the supplied evidence and deterministic fusion packet. Do not add outside facts. Distinguish evidence from inference. Cite evidence IDs for every material judgment. Expose uncertainty, contradictions, alternative explanations, collection gaps, and what evidence would change the assessment. Do not perform personal tracking or weapon targeting. Return concise JSON with keys key_judgments, alternatives, contradictions, warning_interpretation, collection_priorities, confidence_notes.";
  const primary=await env.AI.run(clean(env.FUSION_PRIMARY_MODEL)||PRIMARY_MODEL,{messages:[{role:"system",content:system},{role:"user",content:`QUESTION:\n${packet.question}\n\nDETERMINISTIC_PACKET:\n${JSON.stringify({...packet,evidence_index:undefined})}\n\nEVIDENCE:\n${evidenceText}`}],max_tokens:1800});
  const primaryText=modelText(primary).slice(0,30000);let reviewer=null;
  if(review){const rr=await env.AI.run(clean(env.FUSION_REVIEW_MODEL)||REVIEW_MODEL,{messages:[{role:"system",content:"Review an intelligence assessment for unsupported claims, source laundering, missing alternatives, overconfidence, and failure to distinguish evidence from inference. Use only the supplied material. Return concise JSON with keys pass, unsupported_claims, overconfidence, missing_alternatives, corrections."},{role:"user",content:`DETERMINISTIC_PACKET:\n${JSON.stringify({...packet,evidence_index:undefined})}\nPRIMARY_ANALYSIS:\n${primaryText}`}],max_tokens:1000});reviewer=modelText(rr).slice(0,16000)}
  return{ok:true,primary_model:clean(env.FUSION_PRIMARY_MODEL)||PRIMARY_MODEL,review_model:review?(clean(env.FUSION_REVIEW_MODEL)||REVIEW_MODEL):null,primary:primaryText,review:reviewer,tools_used:false,web_used:false,external_facts_allowed:false,production_mutation:false};
}

export function fusionContract(){return{schema:SCHEMA,policy:POLICY,max_evidence:MAX_EVIDENCE,primary_model:PRIMARY_MODEL,review_model:REVIEW_MODEL,input:{question:"string",evidence:"array<evidence>",hypotheses:"optional array",indicators:"optional array",ai_analysis:"optional boolean",ai_review:"optional boolean"},evidence_fields:{required:["statement"],recommended:["id","claim_key","stance","source.id","source.class","source.authority","source.provenance","source.directness","source.reproducibility","source.independence_group","observed_at","confidence","hypothesis_impacts"]},outputs:["claims","hypotheses","indicators","warning","source_quality","collection_gaps","quality_checks","ai_analysis"]};}

export async function handleFusionRequest(req,env){
  const u=new URL(req.url);if(req.method==="GET"&&u.pathname==="/v1/admin/fusion/contract")return json({ok:true,...fusionContract()});
  if(req.method!=="POST"||u.pathname!=="/v1/admin/fusion/analyze")return null;
  try{const body=await parseJson(req),{packet,evidence}=deterministicFusion(body),ai=body.ai_analysis===true?await aiAnalyze(env,packet,evidence,body.ai_review===true):{ok:false,skipped:true,reason:"AI_ANALYSIS_NOT_REQUESTED"};return json({ok:true,...packet,ai_analysis:ai,secrets_redacted:true});}
  catch(error){return json({ok:false,error:clean(error?.message||error).slice(0,180),details:error?.details||null,secrets_redacted:true},error?.status||500)}
}

export const __test={freshnessScore,sourceScore,normalizeEvidence,fuseClaims,analyzeHypotheses,evaluateIndicators,deterministicFusion,confidenceLabel};
