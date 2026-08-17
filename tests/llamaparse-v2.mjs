import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-llamaparse.js";

assert.deepEqual(OPERATIONS.llamaparse,["auth_smoke","budget_preview","parse_government_url","job_get"]);
const XLS="https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrgg/202606/P020260625654260432035.xls";
const JPG="https://zygh.fuzhou.gov.cn/zfxxgkzl/gkml/ywgz/tdsyqcr/tdsyqzpgcrgg/202606/P020260625654261699958.jpg";
const PDF="https://fgw.fuzhou.gov.cn/example/project-approval.pdf";
const originalFetch=globalThis.fetch;
try{
  const calls=[];
  globalThis.fetch=async (url,init={})=>{
    calls.push({url:String(url),init});
    const u=new URL(String(url));
    assert.equal(u.hostname,"api.cloud.llamaindex.ai");
    assert.equal(init.headers.authorization,"Bearer TEST_LLAMA_KEY");
    if(init.method==="POST")return new Response(JSON.stringify({id:"pjb-test-1",project_id:"prj-test",status:"PENDING",tier:JSON.parse(init.body).tier}),{status:200,headers:{"content-type":"application/json"}});
    if(u.pathname.endsWith("/pjb-test-1"))return new Response(JSON.stringify({job:{id:"pjb-test-1",project_id:"prj-test",status:"COMPLETED",tier:"fast",usage:{credits:1}},markdown:"|宗地编号|用途|\n|---|---|\n|2026-19|住宅|",items:[{type:"table"}],metadata:{pages:1}}),{status:200,headers:{"content-type":"application/json"}});
    return new Response(JSON.stringify({items:[],total_size:0}),{status:200,headers:{"content-type":"application/json"}});
  };

  const smoke=await runAdapter("llamaparse","auth_smoke",{}, {LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(smoke.authenticated,true);
  assert.equal(smoke.parse_job_created,false);
  assert.equal(smoke.credit_consuming_parse_requested,false);
  assert.equal(new URL(calls.at(-1).url).pathname,"/api/v2/parse");
  assert.equal(new URL(calls.at(-1).url).searchParams.get("page_size"),"1");

  const xlsBudget=await runAdapter("llamaparse","budget_preview",{source_url:XLS,expected_sheets:6},{});
  assert.equal(xlsBudget.tier,"fast");
  assert.equal(xlsBudget.pricing_basis,"spreadsheet-sheet-estimate");
  assert.equal(xlsBudget.estimated_credit_upper_bound,6);
  assert.equal(xlsBudget.free_plan_guard,true);

  const jpgBudget=await runAdapter("llamaparse","budget_preview",{source_url:JPG,max_pages:1},{});
  assert.equal(jpgBudget.tier,"agentic");
  assert.equal(jpgBudget.estimated_credit_upper_bound,10);

  const pdfBudget=await runAdapter("llamaparse","budget_preview",{source_url:PDF,max_pages:12},{});
  assert.equal(pdfBudget.tier,"cost_effective");
  assert.equal(pdfBudget.estimated_credit_upper_bound,36);

  const agenticPlusBudget=await runAdapter("llamaparse","budget_preview",{source_url:PDF,tier:"agentic_plus",max_pages:50},{});
  assert.equal(agenticPlusBudget.max_pages,5);
  assert.equal(agenticPlusBudget.estimated_credit_upper_bound,225);

  calls.length=0;
  const xls=await runAdapter("llamaparse","parse_government_url",{source_url:XLS,expected_sheets:5},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(xls.government_public_source,true);
  assert.equal(xls.source_url,XLS);
  assert.equal(xls.spreadsheet,true);
  assert.equal(xls.billing_unit,"sheet");
  assert.equal(xls.max_pages,null);
  assert.equal(xls.tier,"fast");
  assert.equal(xls.budget.estimated_credit_upper_bound,5);
  const xlsBody=JSON.parse(calls[0].init.body);
  assert.equal(xlsBody.source_url,XLS);
  assert.equal(xlsBody.tier,"fast");
  assert.equal(xlsBody.version,"latest");
  assert.equal(xlsBody.page_ranges,undefined);

  calls.length=0;
  const jpg=await runAdapter("llamaparse","parse_government_url",{source_url:JPG,max_pages:1},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(jpg.tier,"agentic");
  assert.equal(jpg.spreadsheet,false);
  assert.equal(jpg.billing_unit,"page");
  assert.equal(jpg.budget.estimated_credit_upper_bound,10);
  const jpgBody=JSON.parse(calls[0].init.body);
  assert.equal(jpgBody.source_url,JPG);
  assert.equal(jpgBody.page_ranges.max_pages,1);

  calls.length=0;
  const result=await runAdapter("llamaparse","job_get",{job_id:"pjb-test-1"},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"});
  assert.equal(result.job.status,"COMPLETED");
  assert.match(result.job.markdown,/宗地编号/);
  assert.equal(result.job.usage.credits,1);
  assert.equal(result.usage_is_authoritative_when_non_null,true);

  await assert.rejects(()=>runAdapter("llamaparse","parse_government_url",{source_url:"https://example.com/file.pdf"},{LLAMA_CLOUD_API_KEY:"TEST_LLAMA_KEY"}),/SOURCE_NOT_APPROVED_GOVERNMENT_HOST/);
  await assert.rejects(()=>runAdapter("llamaparse","budget_preview",{source_url:PDF,tier:"invalid"},{}),/INVALID_TIER/);
  await assert.rejects(()=>runAdapter("llamaparse","auth_smoke",{},{}),/UPSTREAM_AUTH_FAILED/);
}finally{globalThis.fetch=originalFetch}

console.log(JSON.stringify({ok:true,suite:"llamaparse-v2",auth_smoke:true,budget_preview:true,free_credit_guard:true,max_estimated_credits_per_job:250,automatic_tiers:{spreadsheet:"fast",image:"agentic",general_document:"cost_effective"},fuzhou_xls_contract:true,fuzhou_jpg_contract:true,spreadsheet_billing_unit:"sheet",government_https_gov_cn_only:true,secret_name:"LLAMA_CLOUD_API_KEY",live_secret_tested:false}));
