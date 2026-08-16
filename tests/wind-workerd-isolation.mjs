import assert from "node:assert/strict";
import {createTestHarness} from "wrangler";

const server=createTestHarness({workers:[{configPath:"./wrangler.wind-test.jsonc"}]});
try{
  await server.listen();
  const r=await server.fetch("https://wind.test/wind",{method:"POST"}),b=await r.json();
  assert.equal(r.status,200);assert.equal(b.ok,true);assert.equal(b.stage,"static-workerd-harness");
  console.log(JSON.stringify({ok:true,suite:"wind-workerd-isolation",static_harness:true,wind_adapter_loaded:false}));
}finally{await server.close().catch(()=>{}}
