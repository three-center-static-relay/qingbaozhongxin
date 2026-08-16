export const COMMERCIAL_MOBILITY_DIGITAL_TWIN_VERSION="commercial-mobility-digital-twin-v2-20260817";

export const COMMERCIAL_MOBILITY_DIGITAL_TWIN=Object.freeze({
  id:"commercial-mobility-digital-twin",
  version:COMMERCIAL_MOBILITY_DIGITAL_TWIN_VERSION,
  purpose:"Close as much of the Baidu Huiyan/Tencent LBS decision-utility gap as possible using only free/open data, public aggregate observations and open-source transport/population models, without mislabeling modeled outputs as observed phone LBS.",
  production_policy:{
    free_or_open_only:true,
    paid_fallback:false,
    no_credit_card_dependency:true,
    aggregate_public_observations_only:true,
    raw_person_trajectory_storage:false,
    observed_phone_lbs:false,
    modelled_od_must_be_labelled:true,
    modelled_dwell_must_be_labelled:true,
    source_receipts_required:true
  },
  open_source_models:{
    activitysim:{role:"synthetic-household-person daily activity chains, destination/mode/time-of-day demand",license:"BSD-3-Clause",runtime:"compute-staging",network:false},
    scikit_mobility:{role:"aggregate mobility-flow analysis plus gravity/radiation and synthetic trajectory/flow generation with privacy-risk tooling",license:"BSD-3-Clause",runtime:"compute-staging",network:false,evidence_kind:"modelled-or-approved-aggregate-inputs-only"},
    movingpandas:{role:"aggregate/operational trajectory cleaning, stop detection, trip splitting and spatiotemporal aggregation for approved public vehicle traces",license:"BSD-3-Clause",runtime:"compute-staging",network:false,evidence_kind:"public-operational-trajectories-not-person-tracking"},
    aequilibrae:{role:"OD matrices, skims, multi-class user-equilibrium road assignment, GTFS transit assignment",license:"MIT-with-attribution-clause",runtime:"compute-staging",network:false},
    conveyal_r5:{role:"many-to-many probabilistic transit/walk/bike/car accessibility across departure-time windows",license:"MIT",runtime:"compute-staging",network:false,api_stability:"pin-version"},
    eclipse_sumo:{role:"microscopic/mesoscopic traffic and intermodal scenario simulation for congestion/access calibration",license:"EPL-2.0",runtime:"compute-staging",network:false},
    popcorn_population:{role:"Sentinel-1/2 plus coarse population controls to estimate high-resolution occupancy/population surfaces",license:"Apache-2.0",runtime:"compute-gpu-optional",network:false,evidence_kind:"modelled-population-not-phone-location"},
    ohsome_api:{role:"bounded historical OSM counts/area/length/change extraction for POI/building/road opening-closing and supply-change proxies",service:"https://api.ohsome.org/v1",data_license:"OSM-ODbL",runtime:"intelligence-bounded-public-api",evidence_kind:"community-map-history-not-business-registry-ground-truth"}
  },
  observed_public_calibration_sources:{
    beijing_public_mobility:{status:"qualified-free-account-adapter-candidate",provider:"Beijing Public Data Open Platform",access:"datasets marked unconditional-open; online API requires userKey from a free platform account",secret_name_candidate:"BEIJING_OPEN_DATA_USER_KEY",signals:["bus_vehicle_positions","bus_historical_tracks","parking_capacity_and_remaining_spaces","public-transport-crowding-ecosystem-evidence"],privacy:"aggregate/public operations only; never persist personal identifiers"},
    shenzhen_public_mobility:{status:"candidate-license-and-auth-final-check-required",provider:"Shenzhen Government Open Data Platform",signals:["shared_bike_daily_orders","road_segment_speed","street_realtime_data","parking_occupancy"],admission:"fail-closed until exact dataset API authentication and reuse terms are recorded"},
    shanghai_public_mobility:{status:"candidate-exact-dataset-endpoint-required",provider:"Shanghai Public Data Open Platform",signals:["scenic_spot_realtime_visitors","parking","high-timeliness-traffic"],admission:"policy confirms planned/opening scope; do not ingest until exact dataset endpoint and open condition are verified"}
  },
  fusion_pipeline:[
    "entity-resolve-POI-building-transit-parking-admin-into-commercial-spatial-knowledge-graph",
    "build-time-sliced-population-and-occupancy-surfaces",
    "clean-and-aggregate-approved-public-operational-trajectories-without-person-identifiers",
    "generate-synthetic-activity-chains-and-destination-demand",
    "estimate-gravity-radiation-and-activity-based-modelled-mobility-flows",
    "construct-modelled-OD-and-network-skims",
    "assign-road-and-transit-flows",
    "compute-many-to-many-time-window-accessibility",
    "calibrate-against-public-road-speed-bus-bike-parking-and-visitor-count-anchors-when-available",
    "estimate-footfall-and-dwell-proxies-with-uncertainty-bands",
    "return-observed-modelled-proxy-tags-and-source-receipts-for-every-feature"
  ],
  normalized_feature_outputs:[
    "population_nowcast","activity_chain_demand","synthetic_flow_demand","modelled_od_demand","modelled_destination_attraction","modelled_dwell_proxy",
    "temporal_accessibility","road_assignment_pressure","transit_assignment_pressure","observed_public_transport_activity",
    "observed_parking_occupancy","observed_shared_bike_activity","observed_road_speed_activity","poi_turnover","commercial_supply_change"
  ],
  calibration_rule:"Public aggregate observations may calibrate models and reduce uncertainty, but cannot turn modelled footfall/OD/dwell into observed mobile-LBS labels.",
  benchmark_goal:"Approach top-tier paid commercial-GIS decision utility for site selection, trade areas, accessibility, demand and competition while explicitly retaining a gap for proprietary phone telemetry and private consumer profiles."
});

export function commercialMobilityDigitalTwinManifest(){return COMMERCIAL_MOBILITY_DIGITAL_TWIN;}
