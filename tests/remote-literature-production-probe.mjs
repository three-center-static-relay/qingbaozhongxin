import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000,PROBE_REV=1;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
const cases=[
  {provider:"openalex",operation:"works",args:{query:"artificial intelligence medicine",limit:2}},
  {provider:"semantic_scholar",operation:"paper_search",args:{query:"artificial intelligence medicine",limit:2}},
  {provider:"base",operation:"search",args:{query:"artificial intelligence medicine",limit:2}}
];
const results=[];
for(const c of cases){
  const rec={provider:c.provider,operation:c.operation,readiness_http:null,configured:null,operations_http:null,operation_exposed:false,run_http:null,ok:false,item_count:null,total:null,error:null,classification:null};
  try{
    const rd=await request(`${base}/v1/provider/${c.provider}/readiness`);rec.readiness_http=rd.r.status;rec.configured=rd.j?.configured===true;
    const op=await request(`${base}/v1/provider/${c.provider}/operations`);rec.operations_http=op.r.status;rec.operation_exposed=Array.isArray(op.j?.operations)&&op.j.operations.includes(c.operation);
    if(rd.r.status!==200||!rec.configured)throw new Error(`READINESS_FAILED status=${rd.r.status} configured=${rd.j?.configured}`);
    if(op.r.status!==200||!rec.operation_exposed)throw new Error(`OPERATION_NOT_EXPOSED status=${op.r.status} operations=${JSON.stringify(op.j?.operations||[])}`);
    const task_id=`diag-literature-${c.provider}-${Date.now()}-${crypto.randomUUID()}`;
    const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:c.provider,operation:c.operation,timeout_seconds:70,args:c.args})});
    rec.run_http=x.r.status;rec.ok=x.r.status===200&&x.j?.ok===true;rec.error=x.j?.error||null;rec.item_count=Array.isArray(x.j?.result?.items)?x.j.result.items.length:null;rec.total=x.j?.result?.total??x.j?.result?.meta?.count??null;
    if(!rec.ok)throw new Error(`RUN_FAILED status=${x.r.status} error=${x.j?.error||"none"} details=${JSON.stringify(x.j?.details||null)}`);
    if(!Array.isArray(x.j?.result?.items))throw new Error("NO_ITEMS_ARRAY");
    rec.classification="PRODUCTION_E2E_PASS";
  }catch(e){rec.classification="PRODUCTION_E2E_FAIL";rec.error=rec.error||String(e?.message||e)}
  results.push(rec);console.log(JSON.stringify({probe:"literature-provider",...rec}));
}
const failed=results.filter(x=>x.classification!=="PRODUCTION_E2E_PASS");
console.log(JSON.stringify({ok:failed.length===0,classification:failed.length===0?"PRODUCTION_E2E_ALL_PASS":"PRODUCTION_E2E_PARTIAL_OR_FAIL",base,probe_rev:PROBE_REV,results}));
assert.equal(failed.length,0,`Literature production E2E failures: ${failed.map(x=>`${x.provider}:${x.error}`).join(" | ")}`);
