export const COMMERCIAL_SPATIAL_PUBLIC_ANCHORS_VERSION="commercial-spatial-public-anchors-v1-20260817";

export const COMMERCIAL_SPATIAL_PUBLIC_ANCHORS=Object.freeze({
  version:COMMERCIAL_SPATIAL_PUBLIC_ANCHORS_VERSION,
  purpose:"Fixed public-source anchors for calibrating commercial spatial models. Public publication does not imply phone-LBS equivalence.",
  admission:{official_public_source:true,unauthenticated_publication_preferred:true,fixed_host_and_path:true,public_observation_or_primary_record:true,phone_lbs_equivalent:false},
  sources:{
    fuzhou_land_transactions:{
      publisher:"福州市自然资源和规划局",host:"zygh.fuzhou.gov.cn",path_prefixes:["/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrjggb/","/zwgk/ggzypz/tdsyqcr/"],
      evidence_kind:"observed",refresh:"event-driven-publication",metrics:["parcel_id","parcel_location","area_mu","land_use","starting_price_cny_10k","transaction_price_cny_10k","winner","publication_date"],
      commercial_use:["land_supply","future_commercial_supply","developer_activity","land_price_signal","urban_change"],
      examples:["https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrjggb/202607/t20260720_5348174.htm","https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrjggb/202605/t20260520_5324249.htm"]
    },
    fuzhou_project_pipeline:{
      publisher:"福州市发展和改革委员会",host:"fgw.fuzhou.gov.cn",path_prefixes:["/zfxxgkzl/zfxxgkml/zdjsxmdpzhssqk/","/fgwzwgk/fzgh/"],
      evidence_kind:"observed",refresh:"event-driven-publication",metrics:["project_name","project_code","location","road_length","road_width","design_speed","investment_cny_10k","construction_scope","approval_date"],
      commercial_use:["future_accessibility","infrastructure_pipeline","urban_expansion","future_supply","site_scenario"],
      examples:["https://fgw.fuzhou.gov.cn/zfxxgkzl/zfxxgkml/zdjsxmdpzhssqk/202606/t20260625_5338156.htm","https://fgw.fuzhou.gov.cn/fgwzwgk/fzgh/202602/t20260224_5287746.htm"]
    },
    fujian_statistics:{
      publisher:"福建省统计局",host:"tjj.fujian.gov.cn",path_prefixes:["/xxgk/jdsj/","/xxgk/tjxx/jjyxqk/"],evidence_kind:"observed",refresh:"monthly-quarterly-annual",
      metrics:["gdp","sector_value_added","wholesale_retail","transport_storage_post","accommodation_catering","finance","real_estate","growth_rate"],commercial_use:["macro_demand","sector_cycle","commercial-demand-calibration"],
      examples:["https://tjj.fujian.gov.cn/xxgk/jdsj/202607/t20260722_7190778.htm"]
    },
    fujian_transport_statistics:{
      publisher:"福建省交通运输厅",host:"jtyst.fujian.gov.cn",path_prefixes:["/zwgk/tjxx/"],evidence_kind:"observed",refresh:"monthly",
      metrics:["urban_public_transport_passenger_volume","rail_passenger_volume","highway_vehicle_flow","freight_vehicle_flow","passenger_vehicle_flow","transport_investment"],
      commercial_use:["regional_mobility_anchor","temporal_activity_calibration","transport-demand-context"],examples:["https://jtyst.fujian.gov.cn/zwgk/tjxx/"]
    }
  },
  candidate_source_classes:{
    public_parking:{status:"candidate-requires-fixed-public-endpoint-verification",desired_metrics:["remaining_spaces","occupancy","entry_exit_count","timestamp"]},
    scenic_visitation:{status:"candidate-requires-fixed-public-endpoint-verification",desired_metrics:["visitor_count","time_bucket","origin_aggregate","dwell_aggregate"]},
    public_transit_operations:{status:"candidate-requires-fixed-public-endpoint-verification",desired_metrics:["route","stop","vehicle_or_trip_aggregate","passenger_volume","timestamp"]},
    shared_bike:{status:"candidate-requires-fixed-public-endpoint-verification",desired_metrics:["order_count","origin_grid","destination_grid","time_bucket"]}
  },
  evidence_boundaries:{public_aggregate_mobility_is_phone_lbs:false,land_transaction_is_footfall:false,project_approval_is_realized_accessibility:false,regional_transport_is_site_footfall:false,model_calibration_required:true},
  collection_policy:{allowlisted_hosts_only:true,cache_first:true,incremental:true,low_frequency:true,hash_every_document:true,parser_drift_fail_closed:true,no_login_bypass:true,no_captcha_bypass:true,no_anti_bot_evasion:true}
});

export function commercialSpatialPublicAnchorRegistry(){return COMMERCIAL_SPATIAL_PUBLIC_ANCHORS;}
