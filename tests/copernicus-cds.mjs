import assert from "node:assert/strict";
import {createTestHarness} from "wrangler";
import {http,HttpResponse} from "msw";
import {setupServer} from "msw/node";

const seen={submit:null,token:null};
const network=setupServer(
  http.post("https://cds.climate.copernicus.eu/api/profiles/v1/account/verification/pat",({request})=>{seen.token=request.headers.get("PRIVATE-TOKEN");return HttpResponse.json({valid:true})}),
  http.get("https://cds.climate.copernicus.eu/api/catalogue/v1/datasets",({request})=>{const u=new URL(request.url);return HttpResponse.json({collections:[{id:"reanalysis-era5-single-levels",title:"ERA5 hourly data on single levels"}],query:u.searchParams.get("query")})}),
  http.get("https://cds.climate.copernicus.eu/api/catalogue/v1/collections/reanalysis-era5-single-levels",()=>HttpResponse.json({id:"reanalysis-era5-single-levels",title:"ERA5 hourly data on single levels"})),
  http.post("https://cds.climate.copernicus.eu/api/retrieve/v1/processes/reanalysis-era5-single-levels/execution",async({request})=>{seen.submit=await request.json();return HttpResponse.json({jobID:"11111111-1111-4111-8111-111111111111",status:"accepted",links:[{rel:"monitor",href:"https://cds.climate.copernicus.eu/api/retrieve/v1/jobs/11111111-1111-4111-8111-111111111111"}]},{status:201})}),
  http.get("https://cds.climate.copernicus.eu/api/retrieve/v1/jobs/11111111-1111-4111-8111-111111111111",()=>HttpResponse.json({jobID:"11111111-1111-4111-8111-111111111111",processID:"reanalysis-era5-single-levels",status:"successful"})),
  http.get("https://cds.climate.copernicus.eu/api/retrieve/v1/jobs/11111111-1111-4111-8111-111111111111/results",()=>HttpResponse.json({asset:{value:{href:"https://example.invalid/era5.grib","file:size":12345,type:"application/x-grib"}}}))
);
network.listen({onUnhandledRequest:"error"});
const server=createTestHarness({workers:[{configPath:"./wrangler.test.jsonc"}]});
async function post(id,operation,args={}){const r=await server.fetch("/v1/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:id,provider:"copernicus_cds",operation,args})});return{status:r.status,body:await r.json()}}
let code=0;
try{
  await server.listen();
  let r=await post("cds-auth","auth_check");assert.equal(r.status,200);assert.equal(seen.token,"test-cds-token");
  r=await post("cds-search","catalog_search",{query:"ERA5",limit:5});assert.equal(r.status,200);assert.equal(r.body?.result?.data?.collections?.[0]?.id,"reanalysis-era5-single-levels");
  r=await post("cds-dataset","dataset_get",{dataset:"reanalysis-era5-single-levels"});assert.equal(r.status,200);assert.equal(r.body?.result?.data?.id,"reanalysis-era5-single-levels");
  r=await post("cds-submit","retrieve_submit",{dataset:"reanalysis-era5-single-levels",request:{product_type:["reanalysis"],variable:["2m_temperature"],year:["2024"],month:["03"],day:["01"],time:["13:00"],data_format:"grib"}});assert.equal(r.status,200);assert.deepEqual(seen.submit?.inputs?.variable,["2m_temperature"]);
  r=await post("cds-status","job_status",{job_id:"11111111-1111-4111-8111-111111111111"});assert.equal(r.status,200);assert.equal(r.body?.result?.data?.status,"successful");
  r=await post("cds-results","job_results",{job_id:"11111111-1111-4111-8111-111111111111"});assert.equal(r.status,200);assert.equal(r.body?.result?.data?.asset?.value?.["file:size"],12345);
  r=await post("cds-bad-id","dataset_get",{dataset:"../../etc/passwd"});assert.equal(r.status,400);assert.equal(r.body?.error,"INVALID_DATASET_ID");
  console.log(JSON.stringify({ok:true,suite:"copernicus-cds",operations:6,guards:["fixed-host","token-header","safe-dataset-id","bounded-json","no-binary-proxy"]}));
}catch(e){code=1;console.error(e)}
try{await server.close()}catch{}
network.close();
process.exit(code);
