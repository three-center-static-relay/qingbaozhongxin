import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=45000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const b of BASES){try{const {r,j}=await request(`${b}/health`);if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
async function ready(provider){const {r,j}=await request(`${base}/v1/provider/${provider}/readiness`);assert.equal(r.status,200,`${provider} readiness endpoint`);return j}
async function run(provider,operation,args){const task_id=`google-final-${provider}-${Date.now()}-${Math.random().toString(16).slice(2)}`;return request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:40,args})})}
const tests=[
  ["youtube","search",{query:"NASA",type:"video",limit:1},true],
  ["google_books","search",{query:"China",limit:1},true],
  ["google_factcheck","search",{query:"climate change",limit:1},true],
  ["google_civic","elections",{},false],
  ["google_knowledge_graph","search",{query:"Google",limit:1},false],
  ["google_crux","record",{url:"https://www.google.com/",form_factor:"PHONE"},true],
  ["google_pagespeed","analyze",{url:"https://www.google.com/",strategy:"mobile",categories:["PERFORMANCE"]},true],
  ["bigquery","query",{query:"SELECT word, word_count FROM `bigquery-public-data.samples.shakespeare` LIMIT 1",maximum_bytes_billed:10000000},false],
  ["earthengine","asset_get",{asset:"COPERNICUS/S2_SR_HARMONIZED"},false]
];
for(const [provider,operation,args,expectPass] of tests){const rd=await ready(provider);if(["youtube","google_books","google_factcheck","google_civic","google_knowledge_graph","google_crux","google_pagespeed"].includes(provider))assert.equal(rd?.configured,true,`${provider} GOOGLE_API_KEY not visible`);const {r,j}=await run(provider,operation,args);const passed=r.ok&&j?.ok===true;assert.equal(passed,expectPass,`${provider} classification changed: expected ${expectPass?"PASS":"FAIL"}, http=${r.status}, error=${j?.error||"none"}`)}
console.log(JSON.stringify({ok:true,classification:{pass:["youtube","google_books","google_factcheck","google_crux","google_pagespeed"],fail:["google_civic","google_knowledge_graph","bigquery","earthengine"]}}));
