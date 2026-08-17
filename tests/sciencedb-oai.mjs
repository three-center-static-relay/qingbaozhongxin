import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CATALOG,statusFor} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";
import {datasetSourceStatus} from "../src/dataset-source-status.js";

assert.ok(CATALOG.sciencedb);assert.equal(CATALOG.sciencedb.access,"public");assert.equal(CATALOG.sciencedb.arbitrary_url,false);assert.equal(statusFor({},"sciencedb")?.configured,true);assert.equal(statusFor({},"sciencedb")?.live_adapter,true);
assert.deepEqual(OPERATIONS.sciencedb,["identify","list_records","get_record","list_sets"]);

const oldFetch=globalThis.fetch,calls=[];
globalThis.fetch=async(url)=>{
  const u=new URL(String(url));calls.push(u);assert.equal(u.hostname,"www.scidb.cn");assert.equal(u.pathname,"/oai");const verb=u.searchParams.get("verb");
  if(verb==="Identify")return new Response(`<?xml version="1.0"?><OAI-PMH><Identify><repositoryName>ScienceDB</repositoryName><baseURL>https://www.scidb.cn/oai</baseURL><protocolVersion>2.0</protocolVersion><adminEmail>sciencedb@cnic.cn</adminEmail><earliestDatestamp>2015-01-01</earliestDatestamp><deletedRecord>persistent</deletedRecord><granularity>YYYY-MM-DD</granularity></Identify></OAI-PMH>`,{status:200});
  if(verb==="ListRecords")return new Response(`<?xml version="1.0"?><OAI-PMH><ListRecords><record><header><identifier>oai:scidb.cn:123</identifier><datestamp>2026-08-01</datestamp><setSpec>dataset</setSpec></header><metadata><oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>中国科学数据测试</dc:title><dc:creator>Researcher</dc:creator><dc:subject>China</dc:subject><dc:description>Example metadata</dc:description><dc:publisher>ScienceDB</dc:publisher><dc:date>2026</dc:date><dc:type>Dataset</dc:type><dc:format>text/csv</dc:format><dc:identifier>10.57760/sciencedb.123</dc:identifier><dc:language>zh</dc:language><dc:rights>CC BY</dc:rights></oai_dc:dc></metadata></record><resumptionToken completeListSize="100" cursor="0">NEXT</resumptionToken></ListRecords></OAI-PMH>`,{status:200});
  if(verb==="GetRecord")return new Response(`<?xml version="1.0"?><OAI-PMH><GetRecord><record><header><identifier>${u.searchParams.get("identifier")}</identifier><datestamp>2026-08-01</datestamp></header><metadata><oai_dc:dc xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>单条数据</dc:title></oai_dc:dc></metadata></record></GetRecord></OAI-PMH>`,{status:200});
  if(verb==="ListSets")return new Response(`<?xml version="1.0"?><OAI-PMH><ListSets><set><setSpec>dataset</setSpec><setName>Datasets</setName></set><resumptionToken>SETS-NEXT</resumptionToken></ListSets></OAI-PMH>`,{status:200});
  throw new Error(`UNEXPECTED:${u}`);
};
try{
  let r=await runAdapter("sciencedb","identify",{},{});assert.equal(r.repository_name,"ScienceDB");assert.equal(r.protocol_version,"2.0");
  r=await runAdapter("sciencedb","list_records",{from:"2026-08-01",until:"2026-08-17",limit:1},{});assert.equal(r.items.length,1);assert.equal(r.items[0].title,"中国科学数据测试");assert.equal(r.resumption_token,"NEXT");assert.equal(r.complete_list_size,100);assert.equal(r.cursor,0);
  r=await runAdapter("sciencedb","list_records",{resumption_token:"NEXT",limit:1},{});const last=calls.at(-1);assert.equal(last.searchParams.get("resumptionToken"),"NEXT");assert.equal(last.searchParams.has("metadataPrefix"),false);assert.equal(last.searchParams.has("from"),false);
  r=await runAdapter("sciencedb","get_record",{identifier:"oai:scidb.cn:123"},{});assert.equal(r.item.title,"单条数据");
  r=await runAdapter("sciencedb","list_sets",{limit:10},{});assert.equal(r.items[0].set_spec,"dataset");
  await assert.rejects(()=>runAdapter("sciencedb","list_records",{from:"https://evil.example"},{}),/INVALID_FROM/);
  await assert.rejects(()=>runAdapter("sciencedb","download",{url:"https://evil.example"},{}),/ADAPTER_OPERATION_NOT_APPROVED/);
}finally{globalThis.fetch=oldFetch}
assert.equal(calls.some(x=>x.hostname==="evil.example"),false);

const matrix=datasetSourceStatus({}),source=matrix.sources.find(x=>x.id==="sciencedb_portal");assert.equal(source?.status,"LIVE");assert.equal(source?.surface,"provider");assert.equal(source?.provider,"sciencedb");assert.ok(source?.operations.includes("list_records"));

const src=readFileSync(new URL("../src/adapters-extra52.js",import.meta.url),"utf8");for(const bad of ["args.url","eval(","new Function(","child_process","subprocess","downloadFile","raw_dataset_mirror:true"])assert.equal(src.includes(bad),false,bad);
console.log(JSON.stringify({ok:true,suite:"sciencedb-oai",provider:"sciencedb",public_zero_key:true,oai_pmh:true,resumption_token:true,fixed_host:true,metadata_only:true,arbitrary_url:false}));
