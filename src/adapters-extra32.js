const MAX_REQUEST_BYTES=24000;
const MAX_RESPONSE_BYTES=1800000;
const INIT_TIMEOUT_MS=15000;
const CALL_TIMEOUT_MS=60000;

const SERVERS=Object.freeze({
  stock_data:"https://mcp.wind.com.cn/vserver_stock_data/mcp/",
  fund_data:"https://mcp.wind.com.cn/vserver_fund_data/mcp/",
  index_data:"https://mcp.wind.com.cn/vserver_index_data/mcp/",
  bond_data:"https://mcp.wind.com.cn/vserver_bond_data/mcp/",
  financial_docs:"https://mcp.wind.com.cn/vserver_financial_docs/mcp/",
  economic_data:"https://mcp.wind.com.cn/vserver_economic_data/mcp/",
  analytics_data:"https://mcp.wind.com.cn/vserver_analytics_data/mcp/"
});

const TOOL_SERVER=Object.freeze({
  get_stock_price_indicators:"stock_data",
  get_risk_metrics:"stock_data",
  get_stock_events:"stock_data",
  get_stock_kline:"stock_data",
  get_stock_basicinfo:"stock_data",
  get_stock_equity_holders:"stock_data",
  get_stock_fundamentals:"stock_data",
  get_stock_quote:"stock_data",
  get_stock_technicals:"stock_data",
  search_stocks:"stock_data",
  get_fund_price_indicators:"fund_data",
  get_fund_kline:"fund_data",
  get_fund_financials:"fund_data",
  get_fund_holdings:"fund_data",
  get_fund_company_info:"fund_data",
  get_fund_quote:"fund_data",
  get_fund_info:"fund_data",
  get_fund_holders:"fund_data",
  get_fund_performance:"fund_data",
  search_funds:"fund_data",
  get_index_technicals:"index_data",
  get_index_quote:"index_data",
  get_index_kline:"index_data",
  get_index_fundamentals:"index_data",
  get_index_price_indicators:"index_data",
  get_index_basicinfo:"index_data",
  get_bond_basicinfo:"bond_data",
  get_bond_issuer_info:"bond_data",
  get_bond_market_data:"bond_data",
  get_bond_financial_data:"bond_data",
  get_company_announcements:"financial_docs",
  get_financial_news:"financial_docs",
  natural_language_get_edb_data:"economic_data",
  get_financial_data:"analytics_data"
});

const LIVE_TOOLS=Object.freeze(Object.keys(TOOL_SERVER));
export const OPERATIONS={aifin_market:["list_tools",...LIVE_TOOLS]};

function err(message,status=400,details){throw Object.assign(new Error(message),{status,details})}
function text(v,n=1000){return String(v??"").trim().slice(0,n)}
function getKey(env){const k=text(env?.WIND_API_KEY,300);if(!k)err("UPSTREAM_AUTH_FAILED",503,{missing:"WIND_API_KEY"});return k}
function safeServer(v){const s=text(v,40);if(!Object.hasOwn(SERVERS,s))err("INVALID_SERVER_TYPE",400,{allowed:Object.keys(SERVERS)});return s}

function sanitize(value,depth=0){
  if(depth>8)err("ARGS_TOO_DEEP",400);
  if(value===null||typeof value==="boolean")return value;
  if(typeof value==="number"){if(!Number.isFinite(value))err("INVALID_NUMBER",400);return value}
  if(typeof value==="string")return value.slice(0,8000);
  if(Array.isArray(value)){
    if(value.length>100)err("ARGS_ARRAY_TOO_LARGE",400);
    return value.map(v=>sanitize(v,depth+1));
  }
  if(value&&typeof value==="object"){
    const entries=Object.entries(value);
    if(entries.length>100)err("ARGS_OBJECT_TOO_LARGE",400);
    const out={};
    for(const[k,v]of entries){
      if(!/^[A-Za-z0-9_\-]+$/.test(k)||["__proto__","prototype","constructor"].includes(k))err("INVALID_ARG_KEY",400,{key:text(k,80)});
      out[k]=sanitize(v,depth+1);
    }
    return out;
  }
  err("INVALID_ARG_TYPE",400);
}

async function readBounded(response){
  const declared=Number(response.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>MAX_RESPONSE_BYTES)err("UPSTREAM_RESPONSE_TOO_LARGE",502,{declared});
  const reader=response.body?.getReader?.();
  if(!reader)return"";
  const chunks=[];let total=0;
  try{
    for(;;){
      const{done,value}=await reader.read();if(done)break;if(!value)continue;
      total+=value.byteLength;
      if(total>MAX_RESPONSE_BYTES){await reader.cancel().catch(()=>{});err("UPSTREAM_RESPONSE_TOO_LARGE",502,{limit:MAX_RESPONSE_BYTES})}
      chunks.push(value);
    }
  }finally{try{reader.releaseLock()}catch{}}
  const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.byteLength}
  return new TextDecoder().decode(out);
}

