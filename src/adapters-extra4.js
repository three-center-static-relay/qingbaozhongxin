const MAX_BYTES=1500000,TIMEOUT_MS=12000;
const text=(v,n=300)=>String(v??"").trim().slice(0,n);
const clamp=(n,a,b,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,Math.trunc(n))):d};
const required=(o,k)=>{const v=o?.[k];if(v===undefined||v===null||String(v).trim()==="")throw Object.assign(new Error(`ARG_REQUIRED:${k}`),{status:400});return v};
async function getJson(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{headers:{accept:"application/json"},signal:c.signal}),raw=await r.text();if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(new Error("UPSTREAM_RESPONSE_TOO_LARGE"),{status:502});let body;try{body=raw?JSON.parse(raw):null}catch{throw Object.assign(new Error("UPSTREAM_BAD_JSON"),{status:502})}if(!r.ok)throw Object.assign(new Error("UPSTREAM_HTTP_ERROR"),{status:502,details:{http_status:r.status,body}});return body}catch(e){if(e?.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504});throw e}finally{clearTimeout(t)}}
function coordLatLng(v){const s=text(v,48);if(!/^-?\d{1,2}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(s))throw Object.assign(new Error("INVALID_COORDINATE"),{status:400});const [lat,lng]=s.split(",").map(Number);if(lat<-90||lat>90||lng<-180||lng>180)throw Object.assign(new Error("INVALID_COORDINATE"),{status:400});return s}
function baiduKey(env){return env.BAIDU_MAP_AK||env.BAIDU_MAP_API_KEY||""}
function tencentKey(env){return env.TENCENT_LBS_API_KEY||env.TENCENT_MAP_API_KEY||""}
function ensureBaidu(body){if(Number(body?.status)!==0)throw Object.assign(new Error("UPSTREAM_BUSINESS_ERROR"),{status:502,details:{status:body?.status,message:body?.message}});return body}
function ensureTencent(body){if(Number(body?.status)!==0)throw Object.assign(new Error("UPSTREAM_BUSINESS_ERROR"),{status:502,details:{status:body?.status,message:body?.message}});return body}
export const OPERATIONS={baidu_maps:["geocode","reverse_geocode"],tencent_maps:["geocode","reverse_geocode","place_nearby"]};
export async function runAdapter(provider,operation,args,env){
  if(!OPERATIONS[provider]?.includes(operation))throw Object.assign(new Error("ADAPTER_OPERATION_NOT_APPROVED"),{status:403});
  if(provider==="baidu_maps"){
    const ak=baiduKey(env);if(!ak)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});
    if(operation==="geocode"){const u=new URL("https://api.map.baidu.com/geocoding/v3/");u.searchParams.set("address",text(required(args,"address"),128));u.searchParams.set("output","json");u.searchParams.set("ak",String(ak));if(args.city)u.searchParams.set("city",text(args.city,60));return{provider,operation,data:ensureBaidu(await getJson(u))}}
    if(operation==="reverse_geocode"){const u=new URL("https://api.map.baidu.com/reverse_geocoding/v3/");u.searchParams.set("location",coordLatLng(required(args,"location")));u.searchParams.set("output","json");u.searchParams.set("ak",String(ak));u.searchParams.set("coordtype",["wgs84ll","gcj02ll","bd09ll"].includes(args.coordtype)?args.coordtype:"bd09ll");u.searchParams.set("extensions_poi",args.extensions_poi===true?"1":"0");return{provider,operation,data:ensureBaidu(await getJson(u))}}
  }
  if(provider==="tencent_maps"){
    const key=tencentKey(env);if(!key)throw Object.assign(new Error("UPSTREAM_AUTH_FAILED"),{status:503});
    if(operation==="geocode"){const u=new URL("https://apis.map.qq.com/ws/geocoder/v1/");u.searchParams.set("address",text(required(args,"address"),200));u.searchParams.set("key",String(key));if(args.region)u.searchParams.set("region",text(args.region,60));return{provider,operation,data:ensureTencent(await getJson(u))}}
    if(operation==="reverse_geocode"){const u=new URL("https://apis.map.qq.com/ws/geocoder/v1/");u.searchParams.set("location",coordLatLng(required(args,"location")));u.searchParams.set("key",String(key));u.searchParams.set("get_poi",args.get_poi===false?"0":"1");return{provider,operation,data:ensureTencent(await getJson(u))}}
    if(operation==="place_nearby"){const center=coordLatLng(required(args,"location")),radius=clamp(args.radius,10,5000,1000),u=new URL("https://apis.map.qq.com/ws/place/v1/search");u.searchParams.set("keyword",text(required(args,"keyword"),80));u.searchParams.set("boundary",`nearby(${center},${radius})`);u.searchParams.set("page_size",String(clamp(args.limit,1,20,10)));u.searchParams.set("page_index","1");u.searchParams.set("key",String(key));return{provider,operation,data:ensureTencent(await getJson(u))}}
  }
  throw Object.assign(new Error("ADAPTER_NOT_IMPLEMENTED"),{status:501});
}
