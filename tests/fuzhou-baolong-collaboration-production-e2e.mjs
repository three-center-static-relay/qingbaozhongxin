import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const states=[];
for(const provider of ["tavily","exa","firecrawl"]){
  const r=await fetch(`${BASE}/v1/provider/${provider}/readiness`);const body=await r.json().catch(()=>null);
  states.push({provider,status:r.status,configured:body?.configured===true,ok:body?.ok===true,operations:body?.operations||[]});
}
const configured=states.filter(x=>x.status===200&&x.ok&&x.configured);
assert.ok(configured.length>0,`NO_CONFIGURED_NETWORK_PROVIDER:${JSON.stringify(states)}`);
console.log(JSON.stringify({ok:true,suite:"baolong-stage-probe",stage:"network_readiness",configured:configured.map(x=>x.provider),states,secrets_redacted:true}));
