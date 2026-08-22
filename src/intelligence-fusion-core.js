const VERSION="intelligence-situational-fusion-v1";
const MAX_OBSERVATIONS=256,MAX_TRACKS=128;
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const round=v=>Math.round(clamp(v)*1000)/1000;
const text=(v,n=120)=>String(v??"").trim().slice(0,n);
const arr=(v,n=16)=>Array.isArray(v)?v.slice(0,n):[];
const iso=v=>{const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString()};
const warningLevel=score=>score>=.86?"HIGH_WARNING":score>=.72?"WARNING":score>=.56?"WATCH":score>=.38?"INTEREST":"BACKGROUND";
const priorityBand=score=>score>=.82?"P0":score>=.66?"P1":score>=.48?"P2":score>=.30?"P3":"BACKGROUND";
const forbidden=/^(raw|payload|body|content|document|transcript|html|secret|token|password|authorization|cookie|api.?key|credentials)$/i;

function rejectRawObject(value,path="root"){
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)rejectRawObject(value[i],`${path}[${i}]`);return}
  if(value&&typeof value==="object")for(const[k,v]of Object.entries(value)){if(forbidden.test(k))throw new Error(`RAW_OR_SECRET_FIELD_DENIED:${path}.${k}`);rejectRawObject(v,`${path}.${k}`)}
}
function observation(input,index=0,nowMs=Date.now()){
  rejectRawObject(input);
  const sourceId=text(input?.source_id||input?.source||"unknown",96);
  const sourceClass=text(input?.source_class||"unknown",48);
  const entityKey=text(input?.entity_key||input?.subject_key||"",160);
  if(!entityKey)throw new Error(`ENTITY_KEY_REQUIRED:${index}`);
  const domain=text(input?.domain||"general",48),eventType=text(input?.event_type||"observation",64);
  const observedAt=iso(input?.observed_at),ageHours=Math.max(0,(nowMs-Date.parse(observedAt))/36e5);
  const freshness=round(Math.exp(-ageHours/168));
  const reliability=round(input?.reliability??input?.source_quality??.5);
  return{
    observation_id:text(input?.observation_id||`obs-${index}-${Math.floor(Date.parse(observedAt)/1000)}`,120),
    observed_at:observedAt,source_id:sourceId,source_class:sourceClass,
    independence_group:text(input?.independence_group||sourceId,96),
    entity_key:entityKey,track_key:text(input?.track_key||`${domain}:${entityKey}`,200),
    domain,event_type:eventType,geography:text(input?.geography||"",120),
    stance:["support","contradict","neutral"].includes(input?.stance)?input.stance:"neutral",
    hypothesis_key:text(input?.hypothesis_key||"",120),
    indicators:arr(input?.indicators,12).map(x=>text(x,80)),
    reliability,freshness,anomaly:round(input?.anomaly??0),impact:round(input?.impact??0),
    urgency:round(input?.urgency??0),change_velocity:round(input?.change_velocity??0),
    provenance_ref:text(input?.provenance_ref||"",160),metadata_only:true
  }
}
function summarizeTrack(key,items,previous){
  const latest=[...items].sort((a,b)=>Date.parse(b.observed_at)-Date.parse(a.observed_at))[0];
  const sourceGroups=new Set(items.map(x=>x.independence_group)),sourceClasses=new Set(items.map(x=>x.source_class));
  const supports=items.filter(x=>x.stance==="support").length,contradicts=items.filter(x=>x.stance==="contradict").length;
  const avg=name=>items.reduce((s,x)=>s+clamp(x[name]),0)/Math.max(1,items.length);
  const corroboration=clamp((sourceGroups.size-1)/3),diversity=clamp((sourceClasses.size-1)/3);
  const contradictionRatio=contradicts/Math.max(1,supports+contradicts);
  const consistency=1-contradictionRatio;
  const confidence=round(.30*avg("reliability")+.20*avg("freshness")+.20*corroboration+.12*diversity+.18*consistency);
  const anomaly=round(Math.max(avg("anomaly"),...items.map(x=>x.anomaly)));
  const impact=round(Math.max(avg("impact"),...items.map(x=>x.impact)));
  const urgency=round(Math.max(avg("urgency"),...items.map(x=>x.urgency)));
  const velocity=round(Math.max(avg("change_velocity"),...items.map(x=>x.change_velocity),clamp(previous?.change_velocity)));
  const priority=round(.27*impact+.22*anomaly+.16*urgency+.15*confidence+.12*velocity+.08*corroboration);
  const warning=warningLevel(priority);
  const hypothesisMap=new Map();
  for(const x of items)if(x.hypothesis_key){const h=hypothesisMap.get(x.hypothesis_key)||{hypothesis_key:x.hypothesis_key,support:0,contradict:0,neutral:0};h[x.stance]++;hypothesisMap.set(x.hypothesis_key,h)}
  const gaps=[];
  if(sourceGroups.size<2)gaps.push("INDEPENDENT_CORROBORATION");
  if(sourceClasses.size<2)gaps.push("SOURCE_DIVERSITY");
  if(contradictionRatio>.25)gaps.push("RESOLVE_CONTRADICTIONS");
  if(avg("freshness")<.55)gaps.push("REFRESH_OBSERVATIONS");
  if(impact>.7&&confidence<.65)gaps.push("HIGH_IMPACT_LOW_CONFIDENCE");
  const retask=[];
  if(anomaly>.6)retask.push("INCREASE_COLLECTION_CADENCE");
  if(sourceGroups.size<2)retask.push("SEEK_INDEPENDENT_SOURCE");
  if(sourceClasses.size<2)retask.push("SEEK_DIFFERENT_SOURCE_CLASS");
  if(contradictionRatio>.25)retask.push("RUN_ALTERNATIVE_HYPOTHESES_REVIEW");
  if(priority>=.66)retask.push("ESCALATE_TO_LA_AND_EXPERT_REVIEW");
  return{
    track_key:key,entity_key:latest.entity_key,domain:latest.domain,geography:latest.geography||null,
    first_observed:[...items].sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at))[0].observed_at,
    last_observed:latest.observed_at,observation_count:items.length,
    source_count:new Set(items.map(x=>x.source_id)).size,independent_source_groups:sourceGroups.size,source_class_count:sourceClasses.size,
    confidence,corroboration:round(corroboration),source_diversity:round(diversity),contradiction_ratio:round(contradictionRatio),
    anomaly,impact,urgency,change_velocity:velocity,priority_score:priority,priority_band:priorityBand(priority),warning_level:warning,
    hypotheses:[...hypothesisMap.values()].slice(0,8),collection_gaps:gaps,retask_recommendations:retask,
    recent_indicators:[...new Set(items.flatMap(x=>x.indicators))].slice(0,16),
    provenance_refs:[...new Set(items.map(x=>x.provenance_ref).filter(Boolean))].slice(0,16),
    previous_warning_level:previous?.warning_level||null,metadata_only:true
  }
}
export function buildSituationalPicture(input={},previousPicture=null,nowMs=Date.now()){
  rejectRawObject(input);
  const obs=arr(input.observations,MAX_OBSERVATIONS).map((x,i)=>observation(x,i,nowMs));
  const byTrack=new Map();for(const x of obs){const xs=byTrack.get(x.track_key)||[];xs.push(x);byTrack.set(x.track_key,xs)}
  const previous=new Map(arr(previousPicture?.tracks,MAX_TRACKS).map(x=>[x.track_key,x]));
  const updated=[...byTrack].map(([k,v])=>summarizeTrack(k,v,previous.get(k)));
  const untouched=[...previous.values()].filter(x=>!byTrack.has(x.track_key)).map(x=>{const ageHours=Math.max(0,(nowMs-Date.parse(x.last_observed||0))/36e5),decay=Math.exp(-ageHours/336),priority=round(clamp(x.priority_score)*decay),confidence=round(clamp(x.confidence)*Math.exp(-ageHours/720));return{...x,confidence,priority_score:priority,priority_band:priorityBand(priority),warning_level:warningLevel(priority),stale:true,stale_age_hours:Math.round(ageHours*10)/10,retask_recommendations:[...new Set([...(x.retask_recommendations||[]),...(ageHours>168?["REFRESH_STALE_TRACK"]:[])])].slice(0,8)}});
  const tracks=[...updated,...untouched].sort((a,b)=>b.priority_score-a.priority_score).slice(0,MAX_TRACKS);
  const alerts=tracks.filter(x=>["WATCH","WARNING","HIGH_WARNING"].includes(x.warning_level)).map(x=>({track_key:x.track_key,warning_level:x.warning_level,priority_band:x.priority_band,priority_score:x.priority_score,confidence:x.confidence,impact:x.impact,anomaly:x.anomaly,urgency:x.urgency,collection_gaps:x.collection_gaps,retask_recommendations:x.retask_recommendations,stale:x.stale===true}));
  const highValue=tracks.filter(x=>x.priority_band==="P0"||x.priority_band==="P1").slice(0,24);
  return{ok:true,version:VERSION,generated_at:new Date(nowMs).toISOString(),metadata_only:true,raw_content_stored:false,observation_count:obs.length,track_count:tracks.length,high_value_track_count:highValue.length,alert_count:alerts.length,tracks,alerts,high_value_tracks:highValue.map(x=>x.track_key),principles:{all_source_fusion:true,continuous_world_model:true,pattern_of_life:true,alternative_hypotheses:true,uncertainty_explicit:true,adaptive_collection:true,human_ai_teaming:true,decision_support_not_decision_authority:true}};
}
export function buildAnalysisPacket(picture){
  const tracks=arr(picture?.tracks,32);
  return{version:VERSION,purpose:"decision-support-intelligence-analysis",metadata_only:true,questions:["What changed materially?","Which alternative hypotheses remain plausible?","Which judgments are low-confidence but high-impact?","What evidence would most reduce uncertainty?","Which tracks deserve increased or decreased collection cadence?"],tracks:tracks.map(x=>({track_key:x.track_key,domain:x.domain,warning_level:x.warning_level,priority_score:x.priority_score,confidence:x.confidence,anomaly:x.anomaly,impact:x.impact,urgency:x.urgency,contradiction_ratio:x.contradiction_ratio,hypotheses:x.hypotheses,collection_gaps:x.collection_gaps,recent_indicators:x.recent_indicators})),requirements:{cite_track_keys:true,separate_fact_assumption_judgment:true,express_uncertainty:true,include_alternatives:true,flag_dissent:true,no_raw_source_content:true,no_autonomous_external_action:true}};
}
export function fusionMeta(){return{version:VERSION,mode:"general-purpose-intelligence-situational-awareness",pipeline:["sense","normalize","correlate","track-entity-fusion","pattern-of-life","anomaly-detection","confidence-and-dissent","value-impact-priority","warning","collection-retask","la-expert-review","feedback"],warning_levels:["BACKGROUND","INTEREST","WATCH","WARNING","HIGH_WARNING"],priority_bands:["BACKGROUND","P3","P2","P1","P0"],max_observations_per_fusion:MAX_OBSERVATIONS,max_tracks:MAX_TRACKS,metadata_only:true,raw_content_stored:false,decision_authority:false}}
