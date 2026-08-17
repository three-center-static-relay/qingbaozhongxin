import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-llamaparse.js";

assert.deepEqual(OPERATIONS.llamaparse,["auth_smoke","parse_government_url","job_get"]);
const XLS="https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrgg/202606/P020260625654260432035.xls";
const JPG="https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrgg/202606/P020260625654261699958.jpg";
const originalFetch=globalThis.fetch;
try{
  const calls=[];
  globalThis.fetch=async (url,init={})=>{
    calls.push({url:String(url),init});
    const u=new URL(String(url));
    assert.equal(u.hostname,"api.cloud.llamaindex.ai");
    assert.equal(init.headers.authorization,"Bearer TEST_LLAMA_KEY");
    if(init.method==="POST")return new Response(JSON.stringify({id:"pjb-test-1",project_id:"prj-test",status:"PENDING",tier:"fast"}),{status:200,headers:{"content-type":"application/json"}});
    if(u.pathname.endsWith("/pjb-test-1"))return new Response(JSON.stringify({job:{id:"pjb-test-1",project_id:"prj-test",status:"COMPLETED",tier:"fast",usage:{credits:1}},markdown:"|宗地编号|用途|\n|---|---|\n|2026-19|住宅|",items:[{type:"table"}],metadata:{pages:1}}),{status:200,headers:{"content-type":"application/json"}});
    return new Response(JSON.stringify({items:[],total_size:0}),{status:200,headers:{"content-type":"application/json"}});
  };

  const smoke=await runAdapter("llamaparse","auth_smoke",{}, {LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(smoke.authenticated,true);
  assert.equal(smoke.parse_job_created,false);
  assert.equal(smoke.credit_consuming_parse_requested,false);
  assert.equal(new URL(calls.at(-1).url).pathname,"/api/v2/parse");
  assert.equal(new URL(calls.at(-1).url).searchParams.get("page_size"),"1");

  calls.length=0;
  const xls=await runAdapter("llamaparse","parse_government_url",{source_url:XLS,tier:"fast",max_pages:5},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(xls.government_public_source,true);
  assert.equal(xls.source_url,XLS);
  const xlsBody=JSON.parse(calls[0].init.body);
  assert.equal(xlsBody.source_url,XLS);
  assert.equal(xlsBody.tier,"fast");
  assert.equal(xlsBody.version,"latest");
  assert.equal(xlsBody.page_ranges.max_pages,5);

  calls.length=0;
  const jpg=await runAdapter("llamaparse","parse_government_url",{source_url:JPG,tier:"agentic",max_pages:1},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(jpg.tier,"agentic");
  assert.equal(JSON.parse(calls[0].init.body).source_url,JPG);

  calls.length=0;
  const result=await runAdapter("llamaparse","job_get",{job_id:"pjb-test-1"},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(result.job.status,"COMPLETED");
  assert.match(result.job.markdown,/宗地编号/);
  assert.equal(result.job.usage.credits,1);

  await assert.rejects(()=>runAdapter("llamaparse","parse_government_url",{source_url:"https://example.com/file.pdf"},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"}),/SOURCE_NOT_APPROVED_GOVERNMENT_HOST/);
  await assert.rejects(()=>runAdapter("llamaparse","auth_smoke",{},{}),/UPSTREAM_AUTH_FAILED/);
}finally{globalThis.fetch=originalFetch}

console.log(JSON.stringify({ok:true,suite:"llamaparse-v2",auth_smoke:true,fuzhou_xls_contract:true,fuzhou_jpg_contract:true,government_https_gov_cn_only:true,secret_name:"LLAMA_CLOUD_API_KEY",live_secret_tested:false}));
