import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const run=async(provider,operation,args={})=>{
  const task_id=`prod-${provider}-${operation}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:30,args})});
  const body=await r.json().catch(()=>null);
  return {http_status:r.status,body};
};
const countRows=data=>{
  if(Array.isArray(data))return data.length;
  for(const k of ["feeds","results","items","data"])if(Array.isArray(data?.[k]))return data[k].length;
  return 0;
};

const g=await run("geonames","search",{q:"Fuzhou",country:"CN",limit:5,lang:"en"});
assert.equal(g.http_status,200,`GeoNames HTTP ${g.http_status}: ${JSON.stringify(g.body)}`);
assert.equal(g.body?.ok,true,JSON.stringify(g.body));
const geonames=g.body?.result?.data?.geonames;
assert.ok(Array.isArray(geonames)&&geonames.length>0,"GeoNames returned no Fuzhou results");
assert.ok(geonames.some(x=>String(x?.name||"").toLowerCase()==="fuzhou"),`GeoNames Fuzhou exact-name result missing: ${JSON.stringify(geonames)}`);

const mm=await run("mobilitydatabase","metadata",{});
assert.equal(mm.http_status,200,`Mobility metadata HTTP ${mm.http_status}: ${JSON.stringify(mm.body)}`);
assert.equal(mm.body?.ok,true,JSON.stringify(mm.body));
assert.ok(mm.body?.result?.data,"Mobility metadata missing");

const mg=await run("mobilitydatabase","gtfs_search",{limit:5});
assert.equal(mg.http_status,200,`Mobility GTFS HTTP ${mg.http_status}: ${JSON.stringify(mg.body)}`);
assert.equal(mg.body?.ok,true,JSON.stringify(mg.body));
assert.ok(countRows(mg.body?.result?.data)>0,`Mobility GTFS catalog returned no rows: ${JSON.stringify(mg.body?.result?.data)}`);

const mc=await run("mobilitydatabase","gtfs_search",{country_code:"CN",limit:20});
assert.equal(mc.http_status,200,`Mobility CN GTFS HTTP ${mc.http_status}: ${JSON.stringify(mc.body)}`);
assert.equal(mc.body?.ok,true,JSON.stringify(mc.body));

console.log(JSON.stringify({ok:true,suite:"geospatial-providers-production-e2e",geonames_fuzhou:true,mobility_auth:true,mobility_global_gtfs_nonempty:true,mobility_china_query_ok:true,mobility_china_sample_count:countRows(mc.body?.result?.data),secrets_redacted:true}));
