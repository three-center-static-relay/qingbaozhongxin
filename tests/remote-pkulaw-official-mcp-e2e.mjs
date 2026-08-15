import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const DEPLOYED_COMMIT="1207b457244374d12d6d98641a387f8ba73eb4b5";
const TIMEOUT_MS=90000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
const ops=await request(`${base}/v1/provider/pkulaw/operations`);
assert.equal(ops.r.status,200,`operations status=${ops.r.status}`);
assert.ok(Array.isArray(ops.j?.operations)&&ops.j.operations.includes("mcp_tools"),`official MCP operations not deployed: ${JSON.stringify(ops.j)}`);
const rd=await request(`${base}/v1/provider/pkulaw/readiness`);
assert.equal(rd.r.status,200,`readiness status=${rd.r.status}`);
assert.equal(rd.j?.configured,true,`pkulaw readiness false: ${JSON.stringify(rd.j)}`);
const task_id=`diag-pkulaw-mcp-${Date.now()}-${crypto.randomUUID()}`;
const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"pkulaw",operation:"mcp_tools",timeout_seconds:70,args:{service:"mcp-law"}})});
assert.equal(x.r.status,200,`pkulaw.mcp_tools status=${x.r.status} error=${x.j?.error||"none"} details=${JSON.stringify(x.j?.details||null)}`);
assert.equal(x.j?.ok,true,`pkulaw.mcp_tools ok=false error=${x.j?.error||"none"} details=${JSON.stringify(x.j?.details||null)}`);
assert.equal(x.j?.result?.integration,"official-mcp-streamable-http",`wrong integration=${x.j?.result?.integration||"none"}`);
assert.equal(x.j?.result?.service,"mcp-law",`wrong service=${x.j?.result?.service||"none"}`);
assert.ok(Number(x.j?.result?.tool_count)>0,`tool_count=${x.j?.result?.tool_count}`);
assert.ok(Array.isArray(x.j?.result?.tools)&&x.j.result.tools.some(t=>t?.name),`no advertised tools returned`);
console.log(JSON.stringify({ok:true,classification:"PKULAW_OFFICIAL_MCP_E2E_PASS",deployed_commit:DEPLOYED_COMMIT,service:"mcp-law",tool_count:x.j.result.tool_count,protocol_version:x.j.result.protocol_version||null,legacy_secret_alias_used:Boolean(x.j.result.legacy_secret_alias_used),base}));
