export const CAPABILITY_ABI_VERSION="capability-abi-v1";

const verification=configured=>({
  status:configured?"configured-unverified":"unconfigured",
  scope:"configuration-only",
  verified_at:null,
  receipt_digest:null,
  sample_size:0
});

const cap=(input,observedAt,configured)=>({
  id:input.id,type:input.type||"atomic",domain:input.domain,operations:input.operations,
  input_schema:input.input_schema||{type:"object"},output_schema:input.output_schema||{type:"object"},
  provider:"intelligence-worker",protocol:"service-binding",version:input.version||"1.0.0",auth_scope:"service-binding-or-public-read",
  permission_scope:"read",network_scope:input.network_scope||"allowlisted-upstreams-only",write_scope:"none",
  dependencies:input.dependencies||[],substitutes:input.substitutes||[],compatible_with:input.compatible_with||[],conflicts_with:[],
  cost:{class:"provider-dependent",currency:"USD",unit_cost:null,estimate_status:"unknown"},latency:{class:input.latency||"interactive",timeout_ms:input.timeout_ms||65000},throughput:{class:"bounded",max_concurrency:1},
  reliability:{score:0,basis:"unverified-no-bound-runtime-receipt"},accuracy:{score:0,basis:"unverified-no-bound-runtime-receipt"},
  freshness:{observed_at:observedAt,ttl_seconds:3600},health:{status:configured?"configured-unverified":"unavailable",checked_at:observedAt},
  fitness:{quality:0,reliability:0,cost:0,latency:0,security:0,adaptability:0,complexity:0},
  trust:{level:"T0",status:configured?"unverified":"quarantined"},verification:verification(configured),
  license:"source-specific",jurisdiction:["global"],first_seen:"2026-08-18T00:00:00.000Z",last_verified:null
});

export function intelligenceCapabilityManifest({catalogVersion="unknown",providerStatuses={}}={}){
  const observedAt=new Date().toISOString(),statuses=Object.values(providerStatuses||{}),configured=statuses.filter(x=>x?.configured).length,total=statuses.length,hasConfiguredProvider=configured>0;
  const capabilities=[
    cap({id:"intelligence.provider-query",domain:"intelligence",operations:["evidence.retrieve","provider.query","source.verify"]},observedAt,hasConfiguredProvider),
    cap({id:"intelligence.literature-search",domain:"research",operations:["literature.search","citation.retrieve","academic.evidence"],dependencies:["intelligence.provider-query"]},observedAt,hasConfiguredProvider),
    cap({id:"intelligence.dataset-radar",type:"composite",domain:"datasets",operations:["dataset.discover","dataset.classify","world.observe"],dependencies:["intelligence.provider-query"],latency:"background",timeout_ms:180000},observedAt,hasConfiguredProvider),
    cap({id:"intelligence.geospatial-evidence",type:"composite",domain:"geospatial",operations:["geospatial.search","poi.retrieve","mobility.evidence"],dependencies:["intelligence.provider-query"]},observedAt,hasConfiguredProvider),
    cap({id:"intelligence.legal-evidence",type:"composite",domain:"legal",operations:["legal.search","regulation.retrieve","case.evidence"],dependencies:["intelligence.provider-query"]},observedAt,hasConfiguredProvider)
  ];
  return{abi_version:CAPABILITY_ABI_VERSION,center:"intelligence",generated_at:observedAt,catalog_version:catalogVersion,provider_summary:{total,configured,runtime_verified:0},capabilities,ecology:[
    {from:"intelligence.literature-search",relation:"REQUIRES",to:"intelligence.provider-query"},
    {from:"intelligence.dataset-radar",relation:"PRODUCES",to:"world-model.observation"},
    {from:"intelligence.geospatial-evidence",relation:"COMPLEMENTS",to:"compute.geospatial-analysis"},
    {from:"intelligence.legal-evidence",relation:"COMPLEMENTS",to:"expert.deliberation"}
  ]};
}
