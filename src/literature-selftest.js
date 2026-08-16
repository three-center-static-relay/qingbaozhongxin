const json=(x,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const specs=[
  {provider:"openalex",operation:"works",args:{query:"machine learning",limit:1}},
  {provider:"semantic_scholar",operation:"paper_search",args:{query:"machine learning",limit:1}},
  {provider:"base",operation:"search",args:{query:"machine learning",limit:1}}
];
const digestOk=v=>typeof v==="string"&&/^[0-9a-f]{64}$/i.test(v);
const safeError=b=>String(b?.error||b?.message||"").slice(0,160)||null;

export async function runLiteratureSelftest(base,env,ctx){
  const started=Date.now(),checks=[];
  for(const spec of specs){
    const taskId=`selftest-literature-${spec.provider}-${crypto.randomUUID()}`;
    const req=new Request("https://intelligence.internal/v1/run",{
      method:"POST",
      headers:{"content-type":"application/json","x-three-center-selftest":"literature"},
      body:JSON.stringify({task_id:taskId,provider:spec.provider,operation:spec.operation,timeout_seconds:30,args:spec.args})
    });
    try{
      const r=await base.fetch(req,env,ctx),body=await r.json().catch(()=>null),items=Array.isArray(body?.result?.items)?body.result.items.length:0,hasDigest=digestOk(body?.result_digest),ok=r.ok&&body?.ok===true&&items>0&&hasDigest;
      checks.push({provider:spec.provider,operation:spec.operation,ok,http_status:r.status,item_count:items,result_digest:hasDigest?body.result_digest:null,error:ok?null:safeError(body)});
    }catch(e){
      checks.push({provider:spec.provider,operation:spec.operation,ok:false,http_status:null,item_count:0,result_digest:null,error:String(e?.message||e).slice(0,160)});
    }
  }
  const ok=checks.length===specs.length&&checks.every(x=>x.ok===true);
  return json({ok,business_e2e:true,selftest:"literature-production-keys",selftest_level:"production-keyed-live-search",providers:specs.map(x=>x.provider),requests_expected:specs.length,requests_completed:checks.length,checks,secrets_exposed:false,elapsed_ms:Date.now()-started},ok?200:503);
}
