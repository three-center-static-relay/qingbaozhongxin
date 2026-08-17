import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const r=await fetch(`${BASE}/v1/dataset-sources/status`,{headers:{accept:"application/json"}});
const b=await r.json().catch(()=>null);
assert.equal(r.status,200,`STATUS_HTTP_${r.status}:${JSON.stringify(b)}`);
assert.equal(b?.ok,true);
const by=id=>b.sources?.find(x=>x.id===id);
for(const id of ["kaggle_datasets","kaggle_notebooks"])assert.equal(by(id)?.status,"LIVE",`${id}:${JSON.stringify(by(id))}`);
console.log(JSON.stringify({ok:true,suite:"kaggle-production-connectivity",datasets:by("kaggle_datasets")?.status,notebooks:by("kaggle_notebooks")?.status,secrets_redacted:true}));
