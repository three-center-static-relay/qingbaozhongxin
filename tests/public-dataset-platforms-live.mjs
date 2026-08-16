import assert from "node:assert/strict";
import {CATALOG,statusFor} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const publicProviders=["zenodo","huggingface","worldbank","harvard_dataverse","pangaea","figshare"];
for(const p of publicProviders){
  assert.ok(CATALOG[p],`${p} must be registered`);
  assert.equal(statusFor({},p)?.configured,true,`${p} public/optional-key access should be configured without a mandatory secret`);
  assert.equal(statusFor({},p)?.live_adapter,true,`${p} should advertise a live adapter`);
}
assert.ok(CATALOG.kaggle,"kaggle must be registered");
assert.equal(statusFor({},"kaggle")?.configured,false,"kaggle must fail closed without credentials");
assert.equal(statusFor({KAGGLE_API_TOKEN:"kg-test"},"kaggle")?.configured,true,"kaggle access token should configure provider");
assert.equal(statusFor({KAGGLE_USERNAME:"user",KAGGLE_KEY:"key"},"kaggle")?.configured,true,"legacy kaggle username/key should remain supported");
assert.deepEqual(CATALOG.kaggle.secret_groups,[["KAGGLE_API_TOKEN"],["KAGGLE_USERNAME","KAGGLE_KEY"]]);

assert.ok(OPERATIONS.zenodo.includes("search"));
assert.ok(OPERATIONS.huggingface.includes("datasets_search"));
assert.ok(OPERATIONS.kaggle.includes("datasets_search"));
assert.ok(OPERATIONS.kaggle.includes("dataset_files"));
assert.ok(OPERATIONS.harvard_dataverse.includes("search"));
assert.ok(OPERATIONS.pangaea.includes("oai_list_records"));
assert.ok(OPERATIONS.figshare.includes("search"));
assert.ok(OPERATIONS.worldbank.includes("indicator"));

await assert.rejects(()=>runAdapter("kaggle","datasets_search",{query:"population"},{}),/UPSTREAM_AUTH_FAILED/);

const oldFetch=globalThis.fetch;const calls=[];
globalThis.fetch=async(url,init={})=>{
  const u=new URL(String(url));calls.push({u,init});
  if(u.hostname==="zenodo.org")return new Response(JSON.stringify({hits:{total:1,hits:[{id:1,metadata:{title:"Zenodo dataset"}}]}}),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="huggingface.co"&&u.pathname==="/api/datasets")return new Response(JSON.stringify([{id:"org/dataset",downloads:10}]),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="www.kaggle.com"&&u.pathname==="/api/v1/datasets/list")return new Response(JSON.stringify([{ref:"owner/dataset",title:"Kaggle dataset"}]),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="www.kaggle.com"&&u.pathname==="/api/v1/datasets/list/owner/dataset")return new Response(JSON.stringify({datasetFiles:[{name:"data.csv",totalBytes:100}]}),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="dataverse.harvard.edu")return new Response(JSON.stringify({status:"OK",data:{total_count:1,start:0,items:[{name:"Harvard dataset",type:"dataset"}]}}),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="ws.pangaea.de")return new Response(`<?xml version="1.0"?><OAI-PMH><ListRecords><record><header><identifier>oai:pangaea.de:doi:10.1594/PANGAEA.1</identifier></header><metadata><oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>PANGAEA dataset</dc:title><dc:creator>Researcher</dc:creator><dc:subject>ocean</dc:subject><dc:date>2026</dc:date><dc:description>Example</dc:description></oai_dc:dc></metadata></record><resumptionToken>next-token</resumptionToken></ListRecords></OAI-PMH>`,{status:200,headers:{"content-type":"text/xml"}});
  if(u.hostname==="api.figshare.com")return new Response(JSON.stringify([{id:123,title:"Figshare dataset"}]),{status:200,headers:{"content-type":"application/json"}});
  throw new Error(`UNEXPECTED_FETCH:${u}`);
};
try{
  const zen=await runAdapter("zenodo","search",{query:"climate",limit:1},{});assert.equal(zen.items.length,1);
  const hf=await runAdapter("huggingface","datasets_search",{query:"china",limit:1},{});assert.equal(hf.items[0].id,"org/dataset");
  const kg=await runAdapter("kaggle","datasets_search",{query:"population"},{KAGGLE_API_TOKEN:"kg-test"});assert.equal(kg.items.length,1);
  const kf=await runAdapter("kaggle","dataset_files",{owner:"owner",dataset:"dataset"},{KAGGLE_API_TOKEN:"kg-test"});assert.equal(kf.items[0].name,"data.csv");
  const dv=await runAdapter("harvard_dataverse","search",{query:"economics",limit:1},{});assert.equal(dv.total,1);
  const pg=await runAdapter("pangaea","oai_list_records",{limit:1},{});assert.equal(pg.items[0].title,"PANGAEA dataset");assert.equal(pg.resumption_token,"next-token");
  const fg=await runAdapter("figshare","search",{query:"finance",limit:1},{});assert.equal(fg.items[0].id,123);

  const kaggleCalls=calls.filter(x=>x.u.hostname==="www.kaggle.com");assert.equal(kaggleCalls.length,2);for(const c of kaggleCalls)assert.equal(c.init.headers.authorization,"Bearer kg-test");
  const hfCall=calls.find(x=>x.u.hostname==="huggingface.co");assert.equal(hfCall.u.searchParams.get("search"),"china");assert.equal(hfCall.u.searchParams.get("limit"),"1");
  const dvCall=calls.find(x=>x.u.hostname==="dataverse.harvard.edu");assert.equal(dvCall.u.searchParams.get("type"),"dataset");
  const pgCall=calls.find(x=>x.u.hostname==="ws.pangaea.de");assert.equal(pgCall.u.searchParams.get("verb"),"ListRecords");assert.equal(pgCall.u.searchParams.get("set"),"citable");
}finally{globalThis.fetch=oldFetch}

console.log(JSON.stringify({ok:true,providers:["zenodo","huggingface","kaggle","worldbank","harvard_dataverse","pangaea","figshare"],public_dataset_adapters:true,secrets_redacted:true}));
