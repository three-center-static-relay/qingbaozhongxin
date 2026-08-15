import assert from "node:assert/strict";
import fs from "node:fs";
import {SPLUS_CATALOG} from "../src/catalog-splus.js";
import {runAdapter as run25} from "../src/adapters-extra25.js";
import {runAdapter as run26} from "../src/adapters-extra26.js";
import {runAdapter as run27} from "../src/adapters-extra27.js";

const read=n=>JSON.parse(fs.readFileSync(new URL(`../data-assets/${n}`,import.meta.url),"utf8"));
const globalReg=read("splus-institutional-registry.json"),china=read("splus-china-mainland.json"),med=read("splus-medical-models-cases.json"),decision=read("splus-decision-strategy-cases.json");
assert.ok(globalReg.sources.length>=60);
assert.ok(globalReg.sources.filter(x=>x.priority==="S+").length>=45);
assert.ok(china.sources.length>=35);
assert.ok(china.sources.filter(x=>x.priority==="S+").length>=25);
assert.ok(med.models.length>=4&&med.clinical_case_assets.length>=6);
assert.ok(decision.method_families.length>=20&&decision.case_evidence_routes.length>=15&&decision.investment_quant_routes.length>=5);
assert.match(decision.principles.excluded,/fraud/);
for(const p of ["splus_knowledge","splus_biomed","splus_macro","splus_risk","splus_china","splus_decision"]){assert.ok(SPLUS_CATALOG[p],`missing ${p}`);assert.notEqual(SPLUS_CATALOG[p].adapter,"catalog-only");assert.equal(SPLUS_CATALOG[p].arbitrary_url,false)}

const oldFetch=globalThis.fetch,seen=[];
try{
 globalThis.fetch=async(url,init={})=>{const u=String(url);seen.push({u,headers:init.headers||{}});
  if(u.includes("api.crossref.org"))return Response.json({message:{"total-results":1,items:[{DOI:"10.1/test"}]}});
  if(u.includes("api.datacite.org"))return Response.json({data:[{id:"10.2/test"}],meta:{total:1}});
  if(u.includes("europepmc"))return Response.json({hitCount:1,resultList:{result:[{id:"PMC1"}]}});
  if(u.includes("esearch.fcgi"))return Response.json({esearchresult:{idlist:["1"]}});
  if(u.includes("esummary.fcgi"))return Response.json({result:{uids:["1"]}});
  if(u.includes("ghoapi.azureedge.net"))return Response.json({value:[{IndicatorCode:"TEST"}]});
  if(u.includes("ebisearch"))return Response.json({hitCount:1,entries:[{id:"P1"}]});
  if(u.includes("api.fda.gov"))return Response.json({meta:{},results:[{safetyreportid:"1"}]});
  if(u.includes("sdmx.oecd.org"))return Response.json({data:{sets:[1]}});
  if(u.includes("ec.europa.eu/eurostat"))return Response.json({value:[1]});
  if(u.includes("services.nvd.nist.gov"))return Response.json({totalResults:1,vulnerabilities:[{cve:{id:"CVE-2025-1234"}}]});
  if(u.includes("cisagov/kev-data"))return Response.json({catalogVersion:"2026.08",count:1,vulnerabilities:[{cveID:"CVE-2025-1234",vendorProject:"Test"}]});
  if(u.includes("api.gleif.org"))return Response.json({data:[{id:"LEI"}],meta:{}});
  if(u.includes("earthquake.usgs.gov"))return Response.json({metadata:{count:1},features:[{id:"eq1"}]});
  if(u.includes("stats.gov.cn")||u.includes("mof.gov.cn")||u.includes("mofcom.gov.cn")||u.includes("csrc.gov.cn")||u.includes("sse.com.cn")||u.includes("szse.cn")||u.includes("cninfo.com.cn")||u.includes("customs.gov.cn")||u.includes("gov.cn"))return new Response("<html><script>bad()</script><body>官方统计 数据 内容</body></html>",{status:200,headers:{"content-type":"text/html"}});
  return Response.json({});
 };
 const cr=await run25("splus_knowledge","crossref_search",{query:"decision science",limit:2},{CROSSREF_MAILTO:"ops@example.com"});assert.equal(cr.items.length,1);assert.match(seen.at(-1).u,/mailto=ops%40example.com/);
 const cases=await run25("splus_knowledge","medical_case_search",{query:"myocarditis",limit:2},{});assert.equal(cases.items.length,1);assert.match(seen.at(-1).u,/case/);
 const ncbi=await run25("splus_biomed","ncbi_search",{db:"pubmed",query:"cancer",limit:1},{});assert.deepEqual(ncbi.result.idlist,["1"]);
 const models=await run25("splus_biomed","medical_models",{},{});assert.ok(models.items.some(x=>x.id==="google/medgemma-1.5-4b-it"));
 const clinical=await run25("splus_biomed","clinical_data_registry",{},{});assert.ok(clinical.items.filter(x=>x.status==="metadata-only-until-authorized").length>=2);
 await run26("splus_macro","oecd_data",{flow:"OECD.SDD.NAD,DSD_NAAG@DF_NAAG_I",key:"all",start:"2025"},{});
 await run26("splus_macro","eurostat_data",{dataset:"nama_10_gdp",filters:{geo:"DE",time:"2025"}},{});
 const nvd=await run26("splus_risk","nvd_cve",{cve_id:"CVE-2025-1234",limit:1},{NVD_API_KEY:"secret-test-key"});assert.equal(nvd.items.length,1);assert.equal(seen.at(-1).headers.apiKey,"secret-test-key");assert.equal(seen.at(-1).u.includes("secret-test-key"),false);
 const kev=await run26("splus_risk","cisa_kev",{limit:1},{});assert.equal(kev.items.length,1);
 const usgs=await run26("splus_risk","usgs_earthquake",{start:"2026-08-01",min_magnitude:5,limit:2},{});assert.equal(usgs.items.length,1);
 const chinaCatalog=await run27("splus_china","source_catalog",{},{});assert.ok(chinaCatalog.items.length>=15);
 const page=await run27("splus_china","official_page",{source:"nbs_data"},{});assert.match(page.text,/官方统计/);assert.equal(page.text.includes("bad()"),false);
 await assert.rejects(()=>run27("splus_china","official_page",{source:"pbc"},{}),/SOURCE_METADATA_ONLY/);
 await assert.rejects(()=>run27("splus_china","official_page",{source:"https:\/\/evil.example"},{}),/INVALID_SOURCE/);
 const methods=await run27("splus_decision","methods",{},{});assert.ok(methods.items.length>=20);assert.ok(methods.excluded.includes("fraud"));
 const quant=await run27("splus_decision","quant_routes",{},{});assert.ok(quant.routes.quant_validation.includes("purged-cross-validation"));
 console.log(JSON.stringify({ok:true,suite:"splus-institutional-expansion",global_sources:globalReg.sources.length,china_sources:china.sources.length,splus_providers:Object.keys(SPLUS_CATALOG).length,methods:decision.method_families.length,cases:decision.case_evidence_routes.length}));
}finally{globalThis.fetch=oldFetch}
