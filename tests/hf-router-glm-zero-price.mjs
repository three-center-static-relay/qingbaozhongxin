import assert from "node:assert/strict";

const SOURCE="https://docs.z.ai/guides/overview/pricing";
const TARGET="GLM-4.7-Flash";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);

try{
  const response=await fetch(SOURCE,{signal:controller.signal,headers:{accept:"text/html,text/plain;q=0.9,*/*;q=0.1"}});
  const raw=await response.text();
  assert.equal(response.status,200,`Z.AI official pricing page HTTP ${response.status}`);
  const idx=raw.indexOf(TARGET);
  assert.ok(idx>=0,"Official Z.AI pricing page must contain GLM-4.7-Flash");
  const evidenceWindow=raw.slice(idx,Math.min(raw.length,idx+2500));
  assert.match(evidenceWindow,/\bFree\b/i,"Official Z.AI pricing evidence near GLM-4.7-Flash must contain Free");
  console.log(JSON.stringify({ok:true,stage:"vendor-primary-free-evidence",vendor:"Z.AI",model:"GLM-4.7-Flash",source:SOURCE,http_status:response.status,free_evidence_found:true,inference_called:false,cost_incurred:false}));
}finally{clearTimeout(timer)}
