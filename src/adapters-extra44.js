import {latLngToCell,cellToLatLng,cellToBoundary,gridDisk,polygonToCells,isValidCell} from "h3-js";

const ORS_BASE="https://api.openrouteservice.org";
const OVERPASS="https://overpass.private.coffee/api/interpreter";
const WORLDMOVE_API="https://api.figshare.com/v2/articles/30023491";
const WORLDMOVE_DOI="https://doi.org/10.6084/m9.figshare.30023491";
const TIMEOUT_MS=15000,MAX_BYTES=1200000;

const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
const text=(v,n=400)=>String(v??"").trim().slice(0,n);
function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function required(v,name,n=400){const s=text(v,n);if(!s)err(`ARG_REQUIRED:${name}`);return s}
function lonLat(v,name="location"){let a=v;if(typeof v==="string")a=v.split(",").map(Number);if(!Array.isArray(a)||a.length!==2)err(`INVALID_${name.toUpperCase()}`);const lon=Number(a[0]),lat=Number(a[1]);if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -180||lon>180||lat< -90||lat>90)err(`INVALID_${name.toUpperCase()}`);return[lon,lat]}
function locations(v,max=10){if(!Array.isArray(v)||v.length<1||v.length>max)err("INVALID_LOCATIONS",400,{max});return v.map((x,i)=>lonLat(x,`location_${i}`))}
function profile(v){const s=text(v||"driving-car",40);if(!["driving-car","foot-walking","cycling-regular"].includes(s))err("INVALID_PROFILE",400,{allowed:["driving-car","foot-walking","cycling-regular"]});return s}
async function bounded(r){const declared=Number(r.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>MAX_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502);const reader=r.body?.getReader?.();if(!reader)return"";const chunks=[];let total=0;try{for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502)}chunks.push(value)}}finally{try{reader.releaseLock()}catch{}}const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}return new TextDecoder().decode(out)}
async function request(url,init={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal}),raw=await bounded(r);if(!r.ok)err(r.status===401||r.status===403?"UPSTREAM_AUTH_FAILED":r.status===429?"UPSTREAM_RATE_LIMITED":"UPSTREAM_HTTP_ERROR",r.status===401||r.status===403?503:r.status===429?429:502,{http_status:r.status,message:text(raw,500)});return{response:r,raw}}catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}}
async function jsonRequest(url,init={}){const{raw}=await request(url,init);try{return raw?JSON.parse(raw):null}catch{err("UPSTREAM_BAD_JSON",502)}}

