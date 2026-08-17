import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {datasetSourceStatus,DATASET_SOURCE_GROUPS} from "../src/dataset-source-status.js";
import app from "../src/guard.js";

const registry=JSON.parse(readFileSync(new URL("../data-assets/dataset-radar-sources.json",import.meta.url),"utf8"));
const registryIds=registry.sources.map(x=>x.id).sort();
const grouped=Object.values(DATASET_SOURCE_GROUPS).flat();
assert.equal(grouped.length,registryIds.length,"every registry source must have exactly one status classification");
assert.equal(new Set(grouped).size,grouped.length,"classification ids must be unique");
assert.deepEqual([...grouped].sort(),registryIds,"classification set must exactly match dataset-radar registry");

const empty=datasetSourceStatus({});
assert.equal(empty.total,registryIds.length,"all registered dataset source entries must be classified");
assert.equal(Object.values(empty.counts).reduce((a,b)=>a+b,0),registryIds.length);
assert.equal(new Set(empty.sources.map(x=>x.id)).size,registryIds.length,"dataset source ids must be unique");
assert.deepEqual(Object.keys(empty.counts).sort(),["DISCOVERY","LIVE","NOT_CONNECTED","TASK_ONLY"].sort());

const by=(matrix,id)=>matrix.sources.find(x=>x.id===id);
assert.equal(by(empty,"sciencedb_portal")?.status,"DISCOVERY");
assert.equal(by(empty,"icpsr")?.status,"TASK_ONLY");
assert.equal(by(empty,"ncmiphda")?.status,"NOT_CONNECTED");
assert.equal(by(empty,"pangaea")?.status,"LIVE","public PANGAEA provider must override portal-only mode");
assert.equal(by(empty,"nasa_earthdata")?.status,"LIVE","public NASA CMR provider must remain live");
assert.equal(by(empty,"modelscope")?.status,"NOT_CONNECTED");
assert.equal(by(empty,"kaggle_datasets")?.status,"NOT_CONNECTED");

const keyed=datasetSourceStatus({KAGGLE_API_TOKEN:"__KAGGLE_SECRET__",MODELSCOPE_API_TOKEN:"__MODELSCOPE_SECRET__"});
assert.equal(by(keyed,"kaggle_datasets")?.status,"LIVE");
assert.equal(by(keyed,"kaggle_notebooks")?.status,"LIVE");
assert.equal(by(keyed,"modelscope")?.status,"LIVE");
assert.equal(JSON.stringify(keyed).includes("__KAGGLE_SECRET__"),false);
assert.equal(JSON.stringify(keyed).includes("__MODELSCOPE_SECRET__"),false);
assert.equal(keyed.secrets_redacted,true);
assert.equal(keyed.raw_dataset_mirror,false);
assert.equal(keyed.raw_notebook_copy,false);

const ctx={waitUntil(){}};
const response=await app.fetch(new Request("https://intelligence.example/v1/dataset-sources/status"),{KAGGLE_API_TOKEN:"__KAGGLE_SECRET__"},ctx);
assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);assert.equal(body.total,registryIds.length);assert.ok(body.counts.LIVE>0);assert.ok(body.counts.DISCOVERY>0);assert.ok(body.counts.TASK_ONLY>0);assert.ok(body.counts.NOT_CONNECTED>0);assert.equal(JSON.stringify(body).includes("__KAGGLE_SECRET__"),false);
const openapi=await app.fetch(new Request("https://intelligence.example/openapi.json"),{},ctx);const schema=await openapi.json();assert.ok(schema.paths?.["/v1/dataset-sources/status"]);

console.log(JSON.stringify({ok:true,suite:"dataset-source-status",total:keyed.total,counts:keyed.counts,four_class_model:true,runtime_configuration_aware:true,registry_exact_match:true,secrets_redacted:true}));
