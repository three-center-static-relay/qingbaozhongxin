import assert from "node:assert/strict";
import {buildSituationalPicture,buildAnalysisPacket,fusionMeta} from "../src/intelligence-fusion-core.js";

const now=Date.parse("2026-08-22T14:00:00Z");
const observations=[
 {observation_id:"a1",observed_at:"2026-08-22T13:40:00Z",source_id:"official-a",source_class:"official",independence_group:"g1",entity_key:"entity-x",domain:"business",event_type:"change",stance:"support",hypothesis_key:"h1",indicators:["supplier-shift"],reliability:.94,anomaly:.82,impact:.9,urgency:.72,change_velocity:.8,provenance_ref:"ref-a"},
 {observation_id:"a2",observed_at:"2026-08-22T13:45:00Z",source_id:"dataset-b",source_class:"dataset",independence_group:"g2",entity_key:"entity-x",domain:"business",event_type:"change",stance:"support",hypothesis_key:"h1",indicators:["volume-shift"],reliability:.86,anomaly:.78,impact:.84,urgency:.68,change_velocity:.75,provenance_ref:"ref-b"},
 {observation_id:"a3",observed_at:"2026-08-22T13:48:00Z",source_id:"research-c",source_class:"research",independence_group:"g3",entity_key:"entity-x",domain:"business",event_type:"change",stance:"contradict",hypothesis_key:"h2",indicators:["counter-signal"],reliability:.8,anomaly:.62,impact:.7,urgency:.5,change_velocity:.55,provenance_ref:"ref-c"},
 {observation_id:"b1",observed_at:"2026-08-22T13:50:00Z",source_id:"official-a",source_class:"official",independence_group:"g1",entity_key:"entity-y",domain:"legal",event_type:"policy",stance:"neutral",indicators:["routine-update"],reliability:.9,anomaly:.1,impact:.2,urgency:.1,change_velocity:.1,provenance_ref:"ref-d"}
];
const picture=buildSituationalPicture({observations},null,now);
assert.equal(picture.metadata_only,true);
assert.equal(picture.raw_content_stored,false);
assert.equal(picture.track_count,2);
const x=picture.tracks.find(t=>t.entity_key==="entity-x");
assert(x);
assert.equal(x.independent_source_groups,3);
assert.equal(x.source_class_count,3);
assert(x.confidence>.65);
assert(x.contradiction_ratio>0);
assert(["WATCH","WARNING","HIGH_WARNING"].includes(x.warning_level));
assert(x.retask_recommendations.includes("RUN_ALTERNATIVE_HYPOTHESES_REVIEW"));
assert(x.retask_recommendations.includes("ESCALATE_TO_LA_AND_EXPERT_REVIEW"));
const packet=buildAnalysisPacket(picture);
assert.equal(packet.metadata_only,true);
assert.equal(packet.requirements.include_alternatives,true);
assert.equal(packet.requirements.flag_dissent,true);
const old=buildSituationalPicture({observations:[]},picture,now+8*24*3600*1000);
assert(old.tracks.some(t=>t.track_key===x.track_key&&t.stale===true));
assert(old.tracks.find(t=>t.track_key===x.track_key).priority_score<x.priority_score);
assert.equal(fusionMeta().decision_authority,false);
assert.throws(()=>buildSituationalPicture({observations:[{entity_key:"z",content:"raw text"}]},null,now),/RAW_OR_SECRET_FIELD_DENIED/);
console.log(JSON.stringify({ok:true,test:"intelligence-fusion-warning",track_count:picture.track_count,alert_count:picture.alert_count,top_warning:x.warning_level,top_priority:x.priority_band}));
