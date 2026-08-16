import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

assert.ok(CATALOG.cpic_pgx);
assert.notEqual(CATALOG.cpic_pgx.adapter,"catalog-only");
assert.equal(CATALOG.cpic_pgx.arbitrary_url,false);
assert.equal(CATALOG.cpic_pgx.write,false);
assert.deepEqual(new Set(OPERATIONS.cpic_pgx),new Set(["pairs","guidelines"]));

const oldFetch=globalThis.fetch,calls=[];
const json=body=>new Response(JSON.stringify(body),{status:200,headers:{"content-type":"application/json"}});
function requestUrl(input){if(input instanceof URL)return input;if(typeof input==="string")return new URL(input);if(input&&typeof input.url==="string")return new URL(input.url);throw new TypeError("unsupported fetch input")}
globalThis.fetch=async(input)=>{
  const u=requestUrl(input);calls.push(u);
  if(u.hostname!=="api.cpicpgx.org")return new Response(JSON.stringify({error:"unexpected host"}),{status:500});
  if(u.pathname==="/v1/pair_view")return json([{pairid:1,drugid:"PA449053",drugname:"clopidogrel",genesymbol:"CYP2C19",guidelinename:"CPIC Guideline for Clopidogrel and CYP2C19",guidelineurl:"https://www.clinpgx.org/guideline/example",cpiclevel:"A",clinpgxlevel:"1A",pgxtesting:"Testing recommended",pmids:[35034351],usedForRecommendation:"Yes",provisional:false}]);
  if(u.pathname==="/v1/guideline_summary_view")return json([{guideline_name:"CPIC Guideline for Clopidogrel and CYP2C19",guideline_url:"https://www.clinpgx.org/guideline/example",drugs:["clopidogrel"],genes:[{symbol:"CYP2C19",url:"https://www.clinpgx.org/gene/cyp2c19/"}]}]);
  return new Response(JSON.stringify({error:"unexpected path"}),{status:500});
};
try{
  const pairs=await runAdapter("cpic_pgx","pairs",{gene_symbol:"cyp2c19",drug_name:"clopidogrel",limit:5},{});assert.equal(pairs.items[0].cpiclevel,"A");assert.equal(pairs.items[0].clinpgxlevel,"1A");
  const guides=await runAdapter("cpic_pgx","guidelines",{name:"clopidogrel",limit:5},{});assert.equal(guides.items.length,1);
  const pairUrl=calls.find(u=>u.pathname==="/v1/pair_view");assert.ok(pairUrl);assert.equal(pairUrl.searchParams.get("genesymbol"),"eq.CYP2C19");assert.equal(pairUrl.searchParams.get("drugname"),"ilike.*clopidogrel*");assert.ok(pairUrl.searchParams.get("select").includes("clinpgxlevel"));
  assert.ok(calls.every(u=>u.hostname==="api.cpicpgx.org"));
  console.log(JSON.stringify({ok:true,suite:"medical-live-core-wave4",provider:"cpic_pgx",stable_views:true,postgrest_get_only:true,arbitrary_url:false,write:false}));
}finally{globalThis.fetch=oldFetch}
