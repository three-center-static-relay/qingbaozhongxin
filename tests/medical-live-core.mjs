import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const live=["who_icd11","umls_uts","medlineplus_connect","openfda_drug_label","rxclass","pubtator3","monarch_api","ebi_ols"];
for(const p of live){assert.ok(CATALOG[p],`missing ${p}`);assert.notEqual(CATALOG[p].adapter,"catalog-only",`${p} must be live`);assert.ok(OPERATIONS[p]?.length,`${p} must expose operations`);assert.equal(CATALOG[p].arbitrary_url,false);assert.equal(CATALOG[p].write,false)}
assert.equal(CATALOG.openfda_drug_label.access,"optional-key");
assert.ok(OPERATIONS.who_icd11.includes("search"));
assert.ok(OPERATIONS.umls_uts.includes("search"));
assert.ok(OPERATIONS.medlineplus_connect.includes("lookup"));
assert.ok(OPERATIONS.rxclass.includes("classes_by_drug"));
assert.ok(OPERATIONS.pubtator3.includes("entity_autocomplete"));
assert.ok(OPERATIONS.monarch_api.includes("case_phenotype"));

const oldFetch=globalThis.fetch;
const calls=[];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
globalThis.fetch=async(input,init={})=>{
  const u=new URL(typeof input==="string"?input:input.url);calls.push({url:u.href,method:init.method||"GET",headers:init.headers||{}});
  if(u.hostname==="icdaccessmanagement.who.int")return json({access_token:"who-token",expires_in:3600});
  if(u.hostname==="id.who.int")return json({destinationEntities:[{id:"http://id.who.int/icd/entity/1",title:"Test disease",theCode:"1A00"}]});
  if(u.hostname==="uts-ws.nlm.nih.gov"&&u.pathname.includes("/search/current"))return json({result:{results:[{ui:"C0000001",name:"Test concept",rootSource:"MTH"}]}});
  if(u.hostname==="uts-ws.nlm.nih.gov"&&u.pathname.includes("/definitions"))return json({result:[{rootSource:"NCI",value:"Test definition"}]});
  if(u.hostname==="connect.medlineplus.gov")return json({feed:{entry:[{title:{_value:"Test topic"},link:[{href:"https://medlineplus.gov/test.html"}],summary:{_value:"Test summary"},author:{name:{_value:"NLM"}}}]}});
  if(u.hostname==="api.fda.gov")return json({results:[{id:"spl1",effective_time:"20260101",openfda:{generic_name:["metformin"],brand_name:["Example"],rxcui:["6809"]},indications_and_usage:["Example indication"],contraindications:["Example contraindication"],drug_interactions:["Example interaction"]}]});
  if(u.hostname==="rxnav.nlm.nih.gov"&&u.pathname.includes("byDrugName"))return json({rxclassDrugInfoList:{rxclassDrugInfo:[{minConcept:{rxcui:"6809",name:"metformin"},rxclassMinConceptItem:{classId:"A10BA02",className:"Metformin",classType:"ATC1-4"}}]}});
  if(u.hostname==="rxnav.nlm.nih.gov"&&u.pathname.includes("classMembers"))return json({drugMemberGroup:{drugMember:[{minConcept:{rxcui:"6809",name:"metformin"}}]}});
  if(u.hostname==="www.ncbi.nlm.nih.gov"&&u.pathname.includes("/search/"))return json({results:[{pmid:"1",title:"Metformin study"}]});
  if(u.hostname==="www.ncbi.nlm.nih.gov"&&u.pathname.includes("/entity/autocomplete/"))return json([{id:"CHEMICAL:MESH:D008687",name:"Metformin"}]);
  if(u.hostname==="api-v3.monarchinitiative.org"&&u.pathname.endsWith("/search"))return json({items:[{id:"MONDO:0000001",name:"Test disease",category:"biolink:Disease"}]});
  if(u.hostname==="api-v3.monarchinitiative.org"&&u.pathname.includes("/entity/"))return json({id:"MONDO:0000001",name:"Test disease"});
  if(u.hostname==="api-v3.monarchinitiative.org"&&u.pathname.includes("case-phenotype-matrix"))return json({disease:{id:"MONDO:0000001"},phenotypes:[]});
  if(u.hostname==="www.ebi.ac.uk"&&u.pathname.includes("/ols4/api/search"))return json({response:{docs:[{iri:"http://purl.obolibrary.org/obo/HP_0001250",label:"Seizure",ontology_name:"hp"}]}});
  return json({error:"unexpected mock url",url:u.href},500);
};

try{
  const env={WHO_ICD_CLIENT_ID:"id",WHO_ICD_CLIENT_SECRET:"secret",UMLS_API_KEY:"umls"};
  const icd=await runAdapter("who_icd11","search",{query:"diabetes",limit:5},env);assert.equal(icd.items.length,1);
  const umls=await runAdapter("umls_uts","search",{query:"diabetes",limit:5},env);assert.equal(umls.items[0].ui,"C0000001");
  const medline=await runAdapter("medlineplus_connect","lookup",{code_system:"loinc",code:"718-7"},env);assert.equal(medline.matched,true);
  const fda=await runAdapter("openfda_drug_label","search",{drug:"metformin"},{});assert.equal(fda.items[0].generic_name[0],"metformin");
  const classes=await runAdapter("rxclass","classes_by_drug",{drug_name:"metformin"},{});assert.equal(classes.items.length,1);
  const pub=await runAdapter("pubtator3","entity_autocomplete",{query:"metformin",concept:"chemical"},{});assert.equal(pub.items.length,1);
  const mon=await runAdapter("monarch_api","search",{query:"Marfan syndrome"},{});assert.equal(mon.items.length,1);
  const ols=await runAdapter("ebi_ols","search",{query:"seizure",ontology:"hp"},{});assert.equal(ols.items.length,1);
  assert.ok(calls.some(x=>x.url.includes("icdaccessmanagement.who.int/connect/token")));
  assert.ok(calls.some(x=>x.url.includes("api.fda.gov/drug/label.json")));
  console.log(JSON.stringify({ok:true,suite:"medical-live-core",providers:live,live_count:live.length,mocked_upstream_contracts:true,arbitrary_url:false,write:false}));
}finally{globalThis.fetch=oldFetch}
