import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CATALOG,statusFor} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {datasetSourceStatus} from "../src/dataset-source-status.js";

const providers={datacite:["search","doi_get"],dryad:["search"],hdx:["search"],openml:["datasets_search"]};
for(const[p,ops]of Object.entries(providers)){
  assert.ok(CATALOG[p],`${p} catalog entry missing`);
  assert.equal(CATALOG[p].access,"public",`${p} must be public read`);
  assert.equal(CATALOG[p].arbitrary_url,false,`${p} must deny arbitrary URLs`);
  assert.equal(statusFor({},p)?.configured,true,`${p} must be usable without credentials`);
  assert.equal(statusFor({},p)?.live_adapter,true,`${p} must advertise a live adapter`);
  for(const op of ops)assert.ok(OPERATIONS[p]?.includes(op),`${p}.${op} must be globally routable`);
}

const oldFetch=globalThis.fetch,calls=[];
globalThis.fetch=async(url,init={})=>{
  const u=new URL(String(url));calls.push({url:u.toString(),host:u.hostname,path:u.pathname,init});
  if(u.hostname==="api.datacite.org"&&u.pathname==="/dois")return Response.json({data:[{id:"10.1234/example",type:"dois",attributes:{titles:[{title:"China data"}]}}],meta:{total:1,page:1,totalPages:1}});
  if(u.hostname==="api.datacite.org"&&u.pathname.startsWith("/dois/10.1234/example"))return Response.json({data:{id:"10.1234/example",type:"dois",attributes:{publisher:"Example"}}});
  if(u.hostname==="datadryad.org"&&u.pathname==="/api/v2/search")return Response.json({count:1,total:1,_embedded:{stash_datasets:[{identifier:"doi:10.5061/dryad.test",title:"Dryad China dataset"}]}});
  if(u.hostname==="data.humdata.org"&&u.pathname==="/api/3/action/package_search")return Response.json({success:true,result:{count:1,results:[{name:"china-population",title:"China population"}]}});
  if(u.hostname==="www.openml.org"&&u.pathname==="/api/v1/json/data/list/limit/100/status/active")return Response.json({data:{dataset:[{did:1,name:"China population benchmark"},{did:2,name:"Other benchmark"}]}});
  throw new Error(`UNEXPECTED_FETCH:${u}`);
};
try{
  let r=await runAdapter("datacite","search",{query:"China",limit:1},{});assert.equal(r.items.length,1);assert.equal(r.items[0].id,"10.1234/example");
  r=await runAdapter("datacite","doi_get",{doi:"10.1234/example"},{});assert.equal(r.item.id,"10.1234/example");
  r=await runAdapter("dryad","search",{query:"China",limit:1},{});assert.equal(r.items.length,1);
  r=await runAdapter("hdx","search",{query:"China",limit:1},{});assert.equal(r.total,1);assert.equal(r.items[0].name,"china-population");
  r=await runAdapter("openml","datasets_search",{query:"China population",limit:5},{});assert.equal(r.items.length,1);assert.equal(r.items[0].did,1);
  await assert.rejects(()=>runAdapter("datacite","doi_get",{doi:"https://evil.example/x"},{}),/INVALID_DOI/);
  await assert.rejects(()=>runAdapter("hdx","dataset_download",{url:"https://evil.example"},{}),/ADAPTER_OPERATION_NOT_APPROVED/);
}finally{globalThis.fetch=oldFetch}

for(const host of ["api.datacite.org","datadryad.org","data.humdata.org","www.openml.org"])assert.ok(calls.some(x=>x.host===host),`missing fixed-host call ${host}`);
assert.equal(calls.some(x=>x.host==="evil.example"),false);

const matrix=datasetSourceStatus({});
for(const id of ["datacite","dryad","hdx","openml"]){const x=matrix.sources.find(s=>s.id===id);assert.equal(x?.status,"LIVE",`${id} must be LIVE`);assert.equal(x?.surface,"provider",`${id} must be promoted to provider surface`);assert.equal(x?.provider,id);assert.ok(x.operations.length>0)}

const src=readFileSync(new URL("../src/adapters-extra51.js",import.meta.url),"utf8");
for(const bad of ["args.url","eval(","new Function(","child_process","subprocess","raw_dataset_mirror:true"])assert.equal(src.includes(bad),false,bad);

console.log(JSON.stringify({ok:true,suite:"public-dataset-wave2",providers:Object.keys(providers),direct_provider_live:true,fixed_hosts:true,public_zero_key:true,arbitrary_url:false}));
