import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GEOSPATIAL_COMMERCIAL_DOMAIN} from "../src/domains/geospatial-commercial.js";
import {COMMERCIAL_MOBILITY_DIGITAL_TWIN} from "../src/domains/geospatial-commercial-mobility-digital-twin.js";

const registry=JSON.parse(readFileSync(new URL("../data-assets/geospatial-commercial/mobility-digital-twin-registry-20260817.json",import.meta.url),"utf8"));
const graph=JSON.parse(readFileSync(new URL("../data-assets/geospatial-commercial/commercial-spatial-knowledge-graph-v1.json",import.meta.url),"utf8"));

assert.equal(COMMERCIAL_MOBILITY_DIGITAL_TWIN.production_policy.free_or_open_only,true);
assert.equal(COMMERCIAL_MOBILITY_DIGITAL_TWIN.production_policy.paid_fallback,false);
assert.equal(COMMERCIAL_MOBILITY_DIGITAL_TWIN.production_policy.observed_phone_lbs,false);
assert.equal(COMMERCIAL_MOBILITY_DIGITAL_TWIN.production_policy.raw_person_trajectory_storage,false);
for(const tool of ["activitysim","scikit_mobility","movingpandas","aequilibrae","conveyal_r5","eclipse_sumo","popcorn_population","ohsome_api"])assert.ok(COMMERCIAL_MOBILITY_DIGITAL_TWIN.open_source_models[tool],`missing ${tool}`);
for(const f of ["population_nowcast","activity_chain_demand","synthetic_flow_demand","modelled_od_demand","modelled_dwell_proxy","temporal_accessibility","observed_parking_occupancy","poi_turnover"])assert.ok(COMMERCIAL_MOBILITY_DIGITAL_TWIN.normalized_feature_outputs.includes(f),`missing output ${f}`);
assert.equal(COMMERCIAL_MOBILITY_DIGITAL_TWIN.observed_public_calibration_sources.beijing_public_mobility.secret_name_candidate,"BEIJING_OPEN_DATA_USER_KEY");
assert.match(COMMERCIAL_MOBILITY_DIGITAL_TWIN.observed_public_calibration_sources.shenzhen_public_mobility.status,/candidate/);
assert.match(COMMERCIAL_MOBILITY_DIGITAL_TWIN.observed_public_calibration_sources.shanghai_public_mobility.status,/candidate/);

assert.equal(registry.policy.free_or_open_only,true);
assert.equal(registry.policy.observed_phone_lbs_claim,false);
assert.equal(registry.accepted_open_source_tools.length,8);
assert.equal(registry.public_observation_candidates.length,3);
assert.equal(graph.identity_policy.coordinate_system_canonical,"WGS84");
assert.equal(graph.privacy_policy.personal_nodes,false);
assert.equal(graph.privacy_policy.raw_person_trajectories,false);
for(const n of ["poi","brand","mall","building","entrance_exit","transit_stop","parking_facility","observation","source"])assert.ok(graph.node_types.includes(n));
for(const e of ["contains","competes_with","same_entity","parking_serves","changed_to","derived_from"])assert.ok(graph.edge_types.includes(e));

const shared=JSON.stringify(GEOSPATIAL_COMMERCIAL_DOMAIN.shared_free_tools);
for(const x of ["activitysim_BSD_3_clause","scikit_mobility_BSD_3_clause","movingpandas_BSD_3_clause","aequilibrae_MIT_attribution","conveyal_r5_MIT","eclipse_sumo_EPL_2_0","popcorn_population_Apache_2_0","ohsome_api_OSM_history_ODbL","commercial-spatial-knowledge-graph-v1"])assert.ok(shared.includes(x),`domain missing ${x}`);
for(const f of ["population_nowcast","synthetic_flow_demand","modelled_od_demand","modelled_dwell_proxy","observed_public_transport_activity","observed_parking_occupancy","commercial_entity_graph"])assert.ok(GEOSPATIAL_COMMERCIAL_DOMAIN.feature_layers.includes(f),`domain missing feature ${f}`);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.modelled_od_is_observed_od,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.modelled_dwell_is_observed_dwell,false);
assert.equal(GEOSPATIAL_COMMERCIAL_DOMAIN.evidence_policy.public_aggregate_mobility_is_phone_lbs,false);

console.log(JSON.stringify({ok:true,suite:"geospatial-commercial-mobility-digital-twin",open_source_models:Object.keys(COMMERCIAL_MOBILITY_DIGITAL_TWIN.open_source_models),knowledge_graph:true,public_observation_candidates:Object.keys(COMMERCIAL_MOBILITY_DIGITAL_TWIN.observed_public_calibration_sources),observed_phone_lbs:false,paid_fallback:false}));
