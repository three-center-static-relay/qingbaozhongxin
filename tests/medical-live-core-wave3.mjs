import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const live=["rxnorm","dailymed","ncbi_gtr"];
for(const p of live){assert.ok(CATALOG[p],`missing ${p}`);assert.notEqual(CATALOG[p].adapter,"catalog-only",`${p} must be live`);assert.ok(OPERATIONS[p]?.length,`${p} must expose operations`);assert.equal(CATALOG[p].arbitrary_url,false);assert.equal(CATALOG[p].write,false)}
assert.ok(OPERATIONS.rxnorm.includes("drugs_by_name"));
assert.ok(OPERATIONS.rxnorm.includes("properties"));
assert.ok(OPERATIONS.dailymed.includes("search_labels"));
assert.ok(OPERATIONS.dailymed.includes("label_history"));
assert.ok(OPERATIONS.ncbi_gtr.includes("search"));

const oldFetch=globalThis.fetch,calls=[];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
function requestUrl(input){if(input instanceof URL)return input;if(typeof input==="string")return new URL(input);if(input&&typeof input.url==="string")return new URL(input.url);throw new TypeError("unsupported fetch input")}
globalThis.fetch=async(input,init={})=>{
  const u=requestUrl(input);calls.push({url:u.href,method:init.method||"GET"});
  if(u.hostname==="rxnav.nlm.nih.gov"&&u.pathname==="/REST/drugs.json")return json({drugGroup:{conceptGroup:[{tty:"SCD",conceptProperties:[{rxcui:"860975",name:"metformin hydrochloride 500 MG Oral Tablet",synonym:"metformin 500 MG Oral Tablet",tty:"SCD",language:"ENG",suppress:"N"}]}]}});
  if(u.hostname==="rxnav.nlm.nih.gov"&&u.pathname==="/REST/rxcui/860975/properties.json")return json({properties:{rxcui:"860975",name:"metformin hydrochloride 500 MG Oral Tablet",synonym:"metformin 500 MG Oral Tablet",tty:"SCD",language:"ENG",suppress:"N"}});
  if(u.hostname==="rxnav.nlm.nih.gov"&&u.pathname==="/REST/version.json")return json({version:"06-Jul-2026",apiVersion:"3.1.353"});
  if(u.hostname==="dailymed.nlm.nih.gov"&&u.pathname==="/dailymed/services/v2/drugnames.json")return json({metadata:{total_elements:"1",current_page:"1"},data:[{name_type:"G",drug_name:"METFORMIN HYDROCHLORIDE"}]});
  if(u.hostname==="dailymed.nlm.nih.gov"&&u.pathname==="/dailymed/services/v2/spls.json")return json({metadata:{total_elements:"1",current_page:"1"},data:[{setid:"11111111-2222-3333-4444-555555555555",title:"METFORMIN HYDROCHLORIDE tablet",spl_version:"10",published_date:"2026-07-01"}]});
  if(u.hostname==="dailymed.nlm.nih.gov"&&u.pathname.includes("/history.json"))return json({metadata:{total_elements:"1"},data:[{spl_version:"10",published_date:"2026-07-01"}]});
  if(u.hostname==="dailymed.nlm.nih.gov"&&u.pathname.includes("/ndcs.json"))return json({metadata:{total_elements:"1"},data:[{ndc:"00000-0000-00"}]});
  if(u.hostname==="eutils.ncbi.nlm.nih.gov"&&u.pathname.endsWith("/esearch.fcgi")&&u.searchParams.get("db")==="gtr")return json({esearchresult:{count:"1",idlist:["500001"]}});
  if(u.hostname==="eutils.ncbi.nlm.nih.gov"&&u.pathname.endsWith("/esummary.fcgi")&&u.searchParams.get("db")==="gtr")return json({result:{uids:["500001"],"500001":{uid:"500001",testname:"Hereditary cancer panel",testtype:"Clinical test",genes:["BRCA1","BRCA2"],conditions:["Hereditary breast ovarian cancer"]}}});
  return json({error:"unexpected mock url",url:u.href},500);
};

try{
  const drugs=await runAdapter("rxnorm","drugs_by_name",{name:"metformin",limit:10},{});assert.equal(drugs.items[0].rxcui,"860975");
  const props=await runAdapter("rxnorm","properties",{rxcui:"860975"},{});assert.equal(props.properties.tty,"SCD");
  const version=await runAdapter("rxnorm","version",{},{});assert.equal(version.api_version,"3.1.353");
  const names=await runAdapter("dailymed","drug_names",{drug_name:"metformin",name_type:"generic",limit:10},{});assert.equal(names.items[0].name_type,"G");
  const labels=await runAdapter("dailymed","search_labels",{drug_name:"metformin",limit:10},{});assert.equal(labels.items[0].setid,"11111111-2222-3333-4444-555555555555");
  const hist=await runAdapter("dailymed","label_history",{setid:"11111111-2222-3333-4444-555555555555"},{});assert.equal(hist.items.length,1);
  const gtr=await runAdapter("ncbi_gtr","search",{query:"BRCA1[gene]",limit:5},{NCBI_API_KEY:"optional"});assert.equal(gtr.items[0].uid,"500001");
  assert.ok(calls.some(x=>x.url.includes("rxnav.nlm.nih.gov/REST/drugs.json")));
  assert.ok(calls.some(x=>x.url.includes("dailymed.nlm.nih.gov/dailymed/services/v2/spls.json")));
  assert.ok(calls.filter(x=>x.url.includes("eutils.ncbi.nlm.nih.gov")&&x.url.includes("db=gtr")).length>=2);
  console.log(JSON.stringify({ok:true,suite:"medical-live-core-wave3",providers:live,live_count:live.length,rxnorm:true,dailymed_v2:true,gtr_eutils:true,fixed_upstreams:true,arbitrary_url:false,write:false}));
}finally{globalThis.fetch=oldFetch}
