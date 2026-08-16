export const GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION="geospatial-commercial-v4-20260816";

export const GEOSPATIAL_COMMERCIAL_DOMAIN=Object.freeze({
  id:"geospatial-commercial",
  version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION,
  purpose:"China-first commercial geospatial decision-intelligence branch with reusable global open-data layers and bounded current-web market research.",
  free_only:true,
  benchmark_target:{
    reference_products:["Baidu Huiyan commercial-geospatial","Tencent LBS commercial/mall analytics"],
    target_scope:[
      "site-selection","trade-area","market-potential","retail-gap","white-space","competition",
      "accessibility","commercial-supply","project-pipeline","urban-form","population-market","traffic-context"
    ],
    parity_rule:"Never claim parity for observed phone footfall, dwell time, mobile OD, cross-mall audience overlap, or private consumer profiles without a separately approved observed-LBS source."
  },
  evidence_policy:{
    observed_vs_proxy_must_be_explicit:true,
    mobile_lbs_observed:false,
    payment_card_spend_observed:false,
    web_signal_is_observed_lbs:false,
    synthetic_mobility_is_observed_lbs:false,
    arbitrary_url_fetch:false,
    paid_fallback:false,
    walled_or_blocked_sources_are_not_core:true,
    source_provenance_required:true
  },
  provider_groups:{
    china_maps:["amap","baidu_maps","tencent_maps"],
    global_place_crosscheck:["geonames","wikidata"],
    commercial_poi_crosscheck:["overture_maps","foursquare_os_places"],
    spatial_index:["h3"],
    population_demography:["worldpop","ghsl"],
    buildings_urban_form:["cmab_china","cbra_china","microsoft_building_density_height","ghsl","dlr_wsf","overture_maps"],
    land_cover_change:["esa_worldcover","copernicus_lcfm","google_dynamic_world"],
    activity_proxies:["night_lights"],
    synthetic_mobility:["worldmove"],
    transit_discovery:["mobilitydatabase"],
    routing_accessibility:["amap","baidu_maps","tencent_maps","openrouteservice"],
    earth_observation_discovery:["earthengine","google_earth_observation","nasa_cmr","nasa_stac","nasa_gibs"],
    web_market_intelligence:["commercial_web_research","exa","tavily","firecrawl","jina"]
  },
  feature_layers:[
    "place_identity","administrative_hierarchy","population_total","age_sex_structure","population_density",
    "poi_density","poi_mix","brand_presence","brand_competition","commercial_supply","competitor_density",
    "building_rooftop_2_5m","building_density","building_surface","building_height","building_volume","building_function",
    "building_age","building_quality","building_style","nonresidential_built_form","settlement_extent","building_change",
    "land_cover_10m","near_real_time_built_probability","urban_change","night_activity_proxy","road_accessibility","walking_accessibility",
    "driving_accessibility","public_transit_accessibility","real_time_traffic","public_transit_feed_availability",
    "synthetic_mobility_prior","project_pipeline_web_signal","commercial_open_close_web_signal",
    "planning_policy_web_signal","retail_rent_web_signal","investment_activity_web_signal","spatial_quality_provenance"
  ],
  analysis_families:[
    "site_selection","trade_area","market_potential","retail_gap","white_space","competition","cannibalization_proxy",
    "accessibility","territory_design","location_allocation","logistics_network","urban_change","real_estate_potential",
    "commercial_supply_pipeline","brand_expansion","project_screening","scenario_analysis"
  ],
  reusable_compute_primitives:[
    "commercial_spatial_fusion","spatial_feature_fusion","site_ranking","white_space","facility_location","vrp","resource_allocation",
    "change_point","effect_estimation","multinomial_logit","sobol","network_analysis","optimization","causal","simulation","geospatial"
  ],
  limitations:[
    "no-observed-phone-footfall-without-a-separately-approved-source",
    "no-observed-dwell-time-or-origin-destination-mobile-signaling",
    "no-observed-cross-mall-audience-overlap",
    "no-payment-card-spend-or-private-income-profile",
    "web-search-signals-are-market-evidence-not-human-mobility-ground-truth",
    "open-data-and-modelled-proxies-must-not-be-presented-as-baidu-huiyan-or-tencent-location-ground-truth"
  ]
});

export function geospatialCommercialManifest(){return GEOSPATIAL_COMMERCIAL_DOMAIN;}
