import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const XLS="https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrgg/202606/P020260625654260432035.xls";
const JPG="https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrgg/202606/P020260625654261699958.jpg";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function read(url,init={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),30000);
  try{
    const r=await fetch(url,{...init,signal:c.signal});
    const raw=await r.text();
    let body;try{body=raw?JSON.parse(raw):null}catch{throw new Error(`BAD_JSON:${r.status}:${raw.slice(0,200)}`)}
    if(!r.ok)throw new Error(`HTTP_${r.status}:${JSON.stringify(body).slice(0,700)}`);
    return body;
  }finally{clearTimeout(t)}
}
async function run(operation,args={}){
  const body=await read(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:`llama-live-${operation}-${randomUUID()}`,provider:"llamaparse",operation,args})});
  assert.equal(body.ok,true);
  assert.equal(body.provider,"llamaparse");
  assert.equal(body.operation,operation);
  return body.result;
}
async function waitJob(id,maxPolls=30){
  for(let i=0;i<maxPolls;i++){
    const out=await run("job_get",{job_id:id});
    const status=String(out?.job?.status||"").toUpperCase();
    if(status==="COMPLETED")return out.job;
    if(["FAILED","CANCELLED"].includes(status))throw new Error(`LLAMAPARSE_JOB_${status}:${JSON.stringify(out).slice(0,1000)}`);
    await sleep(2000);
  }
  throw new Error(`LLAMAPARSE_JOB_TIMEOUT:${id}`);
}

const health=await read(`${BASE}/health`);
assert.equal(health.ok,true);
assert.equal(health.service,"intelligence-worker");

const ready=await read(`${BASE}/v1/provider/llamaparse/readiness`);
assert.equal(ready.ok,true);
assert.equal(ready.provider,"llamaparse");
assert.equal(ready.configured,true);
assert.ok(ready.operations.includes("auth_smoke"));
assert.ok(ready.operations.includes("parse_government_url"));
assert.ok(ready.operations.includes("job_get"));

const auth=await run("auth_smoke",{});
assert.equal(auth.authenticated,true);
assert.equal(auth.parse_job_created,false);
assert.equal(auth.credit_consuming_parse_requested,false);

const xlsBudget=await run("budget_preview",{source_url:XLS,tier:"fast",expected_sheets:8});
assert.equal(xlsBudget.document_extension,"xls");
assert.equal(xlsBudget.pricing_basis,"spreadsheet-sheet-estimate");
assert.ok(xlsBudget.estimated_credit_upper_bound<=8);

const xlsStart=await run("parse_government_url",{source_url:XLS,tier:"fast",expected_sheets:8});
assert.equal(xlsStart.government_public_source,true);
assert.equal(xlsStart.document_extension,"xls");
assert.ok(xlsStart.job?.id);
const xls=await waitJob(xlsStart.job.id,30);
assert.equal(String(xls.status).toUpperCase(),"COMPLETED");
const xlsCredits=Number(xls?.usage?.credits);
assert.ok(Number.isFinite(xlsCredits)&&xlsCredits>=0,"XLS completed job must report actual credits");
assert.ok((xls.markdown&&String(xls.markdown).trim())||(xls.text&&String(xls.text).trim())||(Array.isArray(xls.items)&&xls.items.length>0),"XLS must return parsed content/items");

const jpgBudget=await run("budget_preview",{source_url:JPG,tier:"agentic",max_pages:1});
assert.equal(jpgBudget.document_extension,"jpg");
assert.equal(jpgBudget.estimated_credit_upper_bound,10);
const jpgStart=await run("parse_government_url",{source_url:JPG,tier:"agentic",max_pages:1});
assert.ok(jpgStart.job?.id);
const jpg=await waitJob(jpgStart.job.id,30);
assert.equal(String(jpg.status).toUpperCase(),"COMPLETED");
const jpgCredits=Number(jpg?.usage?.credits);
assert.ok(Number.isFinite(jpgCredits)&&jpgCredits>=0,"JPG completed job must report actual credits");
assert.ok((jpg.markdown&&String(jpg.markdown).trim())||(jpg.text&&String(jpg.text).trim())||(Array.isArray(jpg.items)&&jpg.items.length>0),"JPG must return parsed content/items");

console.log(JSON.stringify({ok:true,suite:"llamaparse-production-live-e2e",health:true,readiness:true,auth_smoke:true,real_fuzhou_xls:true,real_fuzhou_jpg:true,xls_credits:xlsCredits,jpg_credits:jpgCredits,total_observed_credits:xlsCredits+jpgCredits,secret_value_exposed:false}));
