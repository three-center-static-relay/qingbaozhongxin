export const COMMERCIAL_SPATIAL_EXCHANGE_VERSION="commercial-spatial-evidence-v1-20260817";

export const COMMERCIAL_SPATIAL_EVIDENCE_KINDS=Object.freeze(["observed","derived","inferred","hypothesis"]);
export const COMMERCIAL_SPATIAL_METRIC_FAMILIES=Object.freeze([
  "population","work_population","poi","brand","building","land_cover","night_activity","accessibility","traffic","transit","parking","shared_bike",
  "visitor_activity","land_transaction","project_pipeline","enterprise_activity","web_attention","event_activity","footfall","dwell","origin_destination","trade_area",
  "competitor_overlap","aggregate_profile","market_potential","site_score","white_space","urban_change","risk"
]);

const HEX64=/^[0-9a-f]{64}$/;
const FORBIDDEN_KEYS=/^(imei|imsi|idfa|gaid|device_?id|phone_?number|msisdn|raw_?trajectory|precise_?person_?location)$/i;
function fail(message,details){throw Object.assign(new Error(message),{status:400,details})}
function walk(value,path="$"){
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)walk(value[i],`${path}[${i}]`);return}
  if(!value||typeof value!=="object")return;
  for(const[k,v]of Object.entries(value)){if(FORBIDDEN_KEYS.test(k))fail("PERSONAL_OR_DEVICE_LEVEL_FIELD_DENIED",{path:`${path}.${k}`});walk(v,`${path}.${k}`)}
}
function sourceReceipt(r){
  if(!r||typeof r!=="object")fail("INVALID_SOURCE_RECEIPT");
  const source=String(r.source||r.source_id||"").trim(),digest=String(r.digest_sha256||r.result_digest||"").toLowerCase();
  if(!source||!HEX64.test(digest))fail("INVALID_SOURCE_RECEIPT",{source,digest_present:Boolean(digest)});
  return{...r,source,digest_sha256:digest};
}
function evidenceRecord(r){
  if(!r||typeof r!=="object")fail("INVALID_EVIDENCE_RECORD");
  const evidence_kind=String(r.evidence_kind||"").toLowerCase(),metric=String(r.metric||"").trim(),record_id=String(r.record_id||"").trim();
  if(!COMMERCIAL_SPATIAL_EVIDENCE_KINDS.includes(evidence_kind))fail("INVALID_EVIDENCE_KIND",{evidence_kind});
  if(!record_id||!metric)fail("INVALID_EVIDENCE_RECORD",{record_id,metric});
  if(!r.spatial_unit||!String(r.spatial_unit.id||"").trim())fail("SPATIAL_UNIT_REQUIRED",{record_id});
  if(!r.source||!String(r.source.source_url||"").startsWith("http"))fail("SOURCE_URL_REQUIRED",{record_id});
  if(!String(r.source.content_hash||"").trim()||!String(r.source.fetched_at||"").trim()||!String(r.source.collector_or_parser_version||"").trim())fail("SOURCE_PROVENANCE_REQUIRED",{record_id});
  if((evidence_kind==="inferred"||evidence_kind==="hypothesis")&&!r.quality?.uncertainty)fail("INFERENCE_UNCERTAINTY_REQUIRED",{record_id});
  if(evidence_kind!=="observed"&&r.observed===true)fail("INFERENCE_PROMOTED_TO_OBSERVED",{record_id,evidence_kind});
  return r;
}

export const COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE=Object.freeze({
  contract_version:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,
  purpose:"Share commercial-spatial observations, normalized features, receipts and model outputs across intelligence and compute branches without weakening provenance or evidence labels.",
  center_roles:{
    intelligence:"collect-resolve-structure-and-sign-public-evidence",
    compute:"consume-bounded-evidence-bundles-and-return-derived-inferred-or-hypothesis-records",
    governance:"validate-policy-lineage-and-evidence-boundaries"
  },
  cross_branch_share:true,
  cross_center_share:true,
  share_policy:{
    normalized_records_and_receipts:true,
    source_receipts_required:true,
    source_content_hash_required:true,
    raw_person_or_device_trajectories:false,
    personal_identifiers:false,
    arbitrary_url_fetch:false,
    inferred_promoted_to_observed:false,
    public_aggregate_mobility_is_phone_lbs:false,
    modelled_od_is_observed_od:false,
    modelled_dwell_is_observed_dwell:false,
    modelled_footfall_is_observed_footfall:false
  },
  bundle_schema:{
    required:["contract_version","bundle_id","created_at","source_receipts","records"],
    max_records:2000,
    max_source_receipts:64,
    record_required:["record_id","metric","evidence_kind","spatial_unit","source"],
    spatial_unit_examples:["h3","polygon","poi","mall","parcel","admin-area","isochrone"],
    temporal_grains:["snapshot","hour","day","week","month","quarter","year","interval"]
  },
  compute_handoff_metrics:COMMERCIAL_SPATIAL_METRIC_FAMILIES,
  provenance_required:["source_url","publisher","fetched_at","content_hash","collector_or_parser_version"],
  evidence_kinds:COMMERCIAL_SPATIAL_EVIDENCE_KINDS
});

export function validateCommercialSpatialEvidenceBundle(bundle){
  walk(bundle);
  if(!bundle||typeof bundle!=="object")fail("INVALID_COMMERCIAL_SPATIAL_BUNDLE");
  if(bundle.contract_version!==COMMERCIAL_SPATIAL_EXCHANGE_VERSION)fail("COMMERCIAL_SPATIAL_CONTRACT_VERSION_MISMATCH",{expected:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,observed:bundle.contract_version});
  const receipts=Array.isArray(bundle.source_receipts)?bundle.source_receipts:[],records=Array.isArray(bundle.records)?bundle.records:[];
  if(receipts.length<1||receipts.length>64)fail("SOURCE_RECEIPTS_REQUIRED",{min:1,max:64});
  if(records.length<1||records.length>2000)fail("EVIDENCE_RECORDS_REQUIRED",{min:1,max:2000});
  receipts.map(sourceReceipt);records.map(evidenceRecord);
  return{ok:true,contract_version:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,bundle_id:String(bundle.bundle_id||""),record_count:records.length,source_receipt_count:receipts.length,evidence_kinds:[...new Set(records.map(r=>String(r.evidence_kind)))].sort()};
}
