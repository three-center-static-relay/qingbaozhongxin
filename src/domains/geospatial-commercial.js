export const GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION="geospatial-commercial-v1-20260816";

export const GEOSPATIAL_COMMERCIAL_DOMAIN=Object.freeze({
  id:"geospatial-commercial",
  version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION,
  purpose:"Reusable commercial geospatial intelligence branch; one domain capability inside the wider multi-domain system.",
  free_only:true,
  evidence_policy:{
    observed_vs_proxy_must_be_explicit:true,
    mobile_lbs_observed:false,
    payment_card_spend_observed:false,
    arbitrary_url_fetch:false,
    paid_fallback:false,
    walled_or_blocked_sources_are_not_core:true
  },
  provider_groups:{
    china_maps:["amap","baidu_maps","tencent_maps"],
    global_geocoding:["geonames"],
    spatial_index:["h3"],
    population_demography:["worldpop"],
    buildings_urban_form:["ghsl","overture_maps","dlr_wsf"],
    land_cover_change:["copernicus_lcfm"],
    activity_proxies:["night_lights"],
    synthetic_mobility:["worldmove"],
    transit_discovery:["mobilitydatabase"],
    climate_environment:["nasa_power","gdacs"],
    earth_observation_discovery:["nasa_cmr","nasa_stac","nasa_gibs"],
    knowledge_crosscheck:["wikidata"]
  },
  feature_layers:[
    "place_identity","administrative_hierarchy","population_total","age_sex_structure","population_density",
    "poi_density","poi_mix","brand_competition","building_surface","building_volume","nonresidential_built_form",
    "settlement_extent","land_cover","urban_change","night_activity_proxy","road_accessibility","walking_accessibility",
    "driving_accessibility","real_time_traffic","public_transit_feed_availability","synthetic_mobility_prior",
    "weather_climate_context","hazard_context","earth_observation_change","spatial_quality_provenance"
  ],
  analysis_families:[
    "site_selection","trade_area","market_potential","retail_gap","white_space","competition","cannibalization",
    "accessibility","territory_design","location_allocation","logistics_network","urban_change","real_estate_potential",
    "risk_exposure","healthcare_location","infrastructure_location","scenario_analysis"
  ],
  reusable_compute_primitives:[
    "commercial_spatial_fusion","facility_location","vrp","resource_allocation","change_point","effect_estimation",
    "multinomial_logit","sobol","network_analysis","optimization","causal","simulation","geospatial"
  ],
  limitations:[
    "no-observed-phone-footfall-without-a-separately-approved-source",
    "no-observed-dwell-time-or-origin-destination-mobile-signaling",
    "no-payment-card-spend-or-private-income-profile",
    "open-data-proxies-must-not-be-presented-as-baidu-huiyan-or-tencent-location-ground-truth"
  ]
});

export function geospatialCommercialManifest(){return GEOSPATIAL_COMMERCIAL_DOMAIN;}
