import assert from "node:assert/strict";
const BASE="https://intelligence-worker.a15280020511.workers.dev";
const run=async(provider,operation,args={})=>{
  const task_id=`gm-e2e-${provider}-${operation}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const r=await fetch(`${BASE}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:30,args})});
  const body=await r.json().catch(()=>null);
  return {status:r.status,body};
};
const rowCount=d=>{
  if(Array.isArray(d))return d.length;
  for(const k of ["feeds","results","items","data","sources"])if(Array.isArray(d?.[k]))return d[k].length;
  if(d&&typeof d==="object")return Object.keys(d).length;
  return 0;
};

const g=await run("geonames","search",{q:"Fuzhou",country:"CN",limit:5,lang:"en"});
assert.equal(g.status,200,`GEONAMES_HTTP_${g.status}:${JSON.stringify(g.body)}`);
assert.equal(g.body?.ok,true,`GEONAMES_NOT_OK:${JSON.stringify(g.body)}`);
const geos=g.body?.result?.data?.geonames;
assert.ok(Array.isArray(geos)&&geos.length>0,`GEONAMES_EMPTY:${JSON.stringify(g.body)}`);
assert.ok(geos.some(x=>String(x?.name||"").toLowerCase()==="fuzhou"),`GEONAMES_FUZHOU_MISSING:${JSON.stringify(geos)}`);

const mm=await run("mobilitydatabase","metadata",{});
assert.equal(mm.status,200,`MOBILITY_METADATA_HTTP_${mm.status}:${JSON.stringify(mm.body)}`);
assert.equal(mm.body?.ok,true,`MOBILITY_METADATA_NOT_OK:${JSON.stringify(mm.body)}`);
assert.ok(mm.body?.result?.data&&typeof mm.body.result.data==="object",`MOBILITY_METADATA_EMPTY:${JSON.stringify(mm.body)}`);

const mg=await run("mobilitydatabase","gtfs_search",{limit:5});
assert.equal(mg.status,200,`MOBILITY_GTFS_HTTP_${mg.status}:${JSON.stringify(mg.body)}`);
assert.equal(mg.body?.ok,true,`MOBILITY_GTFS_NOT_OK:${JSON.stringify(mg.body)}`);
assert.ok(rowCount(mg.body?.result?.data)>0,`MOBILITY_GTFS_EMPTY:${JSON.stringify(mg.body)}`);

console.log(JSON.stringify({ok:true,suite:"geonames-mobility-production-e2e",geonames_fuzhou:true,mobility_metadata:true,mobility_gtfs_nonempty:true,geonames_count:geos.length,mobility_gtfs_count:rowCount(mg.body?.result?.data),secrets_redacted:true}));
