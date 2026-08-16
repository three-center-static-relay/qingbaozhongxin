const TIMEOUT_MS=12000,MAX_JSON_BYTES=1000000;
const text=(v,n=300)=>String(v??"").trim().slice(0,n);
function fail(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function point(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))fail("INVALID_COORDINATE");const[lat,lng]=s.split(",").map(Number);if(lat<-90||lat>90||lng<-180||lng>180)fail("INVALID_COORDINATE");return{lat,lng,s:`${lat},${lng}`}}
function tileLower(v,axis){let x=Number(v);if(!Number.isFinite(x))fail("INVALID_COORDINATE");const max=axis==="lat"?90:180,min=-max;if(x<min||x>max)fail("INVALID_COORDINATE");if(x===max)x-=1e-9;return Math.floor(x/3)*3}
function tileIdFromPoint(p){const lat=tileLower(p.lat,"lat"),lng=tileLower(p.lng,"lng"),la=`${lat>=0?"N":"S"}${String(Math.abs(lat)).padStart(2,"0")}`,lo=`${lng>=0?"E":"W"}${String(Math.abs(lng)).padStart(3,"0")}`;return`${la}${lo}`}
function clamp(v,min,max,d){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d}
function bbox(v){const a=Array.isArray(v)?v.map(Number):String(v||"").split(",").map(Number);if(a.length!==4||a.some(x=>!Number.isFinite(x)))fail("INVALID_BBOX");const[minLon,minLat,maxLon,maxLat]=a;if(minLon<-180||maxLon>180||minLat<-90||maxLat>90||minLon>=maxLon||minLat>=maxLat)fail("INVALID_BBOX");return a.join(",")}
async function readJson(r){const raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_JSON_BYTES)fail("UPSTREAM_RESPONSE_TOO_LARGE",502);let body;try{body=raw?JSON.parse(raw):null}catch{fail("UPSTREAM_BAD_JSON",502,{http_status:r.status})}if(!r.ok)fail(r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":"UPSTREAM_HTTP_ERROR",r.status===401||r.status===403?503:502,{http_status:r.status,message:text(body?.message||body?.detail||body?.error,300)});return body}
async function getJson(url,headers={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await readJson(await fetch(url,{headers:{accept:"application/json",...headers},signal:c.signal}))}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(t)}}
async function rangeProbe(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{headers:{range:"bytes=0-31"},signal:c.signal}),ok=r.status===200||r.status===206;try{await r.body?.cancel()}catch{}return{reachable:ok,http_status:r.status,content_type:r.headers.get("content-type"),content_range:r.headers.get("content-range"),etag:r.headers.get("etag"),last_modified:r.headers.get("last-modified"),range_probe:true,bytes_requested:32}}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(t)}}
function worldcoverInfo(args){const p=point(args.location),year=Number(args.year)===2020?2020:2021,version=year===2020?"v100":"v200",tile=tileIdFromPoint(p),file=`ESA_WorldCover_10m_${year}_${version}_${tile}_Map.tif`,url=`https://esa-worldcover.s3.eu-central-1.amazonaws.com/${version}/${year}/map/${file}`;return{location:p.s,year,version,tile,file,url,resolution_m:10,classes:11,crs:"EPSG:4326",license:"CC-BY-4.0",observed_mobile_lbs:false,change_warning:"2020-v100 and 2021-v200 use different algorithm versions; differences are not pure land-cover change"}}
async function worldcoverProbe(args){const info=worldcoverInfo(args);return{...info,...await rangeProbe(info.url)}}

const SOURCE_INFO=Object.freeze({
  sinolc1_china:{provider:"sinolc1_china",coverage:"China",resolution_m:1,role:"micro-scale-land-cover-and-urban-form",license:"CC-BY-4.0",endpoint:"https://www.ncdc.ac.cn/portal/metadata/643d320b-315a-4984-868b-be6aae30da55",archive_doi:"10.5281/zenodo.8214871",access:"open-data; login may be required to download",evidence_kind:"modelled/remote-sensing",bounded_runtime:"metadata only in Worker; AOI tile extraction in compute staging"},
  cmtbh30_china:{provider:"cmtbh30_china",coverage:"China",resolution_m:30,years:[2005,2010,2015,2020],role:"vertical-urban-growth-and-building-height-change",license:"CC-BY-4.0",endpoint:"https://api.figshare.com/v2/articles/26840626",evidence_kind:"modelled",bounded_runtime:"metadata in Worker; AOI raster windows in compute staging"},
  glo3d_building_footprints:{provider:"glo3d_building_footprints",coverage:"global",year:2020,role:"individual-building-footprint-height",license:"CC-BY-4.0",endpoint:"https://figshare.com/articles/dataset/3D-GloBFP_the_first_global_three-dimensional_building_footprint_dataset_PART_grid_ID_0-400_/28879733",grid_index_doi:"10.5281/zenodo.11319912",evidence_kind:"modelled",bounded_runtime:"grid index then intersecting tiles only"},
  geolink_uv_china:{provider:"geolink_uv_china",coverage:"342 Chinese cities",year:"circa-2023",role:"urban-village-and-renewal-opportunity-screening",endpoint:"https://zenodo.org/api/records/18688062",evidence_kind:"modelled",license_policy:"read and persist release license metadata before binary ingest; fail closed if incompatible/unknown"},
  planetary_computer:{provider:"planetary_computer",coverage:"global",role:"public-STAC-earth-observation-backup",endpoint:"https://planetarycomputer.microsoft.com/api/stac/v1",access:"anonymous public STAC; most downloads anonymous but throttled",bounded_runtime:"collection/bbox/time-bounded discovery only"},
  copernicus_dataspace_stac:{provider:"copernicus_dataspace_stac",coverage:"global",role:"official-Sentinel-STAC",endpoint:"https://stac.dataspace.copernicus.eu/v1/",license:"Copernicus Sentinel free/full/open with attribution",access:"free core service with fair-use quotas",bounded_runtime:"collection/bbox/time-bounded discovery only"},
  geofabrik_osm_china:{provider:"geofabrik_osm_china",coverage:"China",role:"daily-OSM-network-building-POI-backup-and-routing-graph-input",endpoint:"https://download.geofabrik.de/asia/china-latest.osm.pbf",license:"ODbL-1.0",evidence_kind:"community-observed/mapped",bounded_runtime:"32-byte reachability probe in Worker; full PBF only external/compute staging"},
  kontur_population:{provider:"kontur_population",coverage:"global",resolution:"400m H3",role:"population-density-crosscheck-for-site-selection",endpoint:"https://www.kontur.io/datasets/",license:"CC-BY",commercial_use:true,access:"free downloadable H3 dataset; paid API disabled",evidence_kind:"modelled/derived"},
  transitland_free:{provider:"transitland_free",coverage:"global where feeds exist",role:"current-transit-feed-stop-route-backup",endpoint:"https://transit.land/api/v2/rest",access:"free API key",free_tier:"10000 REST requests/month; 1000 routing requests/month",license_policy:"filter source feeds by license metadata; no historical/bulk paid products"}
});

