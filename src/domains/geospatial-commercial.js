export const GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION="geospatial-commercial-v5-20260816";

export const GEOSPATIAL_COMMERCIAL_DOMAIN=Object.freeze({
  id:"geospatial-commercial",
  version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION,
  purpose:"China-first commercial geospatial decision-intelligence branch using durable free map, population, building, mobility, transport, earth-observation and open spatial-data capabilities.",
  free_only:true,
  benchmark_target:{
    reference_products:["Baidu Huiyan commercial-geospatial","Tencent LBS commercial/mall analytics"],
    target_scope:[
      "site-selection","trade-area","market-potential","retail-gap","white-space","competition",
      "accessibility","commercial-supply","project-pipeline","urban-form","population-market","traffic-context"
    ],
    parity_rule:"Never claim parity for observed phone footfall, dwell time, mobile OD, cross-mall audience overlap, or private consumer profiles without a separately approved observed-LBS source."
  },
  discovery_policy:{
    professional_web_branch:"professional-web-intelligence",
    discovery_search_tools:["exa","tavily","firecrawl","jina"],
    workflow:"exa.search + tavily.search + firecrawl.search for multi-round discovery; jina.read for deep reading/grounding of selected official pages",
    role:"temporary-global-tool-and-data-source-discovery-only",
    production_dependency:false,
    production_feature_source:false,
    rule:"Search/read tools discover candidate APIs, MCPs and datasets; candidates enter this domain only after independent official-source, license/commercial-use, free-access, China-coverage, stability and bounded-runtime validation."
  },
  admission_policy:{
    free_or_open_only:true,
    paid_fallback:false,
    free_trial_only_is_core:false,
    unclear_commercial_rights:"deny",
    unknown_license:"deny-binary-ingest",
    duplicate_low_value_source:"deny",
    public_demo_server_as_production_dependency:false
  },
  evidence_policy:{
    observed_vs_proxy_must_be_explicit:true,
    mobile_lbs_observed:false,
    payment_card_spend_observed:false,
    synthetic_mobility_is_observed_lbs:false,
    arbitrary_url_fetch:false,
    paid_fallback:false,
    walled_or_blocked_sources_are_not_core:true,
    source_provenance_required:true
  },
  provider_groups:{
    china_maps:["amap","baidu_maps","tencent_maps"],
    global_place_crosscheck:["geonames","wikidata","geofabrik_osm_china"],
    commercial_poi_crosscheck:["overture_maps","foursquare_os_places","geofabrik_osm_china"],
    spatial_index:["h3"],
    population_demography:["worldpop","ghsl","kontur_population"],
    buildings_urban_form:["cmab_china","cbra_china","microsoft_building_density_height","cmtbh30_china","glo3d_building_footprints","ghsl","dlr_wsf","overture_maps"],
    land_cover_change:["sinolc1_china","esa_worldcover","copernicus_lcfm","google_dynamic_world"],
    urban_renewal:["geolink_uv_china"],
    activity_proxies:["night_lights"],
    synthetic_mobility:["worldmove"],
    transit_discovery:["mobilitydatabase","transitland_free"],
    routing_accessibility:["amap","baidu_maps","tencent_maps","openrouteservice","valhalla_local","osrm_local"],
    earth_observation_discovery:["earthengine","google_earth_observation","planetary_computer","copernicus_dataspace_stac","nasa_cmr","nasa_stac","nasa_gibs"]
  },
  feature_layers:[
    "place_identity","administrative_hierarchy","population_total","age_sex_structure","population_density","population_h3_crosscheck",
    "poi_density","poi_mix","brand_presence","brand_competition","commercial_supply","competitor_density","poi_change_delta",
    "building_rooftop_2_5m","building_density","building_surface","building_height","building_volume","individual_building_height","building_function",
    "building_age","building_quality","building_style","nonresidential_built_form","settlement_extent","building_change","vertical_urban_growth",
    "land_cover_1m","land_cover_10m","near_real_time_built_probability","urban_change","urban_village_renewal_proxy","night_activity_proxy",
    "road_accessibility","walking_accessibility","driving_accessibility","public_transit_accessibility","real_time_traffic","public_transit_feed_availability",
    "synthetic_mobility_prior","spatial_quality_provenance"
  ],
  analysis_families:[
    "site_selection","trade_area","market_potential","retail_gap","white_space","competition","cannibalization_proxy",
    "accessibility","territory_design","location_allocation","logistics_network","urban_change","real_estate_potential","urban_renewal_opportunity",
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
    "free/open-data-and-modelled-proxies-must-not-be-presented-as-baidu-huiyan-or-tencent-location-ground-truth"
  ]
});

export function geospatialCommercialManifest(){return GEOSPATIAL_COMMERCIAL_DOMAIN;}
