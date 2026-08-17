export const COMMERCIAL_SPATIAL_BENCHMARK_VERSION="commercial-spatial-benchmark-v1-20260817";

export const COMMERCIAL_SPATIAL_BENCHMARK=Object.freeze({
  version:COMMERCIAL_SPATIAL_BENCHMARK_VERSION,
  objective:"Approach Baidu Huiyan / Tencent Location Big Data decision utility for commercial spatial analysis using lawful public evidence plus explicit modelling; never claim private mobile-sensor parity.",
  parity_definition:{
    target:"decision-support-parity-on-public-evidence",
    observed_phone_sensor_parity:false,
    private_profile_parity:false,
    payment_card_spend_parity:false,
    floor_level_mobile_flow_parity:false,
    acceptable_outputs:["observed-public-aggregate","derived","inferred","hypothesis"]
  },
  benchmark_dimensions:{
    city_population:{target:"high",inputs:["worldpop","ghsl","official-statistics"],outputs:["population","work_population","population_nowcast"]},
    poi_and_brand_supply:{target:"high",inputs:["overture_maps","foursquare_os_places","amap","baidu_maps","tencent_maps","public-web"],outputs:["poi","brand","poi_turnover","brand_presence"]},
    accessibility_and_transport:{target:"high",inputs:["openrouteservice","mobilitydatabase","official-transit","public-road-speed","public-parking"],outputs:["walk_accessibility","drive_accessibility","transit_accessibility","temporal_accessibility"]},
    land_and_project_pipeline:{target:"high",inputs:["official-land-transactions","official-project-approvals","planning-publications"],outputs:["land_transaction","project_pipeline","future_supply","urban_change"]},
    footfall:{target:"calibrated-proxy",inputs:["public-visitor-anchors","parking","transit","shared-bike","road-speed","night-lights","poi","events","weather"],outputs:["footfall_proxy","footfall_interval"],observed_phone_equivalent:false},
    dwell:{target:"calibrated-proxy",inputs:["activity-mix","transport-mode","parking-duration-when-public","visitor-anchor","time-of-day"],outputs:["dwell_proxy","dwell_interval"],observed_phone_equivalent:false},
    origin_destination:{target:"modelled",inputs:["population","jobs","attraction","travel-time","public-flow-marginals"],outputs:["modelled_od","od_uncertainty"],observed_phone_equivalent:false},
    trade_area:{target:"high-decision-utility",inputs:["modelled_od","travel-time","site-attractiveness","population","competition"],outputs:["probabilistic_trade_area","catchment_share"]},
    competitor_overlap:{target:"modelled",inputs:["probabilistic_trade_area","site-choice-probabilities","brand-overlap","public-anchor-flows"],outputs:["competitor_overlap_proxy","cannibalization_proxy"],observed_cross-audience_equivalent:false},
    aggregate_profile:{target:"aggregate-only",inputs:["worldpop","official-census","ghsl","trade-area-weights"],outputs:["aggregate_profile"],private_device_profile:false},
    temporal_trend:{target:"high",inputs:["official-series","gdelt","public-events","common_crawl","night-lights","weather","poi-change"],outputs:["trend","change_point","nowcast"]},
    site_selection:{target:"high-decision-utility",inputs:["all-normalized-commercial-spatial-features"],outputs:["site_score","white_space","market_potential","scenario_rank"]}
  },
  intelligence_requirements:[
    "multi-source-discovery-and-cross-check",
    "official-source-resolution",
    "fixed-source-public-collection",
    "historical-web-recovery",
    "document-table-and-map-attachment-parsing",
    "entity-resolution-and-commercial-spatial-knowledge-graph",
    "content-hash-and-source-receipts",
    "temporal-and-spatial-normalization"
  ],
  compute_requirements:[
    "missing-data-imputation-with-uncertainty",
    "spatial-interpolation-and-spatial-dependence",
    "low-rank-and-latent-factor-recovery",
    "synthetic-od-and-activity-demand",
    "probabilistic-trade-area-and-competitor-overlap",
    "footfall-and-dwell-proxy-calibration",
    "causal-and-change-point-analysis",
    "scenario-simulation-and-site-ranking",
    "holdout-backtesting-and-sensitivity-analysis"
  ],
  acceptance_gates:{
    no_false_observed_claims:true,
    public_anchor_holdout_validation:true,
    temporal_backtest:true,
    geography_transfer_test:true,
    missing_data_stress_test:true,
    ablation_test:true,
    uncertainty_interval_reporting:true,
    source_receipt_completeness:true,
    ranking_stability_test:true,
    sensor_parity_claim_forbidden:true
  },
  benchmark_outputs:[
    "population","work_population","poi_supply","brand_presence","accessibility","parking_activity","transit_activity","road_activity",
    "footfall_proxy","dwell_proxy","modelled_od","probabilistic_trade_area","competitor_overlap_proxy","aggregate_profile","market_potential","site_score","white_space","future_supply","urban_change"
  ]
});

export function commercialSpatialBenchmarkManifest(){return COMMERCIAL_SPATIAL_BENCHMARK;}