async function sourceProbe(provider){
  if(provider==="cmtbh30_china")return{...SOURCE_INFO[provider],metadata:await getJson(SOURCE_INFO[provider].endpoint)};
  if(provider==="geolink_uv_china")return{...SOURCE_INFO[provider],metadata:await getJson(SOURCE_INFO[provider].endpoint)};
  if(provider==="planetary_computer")return{...SOURCE_INFO[provider],metadata:await getJson(`${SOURCE_INFO[provider].endpoint}/collections?limit=1`)};
  if(provider==="copernicus_dataspace_stac")return{...SOURCE_INFO[provider],metadata:await getJson(`${SOURCE_INFO[provider].endpoint}collections`)};
  if(provider==="geofabrik_osm_china")return{...SOURCE_INFO[provider],probe:await rangeProbe(SOURCE_INFO[provider].endpoint)};
  return SOURCE_INFO[provider]
}
function transitlandUrl(operation,args){
  const u=new URL(`https://transit.land/api/v2/rest/${operation}`);u.searchParams.set("limit",String(clamp(args?.limit,1,50,20)));
  if(args?.search)u.searchParams.set("search",text(args.search,120));
  if(args?.bbox)u.searchParams.set("bbox",bbox(args.bbox));
  if(operation==="feeds"){
    if(args?.spec&&["gtfs","gtfs-rt","gbfs","mds"].includes(String(args.spec).toLowerCase()))u.searchParams.set("spec",String(args.spec).toLowerCase());
    u.searchParams.set("license_commercial_use_allowed","exclude_no");
    u.searchParams.set("license_create_derived_product","exclude_no");
  }
  if(operation==="stops"&&args?.location){const p=point(args.location);u.searchParams.set("lat",String(p.lat));u.searchParams.set("lon",String(p.lng));u.searchParams.set("radius",String(clamp(args.radius_m,1,10000,3000)));u.searchParams.set("license_commercial_use_allowed","exclude_no");}
  return u;
}
async function transitland(operation,args,env){const key=text(env?.TRANSITLAND_API_KEY,500);if(!key)fail("UPSTREAM_AUTH_FAILED",503,{missing:"TRANSITLAND_API_KEY"});const u=transitlandUrl(operation,args);const data=await getJson(u,{apikey:key});return{provider:"transitland_free",operation,free_tier_only:true,license_filtered:true,data}}

export const OPERATIONS={
  esa_worldcover:["tile_info","tile_probe"],
  sinolc1_china:["source_info"],
  cmtbh30_china:["source_info","metadata_probe"],
  glo3d_building_footprints:["source_info"],
  geolink_uv_china:["source_info","metadata_probe"],
  planetary_computer:["source_info","stac_probe"],
  copernicus_dataspace_stac:["source_info","stac_probe"],
  geofabrik_osm_china:["source_info","range_probe"],
  kontur_population:["source_info"],
  transitland_free:["source_info","feeds","stops"]
};
export async function runAdapter(provider,operation,args={},env={}){
  if(!OPERATIONS[provider]?.includes(operation))fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  if(provider==="esa_worldcover"){
    if(operation==="tile_info")return{provider,operation,public_open_data:true,data:worldcoverInfo(args)};
    if(operation==="tile_probe")return{provider,operation,public_open_data:true,data:await worldcoverProbe(args)};
  }
  if(provider==="transitland_free"){
    if(operation==="source_info")return{provider,operation,public_free_tier:true,data:SOURCE_INFO[provider]};
    return transitland(operation,args,env);
  }
  if(operation==="source_info")return{provider,operation,public_open_data:true,data:SOURCE_INFO[provider]};
  if(["metadata_probe","stac_probe","range_probe"].includes(operation))return{provider,operation,public_open_data:true,data:await sourceProbe(provider)};
  fail("ADAPTER_NOT_IMPLEMENTED",501);
}
export const __test={SOURCE_INFO,bbox,transitlandUrl,worldcoverInfo};
