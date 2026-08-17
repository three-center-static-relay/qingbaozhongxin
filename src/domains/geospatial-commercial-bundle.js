import {GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION} from "./geospatial-commercial.js";

async function sha256(value){
  const raw=JSON.stringify(value),h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export const OPERATIONS={geospatial_commercial:["point_context"]};

export async function buildPointContext(args={},env={},dispatch){
  const location=String(args.location||"").trim();
  if(!location)throw Object.assign(new Error("INVALID_COORDINATE"),{status:400});
  const anchor={location,domain_version:GEOSPATIAL_COMMERCIAL_DOMAIN_VERSION};
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
    source_receipts:[{source:"diagnostic-anchor",digest_sha256:await sha256(anchor),evidence_kind:"derived"}],
    normalization_required_for_compute:true,
    diagnostic_stub:true
  };
}
