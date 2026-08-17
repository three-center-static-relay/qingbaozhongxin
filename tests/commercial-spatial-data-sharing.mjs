import assert from "node:assert/strict";
import {COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE,COMMERCIAL_SPATIAL_EXCHANGE_VERSION,validateCommercialSpatialEvidenceBundle} from "../src/domains/commercial-spatial-evidence-exchange.js";
import {COMMERCIAL_SPATIAL_BENCHMARK} from "../src/domains/commercial-spatial-benchmark.js";
import {GEOSPATIAL_COMMERCIAL_DOMAIN} from "../src/domains/geospatial-commercial.js";

assert.equal(COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE.cross_branch_share,true);
assert.equal(COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE.cross_center_share,true);
assert.equal(COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE.share_policy.raw_person_or_device_trajectories,false);
assert.equal(COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE.share_policy.inferred_promoted_to_observed,false);
assert.equal(COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE.share_policy.public_aggregate_mobility_is_phone_lbs,false);
assert.deepEqual(COMMERCIAL_SPATIAL_EVIDENCE_EXCHANGE.evidence_kinds,["observed","derived","inferred","hypothesis"]);
assert.equal(COMMERCIAL_SPATIAL_BENCHMARK.parity_definition.observed_phone_sensor_parity,false);
assert.equal(COMMERCIAL_SPATIAL_BENCHMARK.parity_definition.private_profile_parity,false);
for(const k of ["footfall","dwell","origin_destination","trade_area","competitor_overlap","aggregate_profile","site_selection"]){assert.ok(COMMERCIAL_SPATIAL_BENCHMARK.benchmark_dimensions[k],`missing benchmark dimension ${k}`)}
assert.equal(COMMERCIAL_SPATIAL_BENCHMARK.acceptance_gates.missing_data_stress_test,true);
assert.equal(COMMERCIAL_SPATIAL_BENCHMARK.acceptance_gates.temporal_backtest,true);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.exchange_contract_version,COMMERCIAL_SPATIAL_EXCHANGE_VERSION);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.data_sharing.cross_center,true);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.sensor_parity_claim,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.commercial_core_exclusions.includes("openaq"),true);
for(const f of ["modelled_od_demand","modelled_dwell_proxy","modelled_footfall_proxy","probabilistic_trade_area","competitor_overlap_proxy","project_pipeline_signal","land_transaction_signal"]){assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.feature_layers.includes(f),true,`missing ${f}`)}

const digest="a".repeat(64);
const baseSource={source_url:"https://example.gov.cn/public/item",publisher:"example-public-publisher",fetched_at:"2026-08-17T00:00:00Z",content_hash:digest,collector_or_parser_version:"fixture-v1"};
const valid={contract_version:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,bundle_id:"fixture-1",created_at:"2026-08-17T00:00:00Z",source_receipts:[{source:"fixture",digest_sha256:digest}],records:[{record_id:"r1",metric:"parking",evidence_kind:"observed",spatial_unit:{id:"mall-a",type:"mall"},source:baseSource,value:72,unit:"index"},{record_id:"r2",metric:"footfall",evidence_kind:"inferred",spatial_unit:{id:"mall-a",type:"mall"},source:baseSource,value:66,unit:"index",quality:{uncertainty:{low:55,high:77}}}]};
const v=validateCommercialSpatialEvidenceBundle(valid);
assert.equal(v.ok,true);assert.equal(v.record_count,2);assert.deepEqual(v.evidence_kinds,["inferred","observed"]);
assert.throws(()=>validateCommercialSpatialEvidenceBundle({...valid,records:[{...valid.records[1],observed:true}]}),/INFERENCE_PROMOTED_TO_OBSERVED/);
assert.throws(()=>validateCommercialSpatialEvidenceBundle({...valid,records:[{...valid.records[0],device_id:"secret-device"}]}),/PERSONAL_OR_DEVICE_LEVEL_FIELD_DENIED/);

console.log(JSON.stringify({ok:true,suite:"commercial-spatial-data-sharing",contract:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,cross_center:true,benchmark_target:"decision-support-parity-on-public-evidence",sensor_parity:false}));
