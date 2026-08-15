import {CATALOG as EXISTING_CATALOG,EXCLUDED_PROVIDERS as EXISTING_EXCLUDED} from "./catalog-prelocation.js";
import {GLOBAL_HIGH_VALUE_CATALOG} from "./catalog-global-highvalue.js";
import {SPLUS_CATALOG} from "./catalog-splus.js";
export const CATALOG_VERSION="2026-08-15.28";
export const EXCLUDED_PROVIDERS=EXISTING_EXCLUDED;
export const CATALOG={
  ...EXISTING_CATALOG,
  ...GLOBAL_HIGH_VALUE_CATALOG,
  ...SPLUS_CATALOG,
  worldpop:{...EXISTING_CATALOG.worldpop,category:"population-open-global",access:"public",optional_secrets:["WORLDPOP_API_KEY"],adapter:"open_location.worldpop-v2",integration:"official-rest-v2",scope:"polygon-population-density-age-sex-2015-2030",endpoint:"https://api.worldpop.org/v2",free_tier:"1000-requests-per-day-anonymous;10000-with-free-approved-key",arbitrary_url:false},
  overture_maps:{...EXISTING_CATALOG.overture_maps,category:"open-global-poi-buildings-transport",access:"external-runtime",adapter:"open_location.source-info",integration:"official-cloud-geoparquet",scope:"places-buildings-transportation-divisions-base-gers",endpoint:"https://docs.overturemaps.org/getting-data/cloud-sources/",billing:"free-public-AWS-Azure-data",arbitrary_url:false},
  night_lights:{...EXISTING_CATALOG.night_lights,category:"open-global-activity-proxy",access:"external-runtime",adapter:"open_location.source-info",integration:"nasa-black-marble-vnp46a2",scope:"daily-global-500m-nighttime-activity-proxy",earth_engine_collection:"NASA/VIIRS/002/VNP46A2",billing:"NASA-data-free",arbitrary_url:false},
  ghsl:{category:"population-built-environment-global-official",access:"public",adapter:"open_location.source-info",integration:"eu-jrc-ghsl-open-data",scope:"population-built-surface-volume-height-function-settlement-urban-centres-functional-urban-areas",endpoint:"https://human-settlement.emergency.copernicus.eu/downloadWizard.php",license_note:"EU-reuse-with-source-acknowledgement",arbitrary_url:false},
  copernicus_lcfm:{category:"land-cover-urban-change-global-official",access:"public",adapter:"open_location.source-info",integration:"copernicus-land-monitoring-lcfm",scope:"global-10m-annual-land-cover-2020-2026",endpoint:"https://land.copernicus.eu/en/products/global-dynamic-land-cover",billing:"open-free",arbitrary_url:false},
  foursquare_os_places:{category:"open-global-commercial-poi",access:"public",optional_secrets:["FOURSQUARE_OS_PLACES_TOKEN"],adapter:"open_location.source-info",integration:"official-open-source-places",scope:"commercial-poi-categories-chains-deltas-corroboration",endpoint:"https://docs.foursquare.com/data-products/docs/access-fsq-os-places",license:"Apache-2.0",billing:"open-source-free",dedup_note:"corroboration-layer-only-do-not-double-count-overture-overlap",arbitrary_url:false},
  dlr_wsf:{category:"open-global-settlement-evolution-built-form",access:"public",adapter:"open_location.dlr-stac",integration:"official-dlr-eoc-stac+wms+downloads",scope:"settlement-mask-2019-settlement-evolution-1985-2015-built-form-crosscheck",endpoint:"https://geoservice.dlr.de/eoc/ogc/stac/v1",license_note:"WSF-2019-and-WSF-Evolution-CC-BY-4.0",arbitrary_url:false},
  nasa_cmr:{category:"nasa-earthdata-discovery",access:"public",adapter:"nasa.cmr-search",integration:"official-cmr-search",scope:"collections-granules-variables-services+high-value-presets:merra2,gpm-imerg,smap,ecostress,gedi,swot,grace-fo,tempo,sedac,black-marble,modis,viirs,landsat,ceres,airs,oco2-oco3,pace,icesat2,srtm,gldas,hls",endpoint:"https://cmr.earthdata.nasa.gov/search",billing:"public-free",arbitrary_url:false},
  nasa_stac:{category:"nasa-earthdata-stac",access:"public",adapter:"nasa.cmr-stac",integration:"official-cmr-stac",scope:"provider-catalogs-collections-items-spatiotemporal-search",endpoint:"https://cmr.earthdata.nasa.gov/stac",billing:"public-free",arbitrary_url:false},
  nasa_power:{category:"nasa-weather-climate-energy",access:"public",adapter:"nasa.power",integration:"official-power-rest",scope:"point-hourly-daily-monthly-climatology-solar-meteorology-energy-agriculture-infrastructure",endpoint:"https://power.larc.nasa.gov/api/",billing:"public-free",arbitrary_url:false},
  nasa_firms:{category:"nasa-near-real-time-fire-thermal-anomalies",access:"optional-key",secrets:["NASA_FIRMS_MAP_KEY"],adapter:"nasa.firms",integration:"official-firms-rest",scope:"countries-mapkey-status-data-availability-bounded-area-active-fire-burned-area",endpoint:"https://firms.modaps.eosdis.nasa.gov/api/",registration_url:"https://firms.modaps.eosdis.nasa.gov/api/map_key",free_tier:"5000-transactions-per-10-minute-window",arbitrary_url:false},
  nasa_gibs:{category:"nasa-satellite-imagery-visualization",access:"public",adapter:"nasa.gibs",integration:"official-gibs-wmts",scope:"worldview-imagery-layer-discovery-and-bounded-tile-url-generation",endpoint:"https://gibs.earthdata.nasa.gov/",billing:"public-free",arbitrary_url:false},
  nasa_harmony:{category:"nasa-earthdata-transformation",access:"optional-key",secrets:["NASA_EARTHDATA_TOKEN"],adapter:"nasa.harmony",integration:"official-harmony-api",scope:"collection-capabilities-subset-reproject-format-transform-discovery",endpoint:"https://harmony.earthdata.nasa.gov/",registration_url:"https://urs.earthdata.nasa.gov/",arbitrary_url:false},
  nasa_ads:{category:"nasa-literature-astronomy-physics",access:"key",secrets:["NASA_ADS_TOKEN"],adapter:"nasa.ads-search",integration:"official-ads-rest",scope:"astronomy-astrophysics-physics-literature-metadata-citations",endpoint:"https://api.adsabs.harvard.edu/v1/search/query",registration_url:"https://ui.adsabs.harvard.edu/user/settings/token",arbitrary_url:false}
};
function anyGroup(env,groups){return groups?.some(g=>g.every(k=>Boolean(env[k])))}
export function statusFor(env,name){
  const p=CATALOG[name];if(!p)return null;
  let configured=false;
  if(["public","external-runtime","external-mcp","external-source"].includes(p.access))configured=true;
  else if(p.secret_groups)configured=anyGroup(env,p.secret_groups);
  else if(p.access==="optional-key")configured=true;
  else configured=(p.secrets||[]).every(k=>Boolean(env[k]));
  return{configured,category:p.category,access:p.access,adapter:p.adapter,live_adapter:p.adapter!=="catalog-only"};
}
export function allStatuses(env){return Object.fromEntries(Object.keys(CATALOG).map(k=>[k,statusFor(env,k)]))}