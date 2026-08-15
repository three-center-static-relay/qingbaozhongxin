import assert from "node:assert/strict";

const BASES=[
  "https://intelligence-worker.a15280020511.workers.dev",
  "https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"
];
const TIMEOUT_MS=20000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(t)}}
async function json(url,init={}){const r=await request(url,init);let body=null;try{body=await r.json()}catch{}return{r,body}}
async function findBase(){for(const base of BASES){try{const {r,body}=await json(`${base}/health`);if(r.status===200&&body?.ok===true&&body?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
const ready=await json(`${base}/v1/provider/tencent_location_bigdata/readiness`);
assert.equal(ready.r.status,200,"tencent_location_bigdata readiness endpoint");
assert.equal(ready.body?.configured,true,"Tencent key not visible to big-data provider");
const task=`tencent-bigdata-tools-${Date.now()}`;
const tools=await json(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:task,provider:"tencent_location_bigdata",operation:"list_tools",timeout_seconds:45,args:{}})});
assert.equal(tools.r.status,200,`Tencent big-data MCP list_tools failed: ${tools.body?.error||tools.r.status}`);
assert.equal(tools.body?.ok,true,"Tencent big-data MCP list_tools did not return ok");
const data=tools.body?.result?.data;
assert.equal(data?.available_count,9,`Expected 9 Tencent big-data tools, got ${data?.available_count}`);
const names=new Set((data?.available_tools||[]).map(x=>x?.name));
for(const name of ["getAreaIdByRegionName","getRealTimeAreaInfo","getRealTimeAreaTraffic","getAccumulatedAreaTraffic","predictRealTimeAreaPopulation","getAreaProfileinfo","getRealTimeAreaStayDuration","getVisitorStayDays","getHotVisitorDestinations"])assert.equal(names.has(name),true,`Missing Tencent big-data tool: ${name}`);
console.log(JSON.stringify({ok:true,stage:"tencent-bigdata-tools",available_count:data.available_count}));
