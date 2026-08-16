import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const live=["ncbi_clinvar","orphadata_api","nci_evs","civic_precision_oncology","open_targets"];
for(const p of live){assert.ok(CATALOG[p],`missing ${p}`);assert.notEqual(CATALOG[p].adapter,"catalog-only",`${p} must be live`);assert.ok(OPERATIONS[p]?.length,`${p} must expose operations`);assert.equal(CATALOG[p].arbitrary_url,false);assert.equal(CATALOG[p].write,false)}
assert.ok(OPERATIONS.ncbi_clinvar.includes("search"));
assert.ok(OPERATIONS.orphadata_api.includes("by_gene_symbol"));
assert.ok(OPERATIONS.nci_evs.includes("search"));
assert.ok(OPERATIONS.civic_precision_oncology.includes("assertions"));
assert.ok(OPERATIONS.open_targets.includes("search"));

const oldFetch=globalThis.fetch,calls=[];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
function requestUrl(input){if(input instanceof URL)return input;if(typeof input==="string")return new URL(input);if(input&&typeof input.url==="string")return new URL(input.url);throw new TypeError("unsupported fetch input")}
globalThis.fetch=async(input,init={})=>{
  const u=requestUrl(input),method=init.method||"GET",body=typeof init.body==="string"?JSON.parse(init.body):null;calls.push({url:u.href,method,body});
  if(u.hostname==="eutils.ncbi.nlm.nih.gov"&&u.pathname.endsWith("/esearch.fcgi"))return json({esearchresult:{count:"1",idlist:["12345"]}});
  if(u.hostname==="eutils.ncbi.nlm.nih.gov"&&u.pathname.endsWith("/esummary.fcgi"))return json({result:{uids:["12345"],"12345":{uid:"12345",title:"NM_000546.6(TP53):c.215C>G (p.Pro72Arg)",clinical_significance:{description:"Pathogenic"}}}});
  if(u.hostname==="api.orphadata.com"&&u.pathname.includes("/genes/symbols/TP53"))return json({data:[{ORPHAcode:2138,Gene:{Symbol:"TP53"}}]});
  if(u.hostname==="api.orphadata.com"&&u.pathname.includes("/orphacodes/2138"))return json({ORPHAcode:2138,Name:"Li-Fraumeni syndrome"});
  if(u.hostname==="api-evsrest.nci.nih.gov"&&u.pathname==="/api/v1/concept/search")return json({total:1,concepts:[{code:"C4872",name:"Breast Carcinoma",terminology:"ncit",definitions:[{definition:"A malignant breast neoplasm."}]}]});
  if(u.hostname==="civicdb.org"&&u.pathname==="/api/graphql"){
    if(body?.query?.includes("MedicalAssertions"))return json({data:{assertions:{totalCount:1,nodes:[{id:1,name:"ERBB2 amplification predicts trastuzumab response",summary:"Example",assertionType:"PREDICTIVE",significance:"SENSITIVITYRESPONSE",status:"ACCEPTED",disease:{name:"Breast Cancer"},molecularProfile:{name:"ERBB2 Amplification"},therapies:[{name:"Trastuzumab"}]}]}}});
    if(body?.query?.includes("MedicalAssertion"))return json({data:{assertion:{id:1,name:"Assertion",summary:"Example",status:"ACCEPTED",disease:{name:"Breast Cancer"},molecularProfile:{name:"ERBB2 Amplification"},therapies:[{name:"Trastuzumab"}]}}});
  }
  if(u.hostname==="api.platform.opentargets.org"&&u.pathname==="/api/v4/graphql")return json({data:{search:{hits:[{id:"EFO_0000305",entity:"disease",object:{id:"EFO_0000305",name:"breast carcinoma",description:"malignant breast neoplasm"}}]}}});
  return json({error:"unexpected mock url",url:u.href},500);
};

try{
  const cv=await runAdapter("ncbi_clinvar","search",{query:"TP53[gene]",limit:5},{NCBI_API_KEY:"optional"});assert.equal(cv.items[0].uid,"12345");
  const orpha=await runAdapter("orphadata_api","by_gene_symbol",{gene_symbol:"tp53"},{});assert.equal(orpha.gene_symbol,"TP53");
  const evs=await runAdapter("nci_evs","search",{query:"breast carcinoma",limit:5},{});assert.equal(evs.terminology,"ncit");
  const civic=await runAdapter("civic_precision_oncology","assertions",{disease:"breast cancer",limit:5},{});assert.equal(civic.items.length,1);
  const ot=await runAdapter("open_targets","search",{query:"breast cancer",entities:["disease"],limit:5},{});assert.equal(ot.items[0].entity,"disease");
  assert.ok(calls.filter(x=>x.url.includes("eutils.ncbi.nlm.nih.gov")).length>=2);
  assert.ok(calls.some(x=>x.url.includes("api.orphadata.com/rd-associated-genes/genes/symbols/TP53")));
  assert.ok(calls.some(x=>x.url.includes("api-evsrest.nci.nih.gov/api/v1/concept/search")));
  assert.ok(calls.some(x=>x.method==="POST"&&x.url==="https://civicdb.org/api/graphql"));
  assert.ok(calls.some(x=>x.method==="POST"&&x.url==="https://api.platform.opentargets.org/api/v4/graphql"));
  console.log(JSON.stringify({ok:true,suite:"medical-live-core-wave2",providers:live,live_count:live.length,fixed_upstreams:true,fixed_graphql:true,arbitrary_url:false,write:false}));
}finally{globalThis.fetch=oldFetch}
