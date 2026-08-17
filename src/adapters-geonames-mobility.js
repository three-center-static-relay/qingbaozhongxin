const TIMEOUT_MS=12000;
const MAX_BYTES=1500000;
const clean=(v,n=4096)=>String(v??"").trim().slice(0,n);
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const required=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||clean(v)==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
async function requestJson(url,init={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(url,{...init,headers:{accept:"application/json",...(init.headers||{})},signal:c.signal});
    const raw=await r.text();
    if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});
    let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502,details:{http_status:r.status}})}
    if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status,body}});
    return body;
  }catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}
  finally{clearTimeout(t)}
}
function country2(v){if(v===undefined||v===null||clean(v)==="")return"";const s=clean(v,2).toUpperCase();if(!/^[A-Z]{2}$/.test(s))throw Object.assign(new Error("INVALID_COUNTRY_CODE"),{status:400});return s}
function lat(v){const n=Number(v);if(!Number.isFinite(n)||n<-90||n>90)throw Object.assign(new Error("INVALID_LATITUDE"),{status:400});return n}
function lng(v){const n=Number(v);if(!Number.isFinite(n)||n<-180||n>180)throw Object.assign(new Error("INVALID_LONGITUDE"),{status:400});return n}
function geonamesUsername(env){const v=clean(env?.GEONAMES_USERNAME,120);if(!v)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503,details:{provider:"geonames",reason:"GEONAMES_USERNAME_MISSING"}});return v}
function ensureGeoNames(body){if(body?.status)throw Object.assign(new Error("UPSTREAM_BUSINESS_ERROR"),{status:502,details:{provider:"geonames",status:Number(body.status?.value)||null,message:clean(body.status?.message,300)||null}});return body}
async function geonames(operation,args={},env={}){
  const username=geonamesUsername(env);
  const endpoint={search:"searchJSON",nearby:"findNearbyPlaceNameJSON",admin:"hierarchyJSON",postal_search:"postalCodeSearchJSON",elevation:"srtm3JSON",timezone:"timezoneJSON",country_info:"countryInfoJSON"}[operation];
  if(!endpoint)throw Object.assign(new Error("UNSUPPORTED_OPERATION"),{status:400});
  const u=new URL(`https://api.geonames.org/${endpoint}`);
  u.searchParams.set("username",username);
  if(operation==="search"){
    if(args.q)u.searchParams.set("q",clean(args.q,200));
    if(args.country)u.searchParams.set("country",country2(args.country));
    if(args.feature_class)u.searchParams.set("featureClass",clean(args.feature_class,8));
    if(args.lang)u.searchParams.set("lang",clean(args.lang,12));
    u.searchParams.set("maxRows",String(clamp(args.limit,1,100,10)));
  }else if(operation==="nearby"){
    u.searchParams.set("lat",String(lat(required(args,"lat"))));u.searchParams.set("lng",String(lng(required(args,"lng"))));
    if(args.radius!==undefined)u.searchParams.set("radius",String(Math.max(0,Math.min(300,Number(args.radius)||0))));
    u.searchParams.set("maxRows",String(clamp(args.limit,1,100,10)));
    if(args.lang)u.searchParams.set("lang",clean(args.lang,12));
  }else if(operation==="admin"){
    u.searchParams.set("geonameId",clean(required(args,"geoname_id"),32));
  }else if(operation==="postal_search"){
    if(args.postal_code)u.searchParams.set("postalcode",clean(args.postal_code,20));
    if(args.place_name)u.searchParams.set("placename",clean(args.place_name,100));
    if(args.country)u.searchParams.set("country",country2(args.country));
    u.searchParams.set("maxRows",String(clamp(args.limit,1,100,10)));
  }else if(operation==="elevation"||operation==="timezone"){
    u.searchParams.set("lat",String(lat(required(args,"lat"))));u.searchParams.set("lng",String(lng(required(args,"lng"))));
  }else if(operation==="country_info"&&args.country){u.searchParams.set("country",country2(args.country));}
  return {data:ensureGeoNames(await requestJson(u))};
}
function accessToken(env){return clean(env?.MOBILITYDATABASE_ACCESS_TOKEN||env?.MOBILITYDATABASE_API_TOKEN,4096)}
function refreshToken(env){return clean(env?.MOBILITYDATABASE_REFRESH_TOKEN,4096)}
async function mintMobilityAccessToken(env){
  const refresh=refreshToken(env);
  if(!refresh)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503,details:{provider:"mobilitydatabase",reason:"REFRESH_TOKEN_MISSING"}});
  const body=await requestJson("https://api.mobilitydatabase.org/v1/tokens",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({refresh_token:refresh})});
  const token=clean(body?.access_token||body?.token,4096);
  if(!token)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503,details:{provider:"mobilitydatabase",reason:"TOKEN_EXCHANGE_RETURNED_NO_ACCESS_TOKEN"}});
  return token;
}
async function mobilityAuth(env){
  const refresh=refreshToken(env);
  if(refresh)return {token:await mintMobilityAccessToken(env),mode:"refresh-token"};
  const direct=accessToken(env);
  if(direct)return {token:direct,mode:"access-token"};
  throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503,details:{provider:"mobilitydatabase",reason:"TOKEN_MISSING"}});
}
function addMobilityFilters(u,args={}){
  u.searchParams.set("limit",String(clamp(args.limit,1,50,20)));
  u.searchParams.set("offset",String(clamp(args.offset,0,5000,0)));
  if(args.provider)u.searchParams.set("provider",clean(args.provider,100));
  if(args.country_code)u.searchParams.set("country_code",country2(args.country_code));
  if(args.subdivision_name)u.searchParams.set("subdivision_name",clean(args.subdivision_name,100));
  if(args.municipality)u.searchParams.set("municipality",clean(args.municipality,100));
  if(args.is_official!==undefined)u.searchParams.set("is_official",args.is_official===true?"true":"false");
}
async function mobility(operation,args={},env={}){
  const auth=await mobilityAuth(env);
  let path;
  if(operation==="metadata")path="/v1/metadata";
  else if(operation==="gtfs_search")path="/v1/gtfs_feeds";
  else if(operation==="gtfs_rt_search")path="/v1/gtfs_rt_feeds";
  else if(operation==="gtfs_feed")path=`/v1/gtfs_feeds/${encodeURIComponent(clean(required(args,"id"),128))}`;
  else if(operation==="gtfs_rt_feed")path=`/v1/gtfs_rt_feeds/${encodeURIComponent(clean(required(args,"id"),128))}`;
  else throw Object.assign(new Error("UNSUPPORTED_OPERATION"),{status:400});
  const u=new URL(`https://api.mobilitydatabase.org${path}`);
  if(operation.endsWith("_search"))addMobilityFilters(u,args);
  try{return {data:await requestJson(u,{headers:{authorization:`Bearer ${auth.token}`}}),auth_mode:auth.mode}}
  catch(e){
    if(auth.mode==="access-token"&&refreshToken(env)&&Number(e?.details?.http_status)===401){
      const fresh=await mintMobilityAccessToken(env);
      return {data:await requestJson(u,{headers:{authorization:`Bearer ${fresh}`}}),auth_mode:"refresh-token-retry"};
    }
    throw e;
  }
}
export const OPERATIONS={geonames:["search","nearby","admin","postal_search","elevation","timezone","country_info"],mobilitydatabase:["metadata","gtfs_search","gtfs_feed","gtfs_rt_search","gtfs_rt_feed"]};
export async function runAdapter(provider,operation,args,env){if(provider==="geonames")return geonames(operation,args,env);if(provider==="mobilitydatabase")return mobility(operation,args,env);throw Object.assign(new Error("UNSUPPORTED_PROVIDER"),{status:400})}
