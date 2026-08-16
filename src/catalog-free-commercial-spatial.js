export const FREE_COMMERCIAL_SPATIAL_CATALOG={
  baidu_maps:{
    category:"maps-cn-free-tier",
    access:"key",
    secret_groups:[["BAIDU_MAP_AK"],["BAIDU_MAP_API_KEY"]],
    adapter:"baidu_maps.geocode+reverse+free-traffic",
    integration:"official-web-api",
    scope:"geocode-reverse-and-base-real-time-traffic-only",
    free_tier:"personal-default-traffic-quota-2000-per-day-3qps-as-of-2026-08",
    billing_policy:"free-default-quota-only; paid quota packs and advanced traffic_detail disabled",
    arbitrary_url:false
  },
  h3:{
    category:"spatial-index-local-free",
    access:"public",
    adapter:"h3.local",
    integration:"h3-js-4.5.0",
    scope:"latlng-cell-boundary-neighborhood-polygon-grid",
    license:"Apache-2.0",
    billing:"local-compute-only-no-api-fee",
    arbitrary_url:false
  },
  openrouteservice:{
    category:"routing-accessibility-free-tier",
    access:"key",
    secret_groups:[["OPENROUTESERVICE_API_KEY"],["ORS_API_KEY"]],
    adapter:"openrouteservice.free-standard",
    integration:"official-v2-rest",
    scope:"isochrones-and-matrix-only",
    endpoint:"https://api.openrouteservice.org",
    free_tier:"Standard-0-EUR; isochrones-500-day; matrix-500-day-as-of-2026-08",
    billing_policy:"free-standard-only; no automatic paid upgrade",
    arbitrary_url:false
  },
  osm_overpass:{
    category:"osm-readonly-commercial-semantics-free",
    access:"public",
    adapter:"osm_overpass.fixed-nearby",
    integration:"OSM-Wiki-listed-public-overpass-instance",
    scope:"fixed-commercial-transit-feature-categories-within-1500m",
    endpoint:"https://overpass.private.coffee/api/interpreter",
    billing:"public-free",
    upstream_policy:"use only the fixed Cloudflare-reachable public instance; overpass-api.de removed after production HTTP-521 E2E failure",
    fair_use:"single-active-task; no parallel queries; <=200 elements; <=1500m; no arbitrary Overpass QL",
    arbitrary_url:false
  },
  worldmove:{
    category:"open-synthetic-human-mobility",
    access:"public",
    adapter:"worldmove.official-open-data",
    integration:"WorldMove-official-Figshare-static-archive+GitHub-model",
    scope:"source-info-and-official-Figshare-download-index",
    endpoint:"https://api.figshare.com/v2/articles/30023491",
    archive_doi:"10.6084/m9.figshare.30023491",
    billing:"open-access",
    upstream_policy:"Cloudflare reads only the fixed Figshare public API archive; blocked/timeout Tsinghua web download path is not used",
    evidence_policy:"synthetic-mobility-prior-only; never label as observed phone footfall",
    arbitrary_url:false
  }
};
