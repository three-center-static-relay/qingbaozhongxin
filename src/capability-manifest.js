export const CAPABILITY_ABI_VERSION="capability-abi-v1";

const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const cap=(input,observedAt)=>({
  id:input.id,type:input.type||"atomic",domain:input.domain,operations:input.operations,
  input_schema:input.input_schema||{type:"object"},output_schema:input.output_schema||{type:"object"},
  provider:"intelligence-worker",protocol:"service-binding",version:input.version||"1.0.0",auth_scope:"service-binding-or-public-read",
  permission_scope:"read",network_scope:input.network_scope||"allowlisted-upstreams-only",write_scope:"none",
  dependencies:input.dependencies||[],substitutes:input.substitutes||[],compatible_with:input.compatible_with||[],conflicts_with:[],
  cost:{class:"provider-dependent-free-first",currency:"USD",unit_cost:0},latency:{class:input.latency||"interactive",timeout_ms:input.timeout_ms||65000},throughput:{class:"bounded",max_concurrency:1},
  reliability:{score:clamp(input.reliability??0.75),basis:"runtime-readiness-and-contract-tests"},accuracy:{score:clamp(input.accuracy??0.75),basis:"source-provenance-contract"},
  freshness:{observed_at:observedAt,ttl_seconds:3600},health:{status:input.health||"ready",checked_at:observedAt},
  fitness:{quality:clamp(input.accuracy??0.75),reliability:clamp(input.reliability??0.75),cost:0.95,latency:0.7,security:0.9,adaptability:0.85,complexity:0.45},
  trust:{level:"T1",status:input.health==="unavailable"?"quarantined":"verified"},license:"source-specific",jurisdiction:["global"],first_seen:"2026-08-18T00:00:00.000Z",last_verified:observedAt
});

export function intelligenceCapabilityManifest({catalogVersion="unknown",providerStatuses={}}={}){
  const observedAt=new Date().toISOString(),statuses=Object.values(providerStatuses||{}),configured=statuses.filter(x=>x?.configured).length,total=statuses.length,ratio=total?configured/total:0;
  const providerHealth=configured>0?"ready":"unavailable";
  const capabilities=[
    cap({id:"intelligence.provider-query",domain:"intelligence",operations:["evidence.retrieve","provider.query","source.verify"],health:providerHealth,reliability:Math.max(0.5,ratio),accuracy:0.8},observedAt),
    cap({id:"intelligence.literature-search",domain:"research",operations:["literature.search","citation.retrieve","academic.evidence"],dependencies:["intelligence.provider-query"],health:providerHealth,reliability:0.82,accuracy:0.86},observedAt),
    cap({id:"intelligence.dataset-radar",type:"composite",domain:"datasets",operations:["dataset.discover","dataset.classify","world.observe"],dependencies:["intelligence.provider-query"],health:"ready",latency:"background",timeout_ms:180000,reliability:0.8,accuracy:0.78},observedAt),
    cap({id:"intelligence.geospatial-evidence",type:"composite",domain:"geospatial",operations:["geospatial.search","poi.retrieve","mobility.evidence"],dependencies:["intelligence.provider-query"],health:providerHealth,reliability:0.76,accuracy:0.78},observedAt),
    cap({id:"intelligence.legal-evidence",type:"composite",domain:"legal",operations:["legal.search","regulation.retrieve","case.evidence"],dependencies:["intelligence.provider-query"],health:providerHealth,reliability:0.75,accuracy:0.8},observedAt),
    cap({id:"intelligence.situational-fusion",type:"composite",domain:"intelligence",operations:["observation.normalize","entity.track","all-source.fuse","pattern-of-life.update","confidence.score","dissent.surface"],dependencies:["intelligence.provider-query"],health:"ready",reliability:0.88,accuracy:0.84},observedAt),
    cap({id:"intelligence.warning-and-retask",type:"composite",domain:"intelligence",operations:["anomaly.detect","priority.rank","warning.classify","collection.gap-detect","collection.retask"],dependencies:["intelligence.situational-fusion"],health:"ready",reliability:0.87,accuracy:0.82},observedAt),
    cap({id:"intelligence.requirements-management",type:"composite",domain:"intelligence",operations:["priority-requirement.register","requirement.prioritize","indicator.define","warning-sensitivity.define"],dependencies:["intelligence.situational-fusion"],health:"ready",reliability:0.9,accuracy:0.86},observedAt),
    cap({id:"intelligence.collection-orchestration",type:"composite",domain:"intelligence",operations:["collection.plan","collection-satisfaction.score","source-independence.assess","collection-gap.rank","retask.recommend"],dependencies:["intelligence.requirements-management","intelligence.warning-and-retask"],health:"ready",reliability:0.88,accuracy:0.84},observedAt),
    cap({id:"intelligence.ai-analysis-advisory",type:"composite",domain:"intelligence",operations:["analysis.packet","alternative-hypotheses","uncertainty.explain","dissent.review","collection-priority.recommend"],dependencies:["intelligence.situational-fusion"],health:"ready",reliability:0.82,accuracy:0.8},observedAt)
  ];
  return{abi_version:CAPABILITY_ABI_VERSION,center:"intelligence",generated_at:observedAt,catalog_version:catalogVersion,provider_summary:{total,configured},capabilities,ecology:[
    {from:"intelligence.literature-search",relation:"REQUIRES",to:"intelligence.provider-query"},
    {from:"intelligence.dataset-radar",relation:"PRODUCES",to:"world-model.observation"},
    {from:"intelligence.dataset-radar",relation:"FEEDS",to:"intelligence.situational-fusion"},
    {from:"intelligence.provider-query",relation:"FEEDS",to:"intelligence.situational-fusion"},
    {from:"intelligence.situational-fusion",relation:"PRODUCES",to:"world-model.track"},
    {from:"intelligence.warning-and-retask",relation:"REQUIRES",to:"intelligence.situational-fusion"},
    {from:"intelligence.requirements-management",relation:"GUIDES",to:"intelligence.collection-orchestration"},
    {from:"intelligence.collection-orchestration",relation:"REQUIRES",to:"intelligence.warning-and-retask"},
    {from:"intelligence.collection-orchestration",relation:"COMPLEMENTS",to:"governance.task-planner"},
    {from:"intelligence.warning-and-retask",relation:"COMPLEMENTS",to:"governance.task-planner"},
    {from:"intelligence.ai-analysis-advisory",relation:"REQUIRES",to:"intelligence.situational-fusion"},
    {from:"intelligence.ai-analysis-advisory",relation:"COMPLEMENTS",to:"expert.deliberation"},
    {from:"intelligence.geospatial-evidence",relation:"COMPLEMENTS",to:"compute.geospatial-analysis"},
    {from:"intelligence.legal-evidence",relation:"COMPLEMENTS",to:"expert.deliberation"}
  ]};
}
