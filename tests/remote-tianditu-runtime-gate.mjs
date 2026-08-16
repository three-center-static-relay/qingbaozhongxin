import assert from "node:assert/strict";

const BASES=[
  "https://intelligence-worker.a15280020511.workers.dev",
  "https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"
];
const EXPECTED="APPLICATION_LAYER_REACHED_FAKE_KEY_REJECTED_OR_BUSINESS_ERROR";
const TIMEOUT_MS=30000;

async function probe(base){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(`${base}/v1/diagnostics/tianditu-network`,{headers:{accept:"application/json"},signal:c.signal});
    let j=null;try{j=await r.json()}catch{}
    return{base,http_status:r.status,body:j};
  }catch(error){
    return{base,http_status:null,error:String(error?.message||error),body:null};
  }finally{clearTimeout(t)}
}

const observations=[];
for(const base of BASES){
  const out=await probe(base);observations.push(out);
  const j=out.body;
  if(out.http_status===200&&j?.diagnostic==="tianditu-fake-key-network"){
    console.log(JSON.stringify({ok:j.classification===EXPECTED,gate:"tianditu-live-runtime",...j,base}));
    assert.equal(j.real_key_used,false,"diagnostic must never use the real TianDiTu key");
    assert.equal(j.fake_key,true,"diagnostic must use the fixed fake key");
    assert.equal(j.network_reached,true,`Cloudflare Worker did not reach TianDiTu network layer: ${j.classification}`);
    assert.equal(j.http_reached,true,`Cloudflare Worker did not reach TianDiTu HTTP layer: ${j.classification}`);
    assert.equal(j.application_reached,true,`Cloudflare Worker did not reach TianDiTu application layer: ${j.classification}`);
    assert.equal(j.classification,EXPECTED,`TianDiTu is not reaching normal fake-key rejection; observed ${j.classification}`);
    process.exit(0);
  }
}
throw new Error(`INTELLIGENCE_WORKER_DIAGNOSTIC_UNREACHABLE ${JSON.stringify(observations)}`);
