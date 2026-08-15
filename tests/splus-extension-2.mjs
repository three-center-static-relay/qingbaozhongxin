import assert from "node:assert/strict";
import fs from "node:fs";
import {SPLUS_CATALOG} from "../src/catalog-splus.js";
import {runAdapter as run28} from "../src/adapters-extra28.js";
import {runAdapter as run29} from "../src/adapters-extra29.js";

const reg=JSON.parse(fs.readFileSync(new URL("../data-assets/splus-extension-2.json",import.meta.url),"utf8"));
assert.ok(reg.sources.length>=28);
for(const id of ["nci_gdc","gtex_v2","alphafold_db","human_protein_atlas","fama_french","ggzy","ccgp","cnipa_data","miit_operation","nea_stats","nhsa_stats"]){assert.ok(reg.sources.some(x=>x.id===id),`missing ${id}`)}
for(const p of ["splus_precision_biomed","splus_opportunity"]){assert.ok(SPLUS_CATALOG[p]);assert.equal(SPLUS_CATALOG[p].priority,"S+");assert.equal(SPLUS_CATALOG[p].arbitrary_url,false);assert.notEqual(SPLUS_CATALOG[p].adapter,"catalog-only")}

const oldFetch=globalThis.fetch,seen=[];
try{
 globalThis.fetch=async(url,init={})=>{const u=String(url);seen.push({u,init});
  if(u.includes("api.gdc.cancer.gov/projects"))return Response.json({data:{hits:[{project_id:"TCGA-LUAD"}],pagination:{total:1}}});
  if(u.includes("api.gdc.cancer.gov/cases"))return Response.json({data:{hits:[{case_id:"case1",project:{project_id:"TCGA-LUAD"}}],pagination:{total:1}}});
  if(u.includes("gtexportal.org/api/v2/reference/geneSearch"))return Response.json({data:[{geneSymbol:"TP53",gencodeId:"ENSG00000141510.18"}],paging_info:{totalNumberOfItems:1}});
  if(u.includes("gtexportal.org/api/v2/expression/geneExpression"))return Response.json({data:[{gencodeId:"ENSG00000141510.18",tissueSiteDetailId:"Lung",expression:1}],paging_info:{totalNumberOfItems:1}});
  if(u.includes("alphafold.ebi.ac.uk/api/prediction"))return Response.json([{uniprotAccession:"P04637",pdbUrl:"https://example.invalid/pdb"}]);
  if(u.includes("proteinatlas.org/ENSG00000141510.json"))return Response.json({Gene:"ENSG00000141510","Gene synonym":"TP53"});
  if(["data.ggzy.gov.cn","ccgp.gov.cn","cnipa.gov.cn","miit.gov.cn","nea.gov.cn","nhsa.gov.cn","mee.gov.cn","mot.gov.cn","moa.gov.cn","caac.gov.cn","openstd.samr.gov.cn","creditchina.gov.cn"].some(x=>u.includes(x)))return new Response("<html><script>evil()</script><body>官方 数据 商业机会 统计</body></html>",{status:200,headers:{"content-type":"text/html"}});
  return Response.json({});
 };
 const projects=await run28("splus_precision_biomed","gdc_projects",{limit:5});assert.equal(projects.items[0].project_id,"TCGA-LUAD");
 const cases=await run28("splus_precision_biomed","gdc_cases",{project_id:"TCGA-LUAD",limit:5});assert.equal(cases.items.length,1);assert.match(cases.controlled_data_note,/controlled/i);assert.match(seen.at(-1).u,/filters=/);
 const gene=await run28("splus_precision_biomed","gtex_gene_search",{gene:"TP53",limit:2});assert.equal(gene.items[0].geneSymbol,"TP53");
 const expr=await run28("splus_precision_biomed","gtex_gene_expression",{gencode_id:"ENSG00000141510.18",tissue:"Lung",limit:2});assert.equal(expr.items.length,1);
 const af=await run28("splus_precision_biomed","alphafold_prediction",{uniprot:"P04637"});assert.equal(af.items[0].uniprotAccession,"P04637");
 const hpa=await run28("splus_precision_biomed","hpa_gene",{ensembl_id:"ENSG00000141510"});assert.equal(hpa.data.Gene,"ENSG00000141510");
 const china=await run29("splus_opportunity","china_source_catalog",{});assert.ok(china.items.length>=12);
 const pg=await run29("splus_opportunity","official_page",{source:"ggzy"});assert.match(pg.text,/商业机会/);assert.equal(pg.text.includes("evil()"),false);
 await assert.rejects(()=>run29("splus_opportunity","official_page",{source:"https://evil.example"}),/INVALID_SOURCE/);
 const qs=await run29("splus_opportunity","quant_sources",{});assert.ok(qs.items.some(x=>x.id==="fama_french"));assert.ok(qs.items.some(x=>x.id==="finra_trace"));
 const bm=await run29("splus_opportunity","business_methods",{});assert.ok(bm.items.some(x=>x.id==="procurement_opportunity"));
 console.log(JSON.stringify({ok:true,suite:"splus-extension-2",sources:reg.sources.length,precision_ops:6,china_opportunity_sources:china.items.length,quant_sources:qs.items.length,business_methods:bm.items.length}));
}finally{globalThis.fetch=oldFetch}
