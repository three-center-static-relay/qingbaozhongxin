import assert from "node:assert/strict";
import {runTiandituNetworkDiagnostic,__test} from "../src/tianditu-network-diagnostic.js";

function envHarness(){const store=new Map();const stub={async fetch(req){const u=new URL(req.url);if(req.method==="POST"&&u.pathname==="/rate")return Response.json({ok:true,count:1,limit:60});const m=u.pathname.match(/^\/task\/(.+)$/);if(m&&req.method==="GET")return Response.json({ok:true,task:store.get(decodeURIComponent(m[1]))||null});if(m&&req.method==="POST"){const id=decodeURIComponent(m[1]),body=await req.json(),rec={...(store.get(id)||{}),...body,task_id:id};store.set(id,rec);return Response.json({ok:true,task:rec})}return Response.json({ok:false,error:"UNEXPECTED_GATE"},{status:404})}};return{CENTER_GATE:{idFromName:()=>"global",get:()=>stub},TIANDITU_TK:"REAL_KEY_MUST_NEVER_BE_USED",TIANDITU_API_KEY:"REAL_ALIAS_MUST_NEVER_BE_USED"}}

assert.equal(__test.ENDPOINT,"https://api.tianditu.gov.cn/v2/search");assert.match(__test.FAKE_TK,/INVALID_DIAGNOSTIC_KEY/);
const originalFetch=globalThis.fetch;
try{
  let seenUrl="";
  globalThis.fetch=async url=>{seenUrl=String(url);return new Response("<html><title>Access Denied</title>WAF blocked</html>",{status:403,headers:{"content-type":"text/html"}})};
  const wafResponse=await runTiandituNetworkDiagnostic(envHarness()),waf=await wafResponse.json();
  assert.equal(waf.classification,"WAF_OR_ACCESS_POLICY_BLOCK");assert.equal(waf.http_status,403);assert.equal(waf.network_reached,true);assert.equal(waf.http_reached,true);assert.equal(waf.real_key_used,false);assert.equal(new URL(seenUrl).searchParams.get("tk"),__test.FAKE_TK);assert.equal(seenUrl.includes("REAL_KEY_MUST_NEVER_BE_USED"),false);assert.equal(seenUrl.includes("REAL_ALIAS_MUST_NEVER_BE_USED"),false);

  globalThis.fetch=async url=>{seenUrl=String(url);return Response.json({status:{infocode:2001,cndesc:"Key或参数校验失败"},count:0},{status:200})};
  const appResponse=await runTiandituNetworkDiagnostic(envHarness()),app=await appResponse.json();
  assert.equal(app.classification,"APPLICATION_LAYER_REACHED_FAKE_KEY_REJECTED_OR_BUSINESS_ERROR");assert.equal(app.http_status,200);assert.equal(app.application_reached,true);assert.equal(app.infocode,2001);assert.equal(app.real_key_used,false);assert.equal(new URL(seenUrl).searchParams.get("tk"),__test.FAKE_TK);

  const direct=__test.classify(401,"application/json",'{"message":"invalid key"}',{message:"invalid key"});assert.equal(direct.classification,"AUTH_LAYER_REACHED");
  console.log(JSON.stringify({ok:true,suite:"tianditu-network-diagnostic",fake_key_only:true,waf_classification:true,application_layer_classification:true,real_key_never_used:true,cache_minutes:10}));
}finally{globalThis.fetch=originalFetch}
