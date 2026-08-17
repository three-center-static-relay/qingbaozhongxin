import {COMMERCIAL_SPATIAL_EXCHANGE_VERSION} from "./commercial-spatial-evidence-exchange.js";
import {COMMERCIAL_SPATIAL_BENCHMARK_VERSION} from "./commercial-spatial-benchmark.js";

export const GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION="geospatial-commercial-v3-20260817";

export const GEOSPATIAL_COMMERCIAL_DOMAIN=Object.freeze({
  id:"geospatial-commercial",
  version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION,
  purpose:"Reusable commercial geospatial intelligence capability focused on decision-grade public evidence, cross-center data sharing and explicit uncertainty.",
  free_only:true,
  benchmark_version:COMMERCIAL_SPATIAL_BENCHMARK_VERSION,
  exchange_contract_version:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,
  evidence_policy:{
    observed_vs_proxy_must_be_explicit:true,
    mobile_lbs_observed:false,
    payment_card_spend_observed:false,
    arbitrary_url_fetch:false,
    paid_fallback:false,
    walled_or_blocked_sources_are_not_core:true,
    public_aggregate_mobility_is_phone_lbs:false,
    modelled_od_is_observed_od:false,
    modelled_dwell_is_observed_dwell:false,
    modelled_footfall_is_observed_footfall:false,
    decision_support_parity_target:true,
    sensor_parity_claim:false
  },
  data_sharing:{
    cross_branch:true,
    cross_center:true,
    contract:COMMERCIAL_SPATIAL_EXCHANGE_VERSION,
    normalized_records_only:true,
    source_receipts_required:true,
    raw_person_or_device_trajectories:false,
    inferred_promoted_to_observed:false
  },
  provider_groups:{
    china_maps:["amap","baidu_maps","tencent_maps"],
    global_geocoding:["geonames"],
    global_admin_boundaries:["geoboundaries"],
    spatial_index:["h3"],
    routing_accessibility:["openrouteservice"],
    population_demography:["worldpop"],
    commercial_poi:["overture_maps","foursquare_os_places"],
    buildings_urban_form:["ghsl","overture_maps","dlr_wsf"],
    land_cover_change:["esa_worldcover","copernicus_lcfm"],
    activity_proxies:["night_lights"],
    synthetic_mobility:["worldmove"],
    transit_discovery:["mobilitydatabase"],
    environment_noncore:["openaq"],
    climate_environment:["nasa_power","gdacs"],
    earth_observation_discovery:["nasa_cmr","nasa_stac","nasa_gibs"],
    knowledge_crosscheck:["wikidata"],
    web_intelligence:["exa","tavily","serpapi","baidu_ai_search","gdelt","common_crawl","jina_reader","firecrawl","llamaparse"]
  },
  commercial_core_exclusions:["openaq"],
  public_observation_handoff:[
    "official-public-transport-aggregate",
    "official-public-parking-aggregate",
    "official-public-road-speed-aggregate",
    "official-public-visitor-aggregate",
    "official-land-transaction",
    "official-project-approval",
    "official-statistical-series",
    "public-enterprise-event",
    "public-poi-and-brand-change",
    "public-web-event-and-attention"
  ],
  feature_layers:[
    "place_identity","administrative_hierarchy","administrative_boundary_geometry","population_total","work_population","age_sex_structure","population_density","population_nowcast",
    "poi_density","poi_mix","brand_competition","brand_presence","poi_turnover","commercial_supply_change","building_surface","building_volume","nonresidential_built_form",
    "settlement_extent","land_cover_10m","land_cover","urban_change","night_activity_proxy","road_accessibility","walking_accessibility","driving_accessibility","temporal_accessibility",
    "real_time_traffic","public_transit_feed_availability","public_transit_realtime_source_availability","observed_public_transport_activity","observed_parking_occupancy","observed_shared_bike_activity","observed_road_speed_activity",
    "synthetic_mobility_prior","activity_chain_demand","modelled_od_demand","modelled_destination_attraction","modelled_dwell_proxy","modelled_footfall_proxy",
    "probabilistic_trade_area","competitor_overlap_proxy","aggregate_profile_proxy","land_transaction_signal","project_pipeline_signal","enterprise_activity_signal","web_attention_signal","event_activity_signal",
    "weather_climate_context","hazard_context","earth_observation_change","spatial_quality_provenance"
  ],
  analysis_families:[
    "site_selection","trade_area","market_potential","retail_gap","white_space","competition","cannibalization","footfall_proxy","dwell_proxy","origin_destination_proxy","aggregate_profile",
    "accessibility","territory_design","location_allocation","logistics_network","urban_change","real_estate_potential","future_supply","risk_exposure","scenario_analysis"
  ],
  reusable_compute_primitives:[
    "commercial_spatial_fusion","spatial_feature_fusion","site_ranking","white_space","facility_location","vrp","resource_allocation","change_point","effect_estimation",
    "missing_data_imputation","low_rank_completion","latent_signal_inference","anomaly_consensus","relationship_hypothesis","spatial_gap_gp","synthetic_od_gravity","trade_area_huff","footfall_proxy_nowcast",
    "multinomial_logit","sobol","network_analysis","optimization","causal","simulation","geospatial"
  ],
  limitations:[
    "no-observed-phone-footfall-without-a-separately-approved-source",
    "no-observed-dwell-time-or-origin-destination-mobile-signaling",
    "no-payment-card-spend-or-private-income-profile",
    "no-floor-level-mobile-flow-without-an-approved-observed-source",
    "open-data-proxies-must-not-be-presented-as-baidu-huiyan-or-tencent-location-ground-truth"
  ]
});

export function geospatialCommercialManifest(){return GEOSPATIAL_COMMERCIAL_DOMAIN;}
