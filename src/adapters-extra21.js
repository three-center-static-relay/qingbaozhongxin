const WORLDPOP_BASE="https://api.worldpop.org/v2";
const DLR_STAC_BASE="https://geoservice.dlr.de/eoc/ogc/stac/v1";
const TIMEOUT_MS=15000,MAX_RESPONSE_BYTES=1000000,MAX_GEOJSON_BYTES=220000,MAX_POINTS=6000;

const SOURCE_INFO={
  worldpop:{role:"polygon-population-and-demographics",access:"open-free",publisher:"WorldPop / University of Southampton",coverage:"global",auth:"none-required; optional free API key raises limits",endpoint:WORLDPOP_BASE,capabilities:["polygon-population","population-density","age-sex-pyramid"],years:"2015-2030",resolutions:["100m","1km"],anonymous_daily_limit:1000,api_key_daily_limit:10000,age_range_policy:"request-full-pyramid-then-aggregate-downstream-for-stability",arbitrary_url:false},
  ghsl:{
    provider:"ghsl",role:"population-built-environment-urban-structure",access:"open-free",publisher:"European Commission Joint Research Centre",coverage:"global",auth:"none",bulk_only:true,
    capabilities:["resident-population","residential-vs-nonresidential-built-surface","built-volume","building-height","building-function","settlement-classification","functional-urban-areas","urban-centre-indicators"],
    products:["GHS-POP R2023A","GHS-BUILT-S R2023A","GHS-BUILT-V R2023A","GHS-BUILT-H R2023A","GHS-BUILT-C R2023A","GHS-OBAT R2024A","GHS-SMOD R2023A","GHS-UCDB R2024A","GHS-FUA"],
    endpoint:"https://human-settlement.emergency.copernicus.eu/downloadWizard.php",license_note:"EU reuse allowed with source acknowledgement",arbitrary_url:false
  },
  copernicus_lcfm:{
    provider:"copernicus_lcfm",role:"annual-land-cover-urban-change",access:"open-free",publisher:"Copernicus Land Monitoring Service",coverage:"global",auth:"none-for-public-product-metadata; CDSE account may be used for bulk delivery",bulk_only:true,
    capabilities:["10m-land-cover","urbanisation-change","annual-land-cover-series"],
    products:["Global Dynamic Land Cover 10m annual service 2020-2026"],
    endpoint:"https://land.copernicus.eu/en/products/global-dynamic-land-cover",arbitrary_url:false
  },
  overture_maps:{
    provider:"overture_maps",role:"poi-buildings-roads-divisions",access:"open-free",publisher:"Overture Maps Foundation",coverage:"global",auth:"none-for-public-AWS/Azure",bulk_only:true,
    capabilities:["places","buildings","transportation","divisions","base","GERS"],
    endpoint:"https://docs.overturemaps.org/getting-data/cloud-sources/",cloud_access:"AWS S3/Azure GeoParquet; query with DuckDB/CLI",arbitrary_url:false
  },
  night_lights:{
    provider:"night_lights",role:"daily-human-activity-proxy",access:"open-free",publisher:"NASA LAADS DAAC",coverage:"global",auth:"none-through-existing-Earth-Engine-catalog; NASA direct access may require Earthdata",bulk_only:true,
    capabilities:["daily-nighttime-light","activity-trend-proxy","nighttime-urban-intensity"],
    dataset:"NASA/VIIRS/002/VNP46A2",resolution_m:500,cadence:"daily",arbitrary_url:false
  },
  foursquare_os_places:{
    provider:"foursquare_os_places",role:"open-commercial-poi-corroboration",access:"open-free",publisher:"Foursquare",coverage:"global",auth:"free-portal-token-for-Iceberg",bulk_only:true,
    capabilities:["commercial-poi","categories","chains","place-status","monthly-deltas"],
    license:"Apache-2.0",portal:"https://places.foursquare.com/",docs:"https://docs.foursquare.com/data-products/docs/access-fsq-os-places",arbitrary_url:false,
    caution:"corroborating POI layer; do not double-count records also sourced through Overture"
  },
  dlr_wsf:{
    provider:"dlr_wsf",role:"settlement-extent-growth-and-built-form-crosscheck",access:"open-free",publisher:"German Aerospace Center (DLR/EOC)",coverage:"global",auth:"none",bulk_only:false,
    capabilities:["10m-settlement-mask-2019","30m-annual-settlement-evolution-1985-2015","90m-building-area-height-volume-fraction"],
    stac:DLR_STAC_BASE,collections:["WSF_2019","WSF_Evolution"],license_note:"WSF 2019 and WSF Evolution are CC-BY-4.0; verify dataset-specific terms for other WSF products",arbitrary_url:false
  }
};
Object.freeze(SOURCE_INFO);

