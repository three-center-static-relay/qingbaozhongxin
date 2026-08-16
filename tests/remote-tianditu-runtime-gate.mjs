const BASES=[
  "https://intelligence-worker.a15280020511.workers.dev",
  "https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"
];
const EXPECTED=process.env.TIANDITU_DIAGNOSTIC_EXPECTED||"APPLICATION_LAYER_REACHED_FAKE_KEY_REJECTED_OR_BUSINESS_ERROR";
const PER_REQUEST_MS=10000;
const HARD_TIMEOUT_MS=20000;

const hard=setTimeout(()=>{
  console.error(JSON.stringify({ok:false,gate:"tianditu-live-runtime",classification:"GATE_HARD_TIMEOUT",expected:EXPECTED}));
  process.exit(1);
},HARD_TIMEOUT_MS);

async function probe(base){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),PER_REQUEST_MS);
  try{
    const r=await fetch(`${base}/v1/diagnostics/tianditu-network`,{headers:{accept:"application/json"},signal:c.signal});
    let body=null;try{body=await r.json()}catch{}
    return{base,http_status:r.status,body};
  }catch(error){
    return{base,http_status:null,error:String(error?.message||error),body:null};
  }finally{clearTimeout(t)}
}

const observations=await Promise.all(BASES.map(probe));
const valid=observations.find(x=>x.http_status===200&&x.body?.diagnostic==="tianditu-fake-key-network");
clearTimeout(hard);
if(!valid){
  console.error(JSON.stringify({ok:false,gate:"tianditu-live-runtime",classification:"WORKER_DIAGNOSTIC_UNREACHABLE",observations}));
  process.exit(1);
}
const j=valid.body;
const safe=j.real_key_used===false&&j.fake_key===true;
const expectedOk=EXPECTED==="ANY_DIAGNOSTIC"||j.classification===EXPECTED;
console.log(JSON.stringify({ok:safe&&expectedOk,gate:"tianditu-live-runtime",base:valid.base,http_status:valid.http_status,classification:j.classification,network_reached:j.network_reached,http_reached:j.http_reached,application_reached:j.application_reached,infocode:j.infocode??null,cndesc:j.cndesc??null,fake_key:j.fake_key,real_key_used:j.real_key_used,cached:j.cached??null,expected:EXPECTED}));
if(!safe)process.exit(1);
if(EXPECTED==="ANY_DIAGNOSTIC")process.exit(0);
if(j.classification!==EXPECTED)process.exit(1);
if(j.network_reached!==true||j.http_reached!==true||j.application_reached!==true)process.exit(1);
process.exit(0);