function parseMcpPayload(raw){
  const trimmed=raw.trim();
  if(!trimmed)err("UPSTREAM_EMPTY_RESPONSE",502);
  if(trimmed.startsWith("{")){try{return JSON.parse(trimmed)}catch{}}
  let last="";
  for(const line of raw.split(/\r?\n/))if(line.startsWith("data: "))last=line.slice(6);
  if(!last)err("UPSTREAM_RESPONSE_FORMAT_ERROR",502,{preview:trimmed.slice(0,160)});
  try{return JSON.parse(last)}catch{err("UPSTREAM_RESPONSE_FORMAT_ERROR",502,{preview:last.slice(0,160)})}
}

function normalizeResult(result){
  if(!result||typeof result!=="object")return result;
  if(result.isError){
    const t=result.content?.[0]?.text;
    let parsed=null;try{parsed=typeof t==="string"?JSON.parse(t):null}catch{}
    err("UPSTREAM_TOOL_ERROR",502,{message:text(parsed?.error?.message||parsed?.message||t||"Wind MCP tool error",500),code:parsed?.error?.code??parsed?.code??null});
  }
  const out=structuredClone(result);
  if(Array.isArray(out.content))for(const item of out.content){
    if(item?.type!=="text"||typeof item.text!=="string")continue;
    try{
      const parsed=JSON.parse(item.text);
      item.text=JSON.stringify(replaceInvalid(parsed));
    }catch{}
  }
  return out;
}
function replaceInvalid(v){
  if(v==="INVALID")return null;
  if(Array.isArray(v))return v.map(replaceInvalid);
  if(v&&typeof v==="object"){const o={};for(const[k,x]of Object.entries(v))o[k]=replaceInvalid(x);return o}
  return v;
}

async function postMcp(endpoint,key,method,params,timeoutMs){
  const body=JSON.stringify({jsonrpc:"2.0",id:Date.now(),method,params});
  if(new TextEncoder().encode(body).byteLength>MAX_REQUEST_BYTES)err("REQUEST_TOO_LARGE",413,{limit:MAX_REQUEST_BYTES});
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const response=await fetch(endpoint,{method:"POST",signal:c.signal,headers:{Authorization:`Bearer ${key}`,Accept:"application/json, text/event-stream","Content-Type":"application/json"},body});
    const raw=await readBounded(response);
    if(!response.ok){
      const map={401:"UPSTREAM_AUTH_FAILED",403:"UPSTREAM_AUTH_FAILED",429:"UPSTREAM_RATE_LIMIT",500:"UPSTREAM_SERVER_ERROR",502:"UPSTREAM_SERVER_ERROR",503:"UPSTREAM_UNAVAILABLE",504:"UPSTREAM_TIMEOUT"};
      err(map[response.status]||"UPSTREAM_HTTP_ERROR",response.status===401||response.status===403?503:response.status===429?429:502,{http_status:response.status,message:text(raw,400)});
    }
    const payload=parseMcpPayload(raw);
    if(payload?.error)err("UPSTREAM_JSONRPC_ERROR",502,{code:payload.error.code??null,message:text(payload.error.message||JSON.stringify(payload.error),500)});
    return normalizeResult(payload?.result);
  }catch(e){if(e?.name==="AbortError")err("UPSTREAM_TIMEOUT",504);throw e}finally{clearTimeout(timer)}
}

async function initialize(endpoint,key){
  return postMcp(endpoint,key,"initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"intelligence-center-aifin",version:"1.0.0"}},INIT_TIMEOUT_MS);
}

export async function runAdapter(provider,operation,args={},env={}){
  if(provider!=="aifin_market")err("ADAPTER_PROVIDER_NOT_APPROVED",403);
  const key=getKey(env);
  if(operation==="list_tools"){
    const server=safeServer(args?.server_type);
    const endpoint=SERVERS[server];
    await initialize(endpoint,key);
    const result=await postMcp(endpoint,key,"tools/list",{},CALL_TIMEOUT_MS);
    return{provider,operation,server_type:server,source:"Wind AIFin Market",result};
  }
  const server=TOOL_SERVER[operation];
  if(!server)err("ADAPTER_OPERATION_NOT_APPROVED",403);
  const clean=sanitize(args&&typeof args==="object"&&!Array.isArray(args)?args:{});
  const endpoint=SERVERS[server];
  await initialize(endpoint,key);
  const result=await postMcp(endpoint,key,"tools/call",{name:operation,arguments:clean,_meta:{clientVersion:"2.0.1"}},CALL_TIMEOUT_MS);
  return{provider,operation,server_type:server,source:"Wind AIFin Market",result};
}
