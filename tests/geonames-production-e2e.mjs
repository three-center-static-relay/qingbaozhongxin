import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const task_id=`prod-geonames-authdiag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"geonames",operation:"search",timeout_seconds:30,args:{q:"Fuzhou",country:"CN",limit:5,lang:"en"}})});
const body=await r.json().catch(()=>null);
assert.equal(r.status,502,`Expected GeoNames business-auth failure, got HTTP ${r.status}: ${JSON.stringify(body)}`);
assert.equal(body?.error,"UPSTREAM_BUSINESS_ERROR",JSON.stringify(body));
assert.equal(Number(body?.details?.status),10,`Expected GeoNames status=10 Authorization Exception: ${JSON.stringify(body)}`);
console.log(JSON.stringify({ok:true,suite:"geonames-auth-diagnostic",diagnosis:"GEONAMES_AUTHORIZATION_EXCEPTION_10",webservice_activation_or_username_authorization_required:true,secrets_redacted:true}));
