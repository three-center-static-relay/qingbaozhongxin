import assert from "node:assert/strict";
import {__test,runAdapter} from "../src/adapters-extra12.js";

assert.equal(__test.md5Upper(""),"D41D8CD98F00B204E9800998ECF8427E");
assert.equal(__test.md5Upper("abc"),"900150983CD24FB0D6963F7D28E17F72");
assert.equal(__test.md5Upper("中文"),"A7BAC2239FCDCB3A067903D8077C4A07");

const oldFetch=globalThis.fetch,oldNow=Date.now;
try{
  const appKey="test-app-key",secretKey="test-secret-key",fixedMs=1760000000000,timespan=String(Math.floor(fixedMs/1000));
  Date.now=()=>fixedMs;
  let seen=null;
  globalThis.fetch=async(url,init={})=>{seen={url:String(url),headers:init.headers||{}};return new Response(JSON.stringify({Status:"200",Message:"查询成功",Paging:{PageSize:5,PageIndex:1,TotalRecords:1},Result:[{KeyNo:"k1",Name:"测试企业",CreditCode:"91350000TEST",Status:"存续"}],OrderNumber:"TEST-ORDER"}),{status:200,headers:{"content-type":"application/json"}})};
  const out=await runAdapter("qichacha","company_search",{query:"测试企业",pageIndex:1},{QICHACHA_APP_KEY:appKey,QICHACHA_SECRET_KEY:secretKey});
  assert.equal(out.items.length,1);assert.equal(out.items[0].Name,"测试企业");assert.equal(out.order_number,"TEST-ORDER");
  const u=new URL(seen.url);assert.equal(u.origin,"https://api.qichacha.com");assert.equal(u.pathname,"/FuzzySearch/GetList");assert.equal(u.searchParams.get("key"),appKey);assert.equal(u.searchParams.get("searchKey"),"测试企业");assert.equal(String(seen.headers.Timespan),timespan);assert.equal(String(seen.headers.Token),__test.md5Upper(appKey+timespan+secretKey));assert.equal(JSON.stringify(out).includes(secretKey),false);assert.equal(JSON.stringify(out).includes(appKey),false);
  await assert.rejects(()=>runAdapter("qichacha","company_search",{query:"测试"},{}),/UPSTREAM_AUTH_FAILED/);
  await assert.rejects(()=>runAdapter("qichacha","company_search",{query:"x".repeat(201)},{QICHACHA_APP_KEY:appKey,QICHACHA_SECRET_KEY:secretKey}),/SEARCH_KEY_TOO_LONG/);
  globalThis.fetch=async()=>new Response(JSON.stringify({Status:"101",Message:"鉴权失败"}),{status:200,headers:{"content-type":"application/json"}});
  await assert.rejects(()=>runAdapter("qichacha","company_search",{query:"测试"},{QICHACHA_APP_KEY:appKey,QICHACHA_SECRET_KEY:secretKey}),/QICHACHA_API_ERROR/);
  console.log(JSON.stringify({ok:true,suite:"qichacha-contract",md5:true,fixed_official_endpoint:true,dynamic_token:true,secrets_not_echoed:true,bounded_input:true,application_error_fail_closed:true}));
}finally{globalThis.fetch=oldFetch;Date.now=oldNow}
