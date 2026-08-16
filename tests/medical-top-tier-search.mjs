import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

assert.ok(CATALOG.medical_top_tier_search);
assert.deepEqual(CATALOG.medical_top_tier_search.secrets,["EXA_API_KEY","TAVILY_API_KEY"]);
assert.ok(OPERATIONS.medical_top_tier_search?.includes("search"));
assert.equal(CATALOG.medical_top_tier_search.arbitrary_url,false);
assert.equal(CATALOG.medical_top_tier_search.write,false);

const realFetch=globalThis.fetch;
const calls=[];
function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})}
try{
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(String(url));
    const body=JSON.parse(init.body||"{}");
    calls.push({host:u.hostname,body});
    if(u.hostname==="api.exa.ai"){
      assert.ok(body.includeDomains.includes("aao.org"));
      assert.ok(body.includeDomains.includes("who.int"));
      assert.equal(body.contents.highlights,true);
      return response({requestId:"med-exa",results:[{title:"AAO Preferred Practice Pattern",url:"https://www.aao.org/education/preferred-practice-pattern/example",highlights:["evidence-based ophthalmology guidance"]}]});
    }
    if(u.hostname==="api.tavily.com"){
      assert.ok(body.include_domains.includes("aao.org"));
      assert.ok(body.include_domains.includes("who.int"));
      assert.equal(body.include_answer,false);
      assert.equal(body.include_raw_content,false);
      return response({request_id:"med-tv",results:[{title:"NEI Eye Disease",url:"https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases",content:"diagnosis and treatment information",score:0.9}]});
    }
    throw new Error(`unexpected host ${u.hostname}`);
  };
  const out=await runAdapter("medical_top_tier_search","search",{query:"painful red eye with corneal fluorescein staining",specialty:"ophthalmology",mode:"differential diagnosis",limit_per_engine:5},{EXA_API_KEY:"exa-key",TAVILY_API_KEY:"tv-key"});
  assert.equal(out.engines.exa,true);
  assert.equal(out.engines.tavily,true);
  assert.equal(out.items.length,2);
  assert.equal(calls.filter(x=>x.host==="api.exa.ai").length,1);
  assert.equal(calls.filter(x=>x.host==="api.tavily.com").length,1);
  assert.match(out.source_mode,/top-tier official medical/i);
  console.log(JSON.stringify({ok:true,suite:"medical-top-tier-search",direct:true,exa:true,tavily:true,official_domain_restricted:true,generated_answer:false}));
}finally{globalThis.fetch=realFetch}
