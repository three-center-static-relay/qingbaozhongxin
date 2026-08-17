import {GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION} from "./geospatial-commercial.js";

export const OPERATIONS={geospatial_commercial:["point_context"]};

export async function buildPointContext(args={},env={},dispatch){
  const location=String(args.location||"").trim();
  if(!location)throw Object.assign(new Error("INVALID_COORDINATE"),{status:400});
  return{
    provider:"geospatial_commercial",
    operation:"point_context",
    domain_version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION,
    free_only:true,
    location,
    observed_mobile_lbs:false,
    real_footfall:false,
    paid_fallback:false,
    arbitrary_url:false,
    layer_count:0,
    successful_layers:0,
    layers:[],
    source_receipts:[],
    normalization_required_for_compute:true,
    diagnostic_stub:true
  };
}
