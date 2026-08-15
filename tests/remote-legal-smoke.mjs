import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const b of BASES){try{const {r,j}=await request(`${b}/health`);if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
async function ready(provider){const {r,j}=await request(`${base}/v1/provider/${provider}/readiness`);assert.equal(r.status,200,`${provider}: readiness route`);return j}
async function run(provider,operation,args){const task_id=`smoke-${provider}-${Date.now()}-${Math.random().toString(16).slice(2)}`;return request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:70,args})})}
const p=await ready("pkulaw");assert.equal(p.configured,true,"pkulaw runtime credentials missing");let x=await run("pkulaw","page_info",{path:"https://www.pkulaw.com/"});assert.equal(x.r.ok&&x.j?.ok===true,true,`pkulaw failed http=${x.r.status} error=${x.j?.error||"none"}`);
const y=await ready("yuandian");assert.equal(y.configured,true,"yuandian runtime key missing");x=await run("yuandian","law_search",{query:"中华人民共和国民法典 第一千零四十三条",return_num:1});assert.equal(x.r.ok&&x.j?.ok===true,true,`yuandian failed http=${x.r.status} error=${x.j?.error||"none"}`);
const w=await ready("wikidata");assert.equal(w.configured,true,"wikidata readiness false");x=await run("wikidata","entity_get",{id:"Q148"});assert.equal(x.r.ok&&x.j?.ok===true,true,`wikidata entity_get failed http=${x.r.status} error=${x.j?.error||"none"}`);
console.log(JSON.stringify({ok:true,providers:["pkulaw","yuandian","wikidata"]}));
