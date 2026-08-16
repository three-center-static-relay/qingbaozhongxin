const TIMEOUT_MS=12000,MAX_JSON_BYTES=1000000;
const text=(v,n=300)=>String(v??"").trim().slice(0,n);
const clamp=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):d};
function fail(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function point(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))fail("INVALID_COORDINATE");const[lat,lng]=s.split(",").map(Number);if(lat<-90||lat>90||lng<-180||lng>180)fail("INVALID_COORDINATE");return{lat,lng,s:`${lat},${lng}`}}
function id(v,name){const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>2147483647)fail(`INVALID_${name.toUpperCase()}`);return n}
function iso2(v){if(v===undefined||v===null||v==="")return"";const s=String(v).trim().toUpperCase();if(!/^[A-Z]{2}$/.test(s))fail("INVALID_COUNTRY_CODE");return s}
async function jsonFetch(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,headers:{accept:"application/json",...(init.headers||{})},signal:c.signal}),raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_JSON_BYTES)fail("UPSTREAM_RESPONSE_TOO_LARGE",502);let body;try{body=raw?JSON.parse(raw):null}catch{fail("UPSTREAM_BAD_JSON",502)}if(!r.ok)fail("UPSTREAM_HTTP_ERROR",r.status===401||r.status===403?503:502,{http_status:r.status,body});return body}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(t)}}
function openaqKey(env){const k=text(env.OPENAQ_API_KEY,4096);if(!k)fail("UPSTREAM_AUTH_FAILED",503);return k}
async function openaq(path,params,env){const u=new URL(`https://api.openaq.org/v3/${path}`);for(const[k,v]of Object.entries(params||{}))if(v!==undefined&&v!==null&&String(v)!=="")u.searchParams.set(k,String(v));return jsonFetch(u,{headers:{"X-API-Key":openaqKey(env)}})}
function tileLower(v,axis){let x=Number(v);if(!Number.isFinite(x))fail("INVALID_COORDINATE");const max=axis==="lat"?90:180,min=-max;if(x<min||x>max)fail("INVALID_COORDINATE");if(x===max)x-=1e-9;return Math.floor(x/3)*3}
function tileIdFromPoint(p){const lat=tileLower(p.lat,"lat"),lng=tileLower(p.lng,"lng"),la=`${lat>=0?"N":"S"}${String(Math.abs(lat)).padStart(2,"0")}`,lo=`${lng>=0?"E":"W"}${String(Math.abs(lng)).padStart(3,"0")}`;return`${la}${lo}`}
function worldcoverInfo(args){const p=point(args.location),year=Number(args.year)===2020?2020:2021,version=year===2020?"v100":"v200",tile=tileIdFromPoint(p),file=`ESA_WorldCover_10m_${year}_${version}_${tile}_Map.tif`,url=`https://esa-worldcover.s3.eu-central-1.amazonaws.com/${version}/${year}/map/${file}`;return{location:p.s,year,version,tile,file,url,resolution_m:10,classes:11,crs:"EPSG:4326",license:"CC-BY-4.0",observed_mobile_lbs:false,change_warning:"2020-v100 and 2021-v200 use different algorithm versions; differences are not pure land-cover change"}}
async function worldcoverProbe(args){const info=worldcoverInfo(args),c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(info.url,{headers:{range:"bytes=0-31"},signal:c.signal});const ok=r.status===200||r.status===206;try{await r.body?.cancel()}catch{}return{...info,reachable:ok,http_status:r.status,content_type:r.headers.get("content-type"),content_range:r.headers.get("content-range"),etag:r.headers.get("etag"),range_probe:true,bytes_requested:32}}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(t)}}
export const OPERATIONS={openaq:["locations_nearby","location_latest"],esa_worldcover:["tile_info","tile_probe"]};
export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  if(provider==="openaq"){
    if(operation==="locations_nearby"){const p=point(args.location),radius=clamp(args.radius_m,100,25000,3000),limit=clamp(args.limit,1,100,20);return{provider,operation,free_tier_only:true,data:await openaq("locations",{coordinates:p.s,radius,limit,page:1,iso:iso2(args.country),monitor:args.monitor===false?"false":"true",mobile:args.mobile===true?"true":"false"},env)}}
    if(operation==="location_latest"){const locationId=id(args.location_id,"location_id"),limit=clamp(args.limit,1,100,100);return{provider,operation,free_tier_only:true,data:await openaq(`locations/${locationId}/latest`,{limit,page:1},env)}}
  }
  if(provider==="esa_worldcover"){
    if(operation==="tile_info")return{provider,operation,public_open_data:true,data:worldcoverInfo(args)};
    if(operation==="tile_probe")return{provider,operation,public_open_data:true,data:await worldcoverProbe(args)};
  }
  fail("ADAPTER_NOT_IMPLEMENTED",501);
}