function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function boundedText(v,n=400){return String(v??"").slice(0,n)}
function validateGeoJSON(g){
  if(!g||typeof g!=="object")err("ARG_REQUIRED:geojson");
  const geom=g.type==="Feature"?g.geometry:g;
  if(!geom||!["Polygon","MultiPolygon"].includes(geom.type)||!Array.isArray(geom.coordinates))err("INVALID_GEOJSON",400,{allowed:["Polygon","MultiPolygon","Feature<Polygon|MultiPolygon>"]});
  const raw=JSON.stringify(geom);if(new TextEncoder().encode(raw).length>MAX_GEOJSON_BYTES)err("GEOJSON_TOO_LARGE",413);
  let points=0;
  const walk=x=>{if(Array.isArray(x)&&x.length>=2&&typeof x[0]==="number"&&typeof x[1]==="number"){const lon=x[0],lat=x[1];if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -180||lon>180||lat< -90||lat>90)err("INVALID_COORDINATE");if(++points>MAX_POINTS)err("GEOJSON_TOO_MANY_POINTS",413);return}if(!Array.isArray(x))err("INVALID_GEOJSON");for(const y of x)walk(y)};
  walk(geom.coordinates);if(points<4)err("INVALID_GEOJSON");return geom;
}
function year(v){const n=Number(v);if(!Number.isInteger(n)||n<2015||n>2030)err("INVALID_YEAR",400,{allowed:"2015-2030"});return n}
function resolution(v){const s=String(v||"100m");if(!["100m","1km"].includes(s))err("INVALID_RESOLUTION",400,{allowed:["100m","1km"]});return s}
function ageRange(v){if(v!==undefined)err("AGE_RANGE_NOT_SUPPORTED_USE_FULL_PYRAMID",400,{reason:"WorldPop current production datasets may reject non-standard age-band boundaries; request the full pyramid and aggregate downstream"});return undefined}
function sex(v){const s=String(v||"both").toLowerCase();if(!["male","female","both"].includes(s))err("INVALID_SEX");return s}
function taskId(v){const s=String(v||"").trim();if(!/^[A-Za-z0-9-]{8,100}$/.test(s))err("INVALID_TASK_ID");return s}

async function readBounded(r){
  const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_RESPONSE_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502);
  if(!r.body)return"";const reader=r.body.getReader(),chunks=[];let total=0;
  try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_RESPONSE_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502)}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}
  const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)
}
async function requestJson(url,init={}){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{
    const r=await fetch(url,{...init,signal:c.signal}),raw=await readBounded(r);let body;try{body=raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502,{http_status:r.status})}
    if(!r.ok)err(r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":"UPSTREAM_HTTP_ERROR",r.status===401||r.status===403?503:502,{http_status:r.status,message:boundedText(body?.detail||body?.message||body?.error,300)});
    return body
  }catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}
}
async function worldpop(operation,args,env){
  const headers={accept:"application/json"};const key=String(env?.WORLDPOP_API_KEY||"").trim();if(key)headers["X-API-Key"]=key;
  if(operation==="task_status")return{provider:"worldpop",operation,result:await requestJson(`${WORLDPOP_BASE}/tasks/${encodeURIComponent(taskId(args?.task_id))}`,{headers})};
  const geojson=validateGeoJSON(args?.geojson),payload={geojson,year:year(args?.year),resolution:resolution(args?.resolution)};
  if(operation==="agesex_submit"){ageRange(args?.age_range);payload.sex=sex(args?.sex)}
  const path=operation==="population_submit"?"population":operation==="agesex_submit"?"agesex":null;if(!path)err("ADAPTER_OPERATION_NOT_APPROVED",403);
  headers["content-type"]="application/json";const body=await requestJson(`${WORLDPOP_BASE}/${path}`,{method:"POST",headers,body:JSON.stringify(payload)});
  return{provider:"worldpop",operation,authenticated:Boolean(key),result:body}
}
async function dlr(operation,args){
  if(operation==="source_info")return SOURCE_INFO.dlr_wsf;
  if(operation!=="collection_get")err("ADAPTER_OPERATION_NOT_APPROVED",403);
  const id=String(args?.collection||"");if(!SOURCE_INFO.dlr_wsf.collections.includes(id))err("INVALID_COLLECTION",400,{allowed:SOURCE_INFO.dlr_wsf.collections});
  const body=await requestJson(`${DLR_STAC_BASE}/collections/${encodeURIComponent(id)}`,{headers:{accept:"application/json"}});return{provider:"dlr_wsf",operation,collection:id,result:body}
}

export const OPERATIONS={
  worldpop:["population_submit","agesex_submit","task_status","source_info"],
  ghsl:["source_info"],copernicus_lcfm:["source_info"],overture_maps:["source_info"],night_lights:["source_info"],foursquare_os_places:["source_info"],dlr_wsf:["source_info","collection_get"]
};
export async function runAdapter(provider,operation,args={},env={}){
  if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403);
  if(provider==="worldpop"){if(operation==="source_info")return{...SOURCE_INFO.worldpop,provider:"worldpop"};return worldpop(operation,args,env)}
  if(provider==="dlr_wsf")return dlr(operation,args);
  return SOURCE_INFO[provider]
}
export const __test={validateGeoJSON,year,resolution,ageRange,sex,taskId,SOURCE_INFO};
