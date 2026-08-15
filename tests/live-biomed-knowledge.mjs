import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {CATALOG,CATALOG_VERSION,statusFor} from "../src/catalog.js";

assert.equal(CATALOG_VERSION,"2026-08-15.33");
for(const p of ["pubchem","chembl","ensembl","reactome","rcsb_pdb","uniprot","splus_biomed_knowledge"]){assert.ok(CATALOG[p],`missing ${p}`);assert.equal(statusFor({},p)?.live_adapter,true,`${p} must be live`)}
assert.ok(OPERATIONS.pubchem.includes("compound_by_name"),"legacy PubChem operation lost");
assert.ok(OPERATIONS.pubchem.includes("compound_properties_cid"));
assert.ok(OPERATIONS.chembl.includes("search"),"legacy ChEMBL search operation lost");
assert.ok(OPERATIONS.chembl.includes("activities"));
assert.ok(OPERATIONS.rcsb_pdb.includes("search"),"legacy RCSB search operation lost");
assert.ok(OPERATIONS.rcsb_pdb.includes("entry"));
assert.ok(OPERATIONS.uniprot.includes("search"),"legacy UniProt search operation lost");
assert.ok(OPERATIONS.uniprot.includes("entry"));
assert.ok(OPERATIONS.ensembl.includes("lookup_id"));assert.ok(OPERATIONS.reactome.includes("participants"));

const calls=[];
globalThis.fetch=async(url,init={})=>{const u=String(url);calls.push({u,init});let body={};let contentType="application/json";
 if(u.includes("pubchem.ncbi.nlm.nih.gov"))body={PropertyTable:{Properties:[{CID:2244,MolecularFormula:"C9H8O4",InChIKey:"BSYNRYMUTXBXSQ-UHFFFAOYSA-N"}]}};
 else if(u.includes("chembl/api/data/activity"))body={activities:[{activity_id:1,molecule_chembl_id:"CHEMBL25",target_chembl_id:"CHEMBL2094115"}],page_meta:{total_count:1}};
 else if(u.includes("chembl/api/data/molecule/search"))body={molecules:[{molecule_chembl_id:"CHEMBL25"}],page_meta:{total_count:1}};
 else if(u.includes("rest.ensembl.org/lookup/id"))body={id:"ENSG00000141510",display_name:"TP53",species:"homo_sapiens"};
 else if(u.includes("rest.ensembl.org/xrefs/symbol"))body=[{id:"ENSG00000141510",type:"gene"}];
 else if(u.endsWith("/ContentService/data/database/version")){body="95";contentType="text/plain"}
 else if(u.includes("reactome.org/ContentService/data/query"))body={stId:"R-HSA-69563",displayName:"p53-Dependent G1 DNA Damage Response"};
 else if(u.includes("reactome.org/ContentService/data/event"))body=[{stId:"R-HSA-123",displayName:"TP53"}];
 else if(u.includes("data.rcsb.org/rest/v1/core/entry"))body={rcsb_id:"4HHB",struct:{title:"HEMOGLOBIN"}};
 else if(u.includes("data.rcsb.org/rest/v1/core/chemcomp"))body={chem_comp:{id:"ATP",name:"ADENOSINE-5'-TRIPHOSPHATE"}};
 else if(u.includes("rest.uniprot.org/uniprotkb/search"))body={results:[{primaryAccession:"P04637",uniProtkbId:"P53_HUMAN"}]};
 else if(u.includes("rest.uniprot.org/uniprotkb/"))body={primaryAccession:"P04637",uniProtkbId:"P53_HUMAN"};
 const raw=typeof body==="string"?body:JSON.stringify(body);return new Response(raw,{status:200,headers:{"content-type":contentType,"content-length":String(raw.length)}})};

const pc=await runAdapter("pubchem","compound_properties_cid",{cid:2244,properties:["MolecularFormula","InChIKey"]},{});assert.equal(pc.items[0].CID,2244);assert.ok(calls.at(-1).u.includes("/compound/cid/2244/property/MolecularFormula,InChIKey/JSON"));
await assert.rejects(()=>runAdapter("pubchem","compound_properties_cid",{cid:2244,properties:["evil/path"]},{}),/INVALID_PUBCHEM_PROPERTY/);
const cm=await runAdapter("chembl","activities",{molecule_chembl_id:"CHEMBL25",limit:20},{});assert.equal(cm.items.length,1);await assert.rejects(()=>runAdapter("chembl","activities",{},{}),/ARG_REQUIRED:molecule_chembl_id_or_target_chembl_id/);
const ens=await runAdapter("ensembl","lookup_id",{ensembl_id:"ENSG00000141510"},{});assert.equal(ens.data.display_name,"TP53");
await assert.rejects(()=>runAdapter("ensembl","lookup_id",{ensembl_id:"https://evil.example"},{}),/INVALID_ENSEMBL_ID/);
const rv=await runAdapter("reactome","version",{},{});assert.equal(rv.version,"95");
const rq=await runAdapter("reactome","query",{reactome_id:"R-HSA-69563"},{});assert.equal(rq.data.stId,"R-HSA-69563");
await assert.rejects(()=>runAdapter("reactome","query",{reactome_id:"../../evil"},{}),/INVALID_REACTOME_ID/);
const pdb=await runAdapter("rcsb_pdb","entry",{pdb_id:"4HHB"},{});assert.equal(pdb.data.rcsb_id,"4HHB");const lig=await runAdapter("rcsb_pdb","chem_comp",{comp_id:"ATP"},{});assert.equal(lig.data.chem_comp.id,"ATP");
const uni=await runAdapter("uniprot","gene_search",{gene:"TP53",organism_id:"9606",reviewed:true,limit:10},{});assert.equal(uni.items[0].primaryAccession,"P04637");assert.ok(calls.at(-1).u.includes("gene_exact%3ATP53"));
await assert.rejects(()=>runAdapter("uniprot","gene_search",{gene:"TP53) OR (*)"},{}),/INVALID_GENE/);
const umbrella=await runAdapter("splus_biomed_knowledge","catalog",{},{});assert.equal(umbrella.items.length,6);
console.log(JSON.stringify({ok:true,suite:"live-biomed-knowledge",providers:7,deep_sources:6,legacy_ops_preserved:true,structured_queries_only:true}));
