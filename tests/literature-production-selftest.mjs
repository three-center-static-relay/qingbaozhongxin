import assert from "node:assert/strict";
import {runLiteratureSelftest} from "../src/literature-selftest.js";

const calls=[];
const okBase={
  async fetch(req){
    const b=await req.json();calls.push(b);
    return Response.json({ok:true,task_id:b.task_id,provider:b.provider,operation:b.operation,result_digest:"a".repeat(64),result:{items:[{id:"test"}]}});
  }
};
const r=await runLiteratureSelftest(okBase,{},{}),body=await r.json();
assert.equal(r.status,200);assert.equal(body.ok,true);assert.equal(body.business_e2e,true);assert.equal(body.selftest,"literature-production-keys");assert.equal(body.requests_expected,3);assert.equal(body.requests_completed,3);assert.equal(body.secrets_exposed,false);assert.deepEqual(calls.map(x=>x.provider),["openalex","semantic_scholar","base"]);assert.deepEqual(calls.map(x=>x.operation),["works","paper_search","search"]);for(const c of calls){assert.equal(c.args.limit,1);assert.equal(c.timeout_seconds,30);assert.equal(Object.keys(c).some(k=>/key|secret|token/i.test(k)),false)}

let n=0;
const failingBase={
  async fetch(req){
    const b=await req.json();n++;
    if(b.provider==="base")return Response.json({ok:false,error:"UPSTREAM_AUTH_FAILED"},{status:503});
    return Response.json({ok:true,result_digest:"b".repeat(64),result:{items:[{}]}});
  }
};
const rf=await runLiteratureSelftest(failingBase,{},{}),bf=await rf.json();
assert.equal(rf.status,503);assert.equal(bf.ok,false);assert.equal(n,3);assert.equal(bf.checks.find(x=>x.provider==="base")?.error,"UPSTREAM_AUTH_FAILED");
console.log(JSON.stringify({ok:true,selftest:"literature-production-selftest-contract",providers:["openalex","semantic_scholar","base"],requests:3}));
