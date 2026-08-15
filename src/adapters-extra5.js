const CONNECT_TIMEOUT_MS=8000,RPC_TIMEOUT_MS=12000,MAX_EVENT_BYTES=1500000;
const TENCENT_MCP_BASE="https://mcp.map.qq.com/sse";
const BIGDATA_TOOLS=[
  "getAreaIdByRegionName","getRealTimeAreaInfo","getRealTimeAreaTraffic",
  "getAccumulatedAreaTraffic","predictRealTimeAreaPopulation","getAreaProfileinfo",
  "getRealTimeAreaStayDuration","getVisitorStayDays","getHotVisitorDestinations"
];
const ALLOWED=new Set(BIGDATA_TOOLS);
function tencentKey(env){return env.TENCENT_LBS_API_KEY||env.TENCENT_MAP_API_KEY||""}
function fail(message,status=502,details){throw Object.assign(new Error(message),{status,details})}
async function withTimeout(promise,ms,onTimeout){let timer;try{return await Promise.race([promise,new Promise((_,rej)=>{timer=setTimeout(()=>{try{onTimeout?.()}catch{};rej(Object.assign(new Error("UPSTREAM_TIMEOUT"),{status:504}))},ms)})])}finally{clearTimeout(timer)}}
async function fetchBounded(url,init={},ms=RPC_TIMEOUT_MS){const c=new AbortController();try{return await withTimeout(fetch(url,{...init,signal:c.signal}),ms,()=>c.abort())}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}}
function parseEvent(block){let event="message",data=[];for(const line of block.split(/\r?\n/)){if(line.startsWith("event:"))event=line.slice(6).trim();else if(line.startsWith("data:"))data.push(line.slice(5).trimStart())}return{event,data:data.join("\n")}}
class SseReader{
  constructor(response,controller){this.reader=response.body?.getReader();this.decoder=new TextDecoder();this.buf="";this.controller=controller;if(!this.reader)fail("UPSTREAM_BAD_SSE")}
  extract(){let a=this.buf.indexOf("\n\n"),b=this.buf.indexOf("\r\n\r\n"),i=-1,n=0;if(a>=0&&(b<0||a<b)){i=a;n=2}else if(b>=0){i=b;n=4}if(i<0)return null;const block=this.buf.slice(0,i);this.buf=this.buf.slice(i+n);return parseEvent(block)}
  async next(ms=RPC_TIMEOUT_MS){for(;;){const ready=this.extract();if(ready)return ready;let part;try{part=await withTimeout(this.reader.read(),ms,()=>this.controller.abort())}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}if(part.done)fail("UPSTREAM_SSE_CLOSED");this.buf+=this.decoder.decode(part.value,{stream:true});if(new TextEncoder().encode(this.buf).length>MAX_EVENT_BYTES)fail("UPSTREAM_RESPONSE_TOO_LARGE")}}
  close(){try{this.controller.abort()}catch{};try{this.reader.cancel()}catch{}}
}
async function openSession(key){const u=new URL(TENCENT_MCP_BASE);u.searchParams.set("key",String(key));u.searchParams.set("format","1");const c=new AbortController();let r;try{r=await withTimeout(fetch(u,{headers:{accept:"text/event-stream"},signal:c.signal}),CONNECT_TIMEOUT_MS,()=>c.abort())}catch(e){if(e?.name==="AbortError")fail("UPSTREAM_TIMEOUT",504);throw e}if(!r.ok){c.abort();fail("UPSTREAM_HTTP_ERROR",502,{http_status:r.status})}const ct=r.headers.get("content-type")||"";if(!ct.includes("text/event-stream")){c.abort();fail("UPSTREAM_BAD_SSE",502,{content_type:ct})}const sse=new SseReader(r,c);for(let i=0;i<12;i++){const ev=await sse.next();if(ev.event!=="endpoint"||!ev.data)continue;let endpoint;try{endpoint=new URL(ev.data,u)}catch{sse.close();fail("UPSTREAM_BAD_SSE_ENDPOINT")}if(endpoint.origin!==u.origin){sse.close();fail("UPSTREAM_MCP_ENDPOINT_ORIGIN_MISMATCH",502)}return{sse,endpoint}}sse.close();fail("UPSTREAM_MCP_ENDPOINT_MISSING")}
async function postRpc(endpoint,payload){const r=await fetchBounded(endpoint,{method:"POST",headers:{"content-type":"application/json","accept":"application/json,text/event-stream"},body:JSON.stringify(payload)});if(!r.ok&&r.status!==202)fail("UPSTREAM_HTTP_ERROR",502,{http_status:r.status})}
async function waitRpc(sse,id){for(let i=0;i<64;i++){const ev=await sse.next();if(ev.event!=="message"||!ev.data)continue;let msg;try{msg=JSON.parse(ev.data)}catch{continue}if(msg?.id!==id)continue;if(msg.error)fail("UPSTREAM_MCP_ERROR",502,{code:msg.error.code,message:msg.error.message});return msg.result}fail("UPSTREAM_MCP_RESPONSE_MISSING")}
async function initialize(endpoint,sse){await postRpc(endpoint,{jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"intelligence-center",version:"2026-08-15"}}});await waitRpc(sse,1);await postRpc(endpoint,{jsonrpc:"2.0",method:"notifications/initialized",params:{}})}
async function listTools(endpoint,sse){await postRpc(endpoint,{jsonrpc:"2.0",id:2,method:"tools/list",params:{}});const out=await waitRpc(sse,2);return Array.isArray(out?.tools)?out.tools:[]}
function approvedTools(tools){return tools.filter(t=>ALLOWED.has(t?.name)).map(t=>({name:t.name,description:String(t.description||"").slice(0,1000),inputSchema:t.inputSchema||null}))}
export const OPERATIONS={tencent_location_bigdata:["list_tools",...BIGDATA_TOOLS]};
export async function runAdapter(provider,operation,args,env){
  if(provider!=="tencent_location_bigdata"||!OPERATIONS[provider]?.includes(operation))fail("ADAPTER_OPERATION_NOT_APPROVED",403);
  const key=tencentKey(env);if(!key)fail("UPSTREAM_AUTH_FAILED",503);
  const {sse,endpoint}=await openSession(key);
  try{
    await initialize(endpoint,sse);
    const tools=await listTools(endpoint,sse),approved=approvedTools(tools);
    if(operation==="list_tools")return{provider,operation,data:{available_tools:approved,available_count:approved.length,expected_count:BIGDATA_TOOLS.length}};
    const tool=tools.find(t=>t?.name===operation);if(!tool)fail("UPSTREAM_CAPABILITY_NOT_AVAILABLE",503,{operation,available_bigdata_tools:approved.map(x=>x.name)});
    await postRpc(endpoint,{jsonrpc:"2.0",id:3,method:"tools/call",params:{name:operation,arguments:args&&typeof args==="object"&&!Array.isArray(args)?args:{}}});
    const result=await waitRpc(sse,3);if(result?.isError)fail("UPSTREAM_BUSINESS_ERROR",502,{operation,content:result.content});
    return{provider,operation,data:result};
  }finally{sse.close()}
}