function h3Cell(v){const s=required(v,"cell",40);if(!isValidCell(s))err("INVALID_H3_CELL");return s}
function h3Run(operation,args){
  if(operation==="latlng_to_cell"){const[lon,lat]=lonLat(args?.location),resolution=clamp(args?.resolution,0,15,9);return{provider:"h3",operation,cell:latLngToCell(lat,lon,resolution),resolution}}
  if(operation==="cell_to_latlng"){const cell=h3Cell(args?.cell),[lat,lon]=cellToLatLng(cell);return{provider:"h3",operation,cell,location:[lon,lat]}}
  if(operation==="cell_to_boundary"){const cell=h3Cell(args?.cell);return{provider:"h3",operation,cell,boundary:cellToBoundary(cell).map(([lat,lon])=>[lon,lat])}}
  if(operation==="grid_disk"){const cell=h3Cell(args?.cell),k=clamp(args?.k,0,10,1),cells=gridDisk(cell,k);if(cells.length>500)err("H3_RESULT_TOO_LARGE",413);return{provider:"h3",operation,cell,k,cells}}
  if(operation==="polygon_to_cells"){const ring=args?.polygon;if(!Array.isArray(ring)||ring.length<4||ring.length>200)err("INVALID_POLYGON");const poly=ring.map((x,i)=>{const[lon,lat]=lonLat(x,`polygon_${i}`);return[lat,lon]});const resolution=clamp(args?.resolution,0,15,9),cells=polygonToCells(poly,resolution);if(cells.length>5000)err("H3_RESULT_TOO_LARGE",413,{max:5000});return{provider:"h3",operation,resolution,cells,count:cells.length}}
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

function orsKey(env){return text(env?.OPENROUTESERVICE_API_KEY||env?.ORS_API_KEY,500)}
async function orsRun(operation,args,env){const key=orsKey(env);if(!key)err("UPSTREAM_AUTH_FAILED",503,{missing:"OPENROUTESERVICE_API_KEY|ORS_API_KEY"});const p=profile(args?.profile);if(operation==="isochrones"){const locs=locations(args?.locations||[args?.location],2),range=clamp(args?.range_seconds,60,3600,900),body={locations:locs,range:[range],range_type:"time",attributes:["area"]};const data=await jsonRequest(`${ORS_BASE}/v2/isochrones/${p}`,{method:"POST",headers:{authorization:key,"content-type":"application/json",accept:"application/json"},body:JSON.stringify(body)});return{provider:"openrouteservice",operation,profile:p,range_seconds:range,data}}
  if(operation==="matrix"){const locs=locations(args?.locations,10),body={locations:locs,metrics:["duration","distance"],units:"m"};const data=await jsonRequest(`${ORS_BASE}/v2/matrix/${p}`,{method:"POST",headers:{authorization:key,"content-type":"application/json",accept:"application/json"},body:JSON.stringify(body)});return{provider:"openrouteservice",operation,profile:p,locations:locs.length,data}}
  err("ADAPTER_OPERATION_NOT_APPROVED",403)
}

const OVERPASS_CATEGORIES={
  retail:'nwr(around:R,LAT,LON)["shop"];',
  food:'nwr(around:R,LAT,LON)["amenity"~"restaurant|cafe|fast_food|bar|pub"];',
  transit:'nwr(around:R,LAT,LON)["public_transport"];nwr(around:R,LAT,LON)["railway"~"station|subway_entrance|tram_stop"];',
  parking:'nwr(around:R,LAT,LON)["amenity"="parking"];',
  education:'nwr(around:R,LAT,LON)["amenity"~"school|college|university|kindergarten"];',
  healthcare:'nwr(around:R,LAT,LON)["amenity"~"hospital|clinic|doctors|pharmacy"];',
  office:'nwr(around:R,LAT,LON)["office"];',
  tourism:'nwr(around:R,LAT,LON)["tourism"];'
};
async function overpassRun(args){const[lon,lat]=lonLat(args?.location),radius=clamp(args?.radius,50,1500,500),category=text(args?.category||"retail",40);if(!OVERPASS_CATEGORIES[category])err("INVALID_CATEGORY",400,{allowed:Object.keys(OVERPASS_CATEGORIES)});const q=`[out:json][timeout:10];(${OVERPASS_CATEGORIES[category].replaceAll("R",String(radius)).replaceAll("LAT",String(lat)).replaceAll("LON",String(lon))});out center tags qt 200;`;const body=new URLSearchParams({data:q}).toString(),data=await jsonRequest(OVERPASS,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json","user-agent":"three-center-intelligence/1.0 bounded-commercial-spatial"},body});const elements=Array.isArray(data?.elements)?data.elements.slice(0,200):[];return{provider:"osm_overpass",operation:"nearby_features",category,radius,location:[lon,lat],osm_base:data?.osm3s?.timestamp_osm_base||null,elements,count:elements.length,upstream:"overpass.private.coffee",policy:"fixed-query-template; serial; <=1500m; <=200 elements"}}

const WORLDMOVE_INFO={provider:"worldmove",role:"open-synthetic-human-mobility",publisher:"Tsinghua FIB Lab / WorldMove Team",access:"open-access",coverage:"1600+ cities / 179 countries",inputs:["WorldPop","POI","synthetic commuting OD"],use:"mobility prior and scenario simulation; never label as observed phone footfall",repository:"https://github.com/tsinghua-fib-lab/WorldMove",archive_doi:WORLDMOVE_DOI,archive_api:WORLDMOVE_API,archive_provider:"Figshare",arbitrary_url:false};
async function worldmoveRun(operation){if(operation==="source_info")return WORLDMOVE_INFO;if(operation==="download_index"){const data=await jsonRequest(WORLDMOVE_API,{headers:{accept:"application/json"}}),files=Array.isArray(data?.files)?data.files.slice(0,20).map(f=>({id:f?.id??null,name:text(f?.name,160),size:Number(f?.size)||null,mimetype:text(f?.mimetype,120)||null,md5:text(f?.computed_md5||f?.supplied_md5,64)||null,download_url:/^https:\/\/ndownloader\.figshare\.com\/files\/\d+$/.test(String(f?.download_url||""))?String(f.download_url):null})):[];return{...WORLDMOVE_INFO,operation,reachable:true,article_id:Number(data?.id)||30023491,figshare_url:text(data?.figshare_url,300)||null,files,count:files.length}}err("ADAPTER_OPERATION_NOT_APPROVED",403)}

export const OPERATIONS={
  h3:["latlng_to_cell","cell_to_latlng","cell_to_boundary","grid_disk","polygon_to_cells"],
  openrouteservice:["isochrones","matrix"],
  osm_overpass:["nearby_features"],
  worldmove:["source_info","download_index"]
};
export async function runAdapter(provider,operation,args={},env={}){if(!OPERATIONS[provider]?.includes(operation))err("ADAPTER_OPERATION_NOT_APPROVED",403,{provider,operation});if(provider==="h3")return h3Run(operation,args);if(provider==="openrouteservice")return orsRun(operation,args,env);if(provider==="osm_overpass")return overpassRun(args);if(provider==="worldmove")return worldmoveRun(operation);err("ADAPTER_NOT_IMPLEMENTED",501)}
