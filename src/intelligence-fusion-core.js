const VERSION="intelligence-situational-fusion-v1.1";
const MAX_OBSERVATIONS=256,MAX_TRACKS=128;
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const round=v=>Math.round(clamp(v)*1000)/1000;
const text=(v,n=120)=>String(v??"").trim().slice(0,n);
const arr=(v,n=16)=>Array.isArray(v)?v.slice(0,n):[];
const iso=v=>{const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString()};
const warningLevel=score=>score>=.86?"HIGH_WARNING":score>=.72?"WARNING":score>=.56?"WATCH":score>=.38?"INTEREST":"BACKGROUND";
const priorityBand=score=>score>=.82?"P0":score>=.66?"P1":score>=.48?"P2":score>=.30?"P3":"BACKGROUND";
const warningRank={BACKGROUND:0,INTEREST:1,WATCH:2,WARNING:3,HIGH_WARNING:4};
const atLeastWarning=(current,floor)=>warningRank[current]>=warningRank[floor]?current:floor;
const forbidden=/^(raw|payload|body|content|document|transcript|html|secret|token|password|authorization|cookie|api.?key|credentials)$/i;
const horizons=new Set(["immediate","near_term","medium_term","strategic","unknown"]);

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
  const horizon=horizons.has(input?.time_horizon)?input.time_horizon:"unknown";
  return{
    observation_id:text(input?.observation_id||`obs-${index}-${Math.floor(Date.parse(observedAt)/1000)}`,120),
    observed_at:observedAt,source_id:sourceId,source_class:sourceClass,
    independence_group:text(input?.independence_group||sourceId,96),
    entity_key:entityKey,track_key:text(input?.track_key||`${domain}:${entityKey}`,200),
    domain,event_type:eventType,geography:text(input?.geography||"",120),time_horizon:horizon,
    stance:["support","contradict","neutral"].includes(input?.stance)?input.stance:"neutral",
    hypothesis_key:text(input?.hypothesis_key||"",120),
    indicators:arr(input?.indicators,12).map(x=>text(x,80)),
    reliability,freshness,anomaly:round(input?.anomaly??0),baseline_deviation:round(input?.baseline_deviation??input?.anomaly??0),impact:round(input?.impact??0),
    urgency:round(input?.urgency??0),change_velocity:round(input?.change_velocity??0),deception_signal:round(input?.deception_signal??0),
    provenance_ref:text(input?.provenance_ref||"",160),metadata_only:true
  }
}
function summarizeTrack(key,items,previous){
  const latest=[...items].sort((a,b)=>Date.parse(b.observed_at)-Date.parse(a.observed_at))[0];
  const sourceIds=new Set(items.map(x=>x.source_id)),sourceGroups=new Set(items.map(x=>x.independence_group)),sourceClasses=new Set(items.map(x=>x.source_class));
  const supports=items.filter(x=>x.stance==="support").length,contradicts=items.filter(x=>x.stance==="contradict").length;
  const avg=name=>items.reduce((s,x)=>s+clamp(x[name]),0)/Math.max(1,items.length);
  const corroboration=clamp((sourceGroups.size-1)/3),diversity=clamp((sourceClasses.size-1)/3);
  const contradictionRatio=contradicts/Math.max(1,supports+contradicts),consistency=1-contradictionRatio;
  const independenceRatio=clamp(sourceGroups.size/Math.max(1,sourceIds.size));
  const confidence=round(.30*avg("reliability")+.20*avg("freshness")+.20*corroboration+.12*diversity+.18*consistency);
  const anomaly=round(Math.max(avg("anomaly"),...items.map(x=>x.anomaly)));
  const baselineDeviation=round(Math.max(avg("baseline_deviation"),...items.map(x=>x.baseline_deviation)));
  const impact=round(Math.max(avg("impact"),...items.map(x=>x.impact)));
  const urgency=round(Math.max(avg("urgency"),...items.map(x=>x.urgency)));
  const velocity=round(Math.max(avg("change_velocity"),...items.map(x=>x.change_velocity),clamp(previous?.change_velocity)));
  const deceptionRisk=round(.45*avg("deception_signal")+.30*(1-independenceRatio)+.25*contradictionRatio);
  const informationGainPriority=round(impact*(1-confidence)*(.6+.4*Math.max(anomaly,baselineDeviation)));
  const priority=round(.24*impact+.18*anomaly+.11*baselineDeviation+.14*urgency+.13*confidence+.10*velocity+.06*corroboration+.04*informationGainPriority);
  const tailRiskOverride=impact>=.85&&(Math.max(anomaly,baselineDeviation)>=.65||urgency>=.7);
  let warning=warningLevel(priority);if(tailRiskOverride)warning=atLeastWarning(warning,"WATCH");if(impact>=.92&&urgency>=.85)warning=atLeastWarning(warning,"WARNING");
  const hypothesisMap=new Map();
  for(const x of items)if(x.hypothesis_key){const h=hypothesisMap.get(x.hypothesis_key)||{hypothesis_key:x.hypothesis_key,support:0,contradict:0,neutral:0};h[x.stance]++;hypothesisMap.set(x.hypothesis_key,h)}
  const gaps=[];
  if(sourceGroups.size<2)gaps.push("INDEPENDENT_CORROBORATION");
  if(sourceClasses.size<2)gaps.push("SOURCE_DIVERSITY");
  if(contradictionRatio>.25)gaps.push("RESOLVE_CONTRADICTIONS");
  if(avg("freshness")<.55)gaps.push("REFRESH_OBSERVATIONS");
  if(impact>.7&&confidence<.65)gaps.push("HIGH_IMPACT_LOW_CONFIDENCE");
  if(deceptionRisk>.45)gaps.push("DECEPTION_OR_INFORMATION_POLLUTION_RISK");
  const retask=[];
  if(Math.max(anomaly,baselineDeviation)>.6)retask.push("INCREASE_COLLECTION_CADENCE");
  if(sourceGroups.size<2)retask.push("SEEK_INDEPENDENT_SOURCE");
  if(sourceClasses.size<2)retask.push("SEEK_DIFFERENT_SOURCE_CLASS");
  if(contradictionRatio>.25)retask.push("RUN_ALTERNATIVE_HYPOTHESES_REVIEW");
  if(deceptionRisk>.45)retask.push("VERIFY_PROVENANCE_AND_SEEK_ORTHOGONAL_EVIDENCE");
  if(informationGainPriority>.28)retask.push("PRIORITIZE_HIGH_INFORMATION_VALUE_COLLECTION");
  if(priority>=.66||tailRiskOverride)retask.push("ESCALATE_TO_LA_AND_EXPERT_REVIEW");
  return{
    track_key:key,entity_key:latest.entity_key,domain:latest.domain,geography:latest.geography||null,time_horizons:[...new Set(items.map(x=>x.time_horizon))],
    first_observed:[...items].sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at))[0].observed_at,
    last_observed:latest.observed_at,observation_count:items.length,
    source_count:sourceIds.size,independent_source_groups:sourceGroups.size,source_class_count:sourceClasses.size,source_independence_ratio:round(independenceRatio),
    confidence,corroboration:round(corroboration),source_diversity:round(diversity),contradiction_ratio:round(contradictionRatio),deception_risk:deceptionRisk,
    anomaly,baseline_deviation:baselineDeviation,impact,urgency,change_velocity:velocity,information_gain_priority:informationGainPriority,tail_risk_override:tailRiskOverride,
    priority_score:priority,priority_band:priorityBand(priority),warning_level:warning,
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
  const alerts=tracks.filter(x=>["WATCH","WARNING","HIGH_WARNING"].includes(x.warning_level)).map(x=>({track_key:x.track_key,warning_level:x.warning_level,priority_band:x.priority_band,priority_score:x.priority_score,confidence:x.confidence,impact:x.impact,anomaly:x.anomaly,baseline_deviation:x.baseline_deviation,urgency:x.urgency,deception_risk:x.deception_risk,information_gain_priority:x.information_gain_priority,tail_risk_override:x.tail_risk_override,collection_gaps:x.collection_gaps,retask_recommendations:x.retask_recommendations,stale:x.stale===true}));
  const highValue=tracks.filter(x=>x.priority_band==="P0"||x.priority_band==="P1"||x.tail_risk_override).slice(0,24);
  return{ok:true,version:VERSION,generated_at:new Date(nowMs).toISOString(),metadata_only:true,raw_content_stored:false,observation_count:obs.length,track_count:tracks.length,high_value_track_count:highValue.length,alert_count:alerts.length,tracks,alerts,high_value_tracks:highValue.map(x=>x.track_key),principles:{all_source_fusion:true,continuous_world_model:true,pattern_of_life:true,source_independence:true,deception_resilience:true,tail_risk_override:true,value_of_information:true,alternative_hypotheses:true,uncertainty_explicit:true,adaptive_collection:true,human_ai_teaming:true,decision_support_not_decision_authority:true}};
}
export function buildAnalysisPacket(picture){
  const tracks=arr(picture?.tracks,32);
  return{version:VERSION,purpose:"decision-support-intelligence-analysis",metadata_only:true,questions:["What changed materially relative to baseline?","Which alternative hypotheses remain plausible?","Which judgments are low-confidence but high-impact?","Could apparent corroboration share the same upstream origin or reflect deception/information pollution?","What evidence would most reduce uncertainty?","Which tracks deserve increased or decreased collection cadence?"],tracks:tracks.map(x=>({track_key:x.track_key,domain:x.domain,time_horizons:x.time_horizons,warning_level:x.warning_level,priority_score:x.priority_score,confidence:x.confidence,anomaly:x.anomaly,baseline_deviation:x.baseline_deviation,impact:x.impact,urgency:x.urgency,deception_risk:x.deception_risk,information_gain_priority:x.information_gain_priority,tail_risk_override:x.tail_risk_override,contradiction_ratio:x.contradiction_ratio,hypotheses:x.hypotheses,collection_gaps:x.collection_gaps,recent_indicators:x.recent_indicators})),requirements:{cite_track_keys:true,separate_fact_assumption_judgment:true,express_uncertainty:true,include_alternatives:true,flag_dissent:true,test_source_independence:true,consider_deception:true,consider_low_probability_high_impact:true,no_raw_source_content:true,no_autonomous_external_action:true}};
}
export function fusionMeta(){return{version:VERSION,mode:"general-purpose-intelligence-situational-awareness",pipeline:["sense","normalize","correlate","track-entity-fusion","pattern-of-life","anomaly-and-baseline-deviation","source-independence-and-deception-check","confidence-and-dissent","value-impact-information-gain-priority","warning-and-tail-risk-override","collection-retask","la-expert-review","feedback"],warning_levels:["BACKGROUND","INTEREST","WATCH","WARNING","HIGH_WARNING"],priority_bands:["BACKGROUND","P3","P2","P1","P0"],max_observations_per_fusion:MAX_OBSERVATIONS,max_tracks:MAX_TRACKS,metadata_only:true,raw_content_stored:false,decision_authority:false}}
